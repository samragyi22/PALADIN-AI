import os
import base64
import tempfile
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
import docx
import cohere
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from rank_bm25 import BM25Okapi
from app.config import settings

def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract text page-by-page from a PDF file.
    Returns a list of dicts: [{"text": str, "page": int}]
    NOTE: This only works for text-based PDFs. For scanned/image PDFs,
    use extract_text_from_pdf_with_ocr instead.
    """
    extracted_pages = []
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            cleaned_text = " ".join(text.split())
            if cleaned_text:
                extracted_pages.append({
                    "text": cleaned_text,
                    "page": page_num + 1  # 1-indexed
                })
        doc.close()
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        raise ValueError(f"Failed to parse PDF text: {str(e)}")
    return extracted_pages


def extract_text_from_pdf_with_ocr(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract text from a PDF file with OCR fallback for scanned/image-based pages.
    - Tries PyMuPDF text extraction first (fast, works for digital PDFs)
    - Falls back to local Tesseract OCR for any page that returns empty text (scanned docs)
    Returns a list of dicts: [{"text": str, "page": int}]
    """
    import pytesseract
    from PIL import Image
    import io

    extracted_pages = []
    try:
        doc = fitz.open(file_path)
        print(f"[PDF Extractor] Opening '{os.path.basename(file_path)}' — {len(doc)} page(s)")

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            cleaned_text = " ".join(text.split())

            if cleaned_text:
                print(f"[PDF Extractor] Page {page_num + 1}: text-based ({len(cleaned_text)} chars)")
                extracted_pages.append({
                    "text": cleaned_text,
                    "page": page_num + 1
                })
            else:
                # Page is image-based — use local Tesseract OCR
                print(f"[PDF Extractor] Page {page_num + 1}: image-based — running Tesseract OCR...")
                try:
                    # 2x resolution gives Tesseract enough pixels to read small text accurately
                    mat = fitz.Matrix(2.0, 2.0)
                    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB, alpha=False)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                    # Simple but effective preprocessing: grayscale + mild sharpening
                    from PIL import ImageFilter, ImageEnhance
                    img = img.convert("L")  # Grayscale
                    img = ImageEnhance.Sharpness(img).enhance(2.0)  # Sharpen text
                    img = ImageEnhance.Contrast(img).enhance(1.5)   # Boost contrast

                    # PSM 6 = assume single uniform block of text (best for dense forms)
                    ocr_text = pytesseract.image_to_string(
                        img,
                        config="--psm 6 --oem 3"
                    ).strip()

                    if ocr_text:
                        print(f"[PDF Extractor] Page {page_num + 1}: Tesseract extracted {len(ocr_text)} chars")
                        extracted_pages.append({
                            "text": ocr_text,
                            "page": page_num + 1
                        })
                    else:
                        print(f"[PDF Extractor] Page {page_num + 1}: Tesseract returned empty text")
                except Exception as ocr_err:
                    print(f"[PDF Extractor] Page {page_num + 1}: Tesseract OCR failed — {ocr_err}")

        doc.close()
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        raise ValueError(f"Failed to parse PDF text: {str(e)}")

    print(f"[PDF Extractor] Done — {len(extracted_pages)} page(s) with content extracted")
    return extracted_pages

def extract_text_from_docx(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract text from a DOCX file.
    Returns a list of dicts: [{"text": str, "page": int}]
    """
    extracted_pages = []
    try:
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text.strip())
        
        combined_text = "\n".join(full_text)
        if combined_text:
            extracted_pages.append({
                "text": combined_text,
                "page": 1
            })
    except Exception as e:
        print(f"Error extracting DOCX: {e}")
        raise ValueError(f"Failed to parse DOCX text: {str(e)}")
    return extracted_pages

def chunk_documents(extracted_pages: List[Dict[str, Any]], source_name: str) -> List[Dict[str, Any]]:
    """
    Split extracted document pages into chunks of 500 tokens or less, with 50-token overlap.
    Returns a list of chunk dicts: [{"text": str, "metadata": {"source": str, "page": int}}]
    """
    text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        model_name="gpt-4",
        chunk_size=500,
        chunk_overlap=50
    )
    
    chunks = []
    for page_data in extracted_pages:
        page_text = page_data["text"]
        page_num = page_data["page"]
        
        splits = text_splitter.split_text(page_text)
        for split in splits:
            if split.strip():
                chunks.append({
                    "text": split.strip(),
                    "metadata": {
                        "source": source_name,
                        "page": page_num
                    }
                })
    return chunks

def get_embeddings_model():
    """
    Instantiate the embeddings model based on the EMBEDDING_PROVIDER.
    """
    provider = settings.EMBEDDING_PROVIDER.lower()
    if provider == "openai":
        return OpenAIEmbeddings(
            api_key=settings.OPENAI_API_KEY,
            model="text-embedding-3-small"
        )
    elif provider == "huggingface":
        from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings
        return HuggingFaceInferenceAPIEmbeddings(
            api_key=settings.HF_API_KEY,
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    elif provider == "cohere":
        import cohere
        from langchain_core.embeddings import Embeddings
        
        class CohereSDKEmbeddings(Embeddings):
            def __init__(self, api_key: str, model: str = "embed-english-v3.0"):
                # Cohere SDK v5+ uses ClientV2 (Client was removed in v5)
                self.client = cohere.ClientV2(api_key=api_key)
                self.model = model

            def embed_documents(self, texts: List[str]) -> List[List[float]]:
                embeddings = []
                batch_size = 96
                for i in range(0, len(texts), batch_size):
                    batch = texts[i:i+batch_size]
                    response = self.client.embed(
                        texts=batch,
                        model=self.model,
                        input_type="search_document",
                        embedding_types=["float"]
                    )
                    embeddings.extend([list(map(float, emb)) for emb in response.embeddings.float_])
                return embeddings

            def embed_query(self, text: str) -> List[float]:
                response = self.client.embed(
                    texts=[text],
                    model=self.model,
                    input_type="search_query",
                    embedding_types=["float"]
                )
                return list(map(float, response.embeddings.float_[0]))
                
        return CohereSDKEmbeddings(api_key=settings.COHERE_API_KEY)
    else:
        # Defaults to Gemini
        return GoogleGenerativeAIEmbeddings(
            google_api_key=settings.GOOGLE_API_KEY,
            model="models/embedding-001"
        )

def get_vector_store():
    """
    Instantiate the Chroma vector store.
    """
    embeddings = get_embeddings_model()
    persist_dir = str(settings.chroma_dir)
    return Chroma(
        collection_name="documents_collection",
        embedding_function=embeddings,
        persist_directory=persist_dir
    )

def add_documents_to_store(chunks: List[Dict[str, Any]]):
    """
    Add list of chunks to ChromaDB.
    chunks: [{"text": str, "metadata": {"source": str, "page": int}}]
    """
    if not chunks:
        return
    store = get_vector_store()
    texts = [chunk["text"] for chunk in chunks]
    metadatas = [chunk["metadata"] for chunk in chunks]
    store.add_texts(texts=texts, metadatas=metadatas)

def similarity_search_in_store(query: str, k: int = 10, active_files: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Perform vector similarity search in ChromaDB.
    """
    try:
        store = get_vector_store()
        results = store.similarity_search(query, k=k)
        
        formatted = []
        for doc in results:
            formatted.append({
                "text": doc.page_content,
                "metadata": doc.metadata,
                "score": 1.0
            })
        if active_files:
            formatted = [f for f in formatted if f["metadata"].get("source") in active_files]
        return formatted
    except Exception as e:
        print(f"Vector search failed/empty database: {e}")
        return []

def bm25_search_in_store(query: str, k: int = 10, active_files: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Perform BM25 keyword search across all indexed documents.
    """
    try:
        store = get_vector_store()
        collection = store._collection
        all_docs = collection.get()
        
        documents = all_docs.get("documents", [])
        metadatas = all_docs.get("metadatas", [])
        
        if not documents:
            return []
            
        tokenized_corpus = [doc.lower().split() for doc in documents]
        bm25 = BM25Okapi(tokenized_corpus)
        
        tokenized_query = query.lower().split()
        scores = bm25.get_scores(tokenized_query)
        
        scored_docs = []
        for idx, score in enumerate(scores):
            scored_docs.append({
                "text": documents[idx],
                "metadata": metadatas[idx],
                "score": float(score)
            })
            
        if active_files:
            scored_docs = [s for s in scored_docs if s["metadata"].get("source") in active_files]
            
        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        return scored_docs[:k]
    except Exception as e:
        print(f"BM25 search failed: {e}")
        return []

def hybrid_search(query: str, top_k: int = 10, active_files: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Merge results from vector similarity and BM25 searches, and deduplicate them.
    Returns a unified list of unique candidates.
    """
    vector_results = similarity_search_in_store(query, k=top_k, active_files=active_files)
    bm25_results = bm25_search_in_store(query, k=top_k, active_files=active_files)
    
    merged = {}
    
    # Process vector results
    for res in vector_results:
        key = (res["metadata"].get("source", ""), res["metadata"].get("page", 1), res["text"])
        merged[key] = {
            "text": res["text"],
            "metadata": res["metadata"],
            "vector_score": res["score"],
            "bm25_score": 0.0,
            "combined_score": res["score"] # Initial combined score
        }
        
    # Process BM25 results
    for res in bm25_results:
        key = (res["metadata"].get("source", ""), res["metadata"].get("page", 1), res["text"])
        # Normalize BM25 score to be comparable or combine it
        # Let's say BM25 score has some weight
        if key in merged:
            merged[key]["bm25_score"] = res["score"]
            # Combined score can be average or sum
            merged[key]["combined_score"] += (res["score"] * 0.1) # Scale BM25 down slightly for ranking
        else:
            merged[key] = {
                "text": res["text"],
                "metadata": res["metadata"],
                "vector_score": 0.0,
                "bm25_score": res["score"],
                "combined_score": res["score"] * 0.1
            }
            
    sorted_candidates = list(merged.values())
    sorted_candidates.sort(key=lambda x: x["combined_score"], reverse=True)
    return sorted_candidates[:top_k]

def rerank_documents(query: str, candidates: List[Dict[str, Any]], rerank_n: int = 3) -> List[Dict[str, Any]]:
    """
    Rerank search candidates using the Cohere Rerank API.
    Falls back to original list if Cohere is not configured or fails.
    """
    if not candidates:
        return []
        
    api_key = settings.COHERE_API_KEY
    if not api_key or api_key == "mock_cohere_api_key" or "your_cohere" in api_key:
        print("Cohere Rerank API key not configured. Bypassing reranking.")
        return candidates[:rerank_n]
        
    try:
        # Cohere SDK v5+ uses ClientV2 (Client was removed in v5)
        co = cohere.ClientV2(api_key=api_key)
        doc_texts = [c["text"] for c in candidates]
        
        response = co.rerank(
            model="rerank-english-v3.0",
            query=query,
            documents=doc_texts,
            top_n=rerank_n
        )
        
        reranked = []
        for result in response.results:
            idx = result.index
            cand = candidates[idx]
            cand["metadata"]["rerank_score"] = float(result.relevance_score)
            reranked.append({
                "text": cand["text"],
                "metadata": cand["metadata"],
                "score": float(result.relevance_score)
            })
        return reranked
    except Exception as e:
        print(f"Cohere Rerank API call failed: {e}. Falling back to hybrid candidates.")
        return candidates[:rerank_n]

async def retrieve(
    query: str, 
    top_k: int = 10, 
    rerank_n: int = 3, 
    active_files: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Full document retrieval pipeline: Vector + BM25 search -> Cohere Rerank.
    """
    candidates = hybrid_search(query, top_k=top_k, active_files=active_files)
    reranked = rerank_documents(query, candidates, rerank_n=rerank_n)
    return reranked

def perform_ocr_on_image(file_path: str) -> str:
    """
    Extract text content from an image file (PNG, JPG, JPEG) using local Tesseract OCR.
    Applies preprocessing (grayscale, contrast boost) for better accuracy on screenshots.
    """
    import pytesseract
    from PIL import Image, ImageEnhance

    try:
        img = Image.open(file_path)

        # Convert to RGB if needed (handles RGBA/palette images)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Preprocessing: grayscale + contrast boost helps on screenshots
        img = img.convert("L")                          # Grayscale
        img = ImageEnhance.Contrast(img).enhance(1.5)  # Boost contrast for clearer text
        img = ImageEnhance.Sharpness(img).enhance(2.0) # Sharpen edges

        ocr_text = pytesseract.image_to_string(
            img,
            config="--psm 6 --oem 3"
        ).strip()

        if not ocr_text:
            return "[No readable text found in this image. The image may be purely graphical.]"

        print(f"[Image OCR] Extracted {len(ocr_text)} chars from {os.path.basename(file_path)}")
        return ocr_text

    except Exception as e:
        print(f"[Image OCR] Failed: {e}")
        return f"[Image OCR Error: {e}]"

