from fastapi import APIRouter, File, UploadFile, HTTPException, Query, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from app.api.schemas import ChatRequest, ChatResponse, UploadResponse, Citation
from app.config import settings
from app.core.rag import extract_text_from_pdf_with_ocr, extract_text_from_docx, chunk_documents, add_documents_to_store, perform_ocr_on_image
from app.core.sql import sanitize_table_name, ingest_csv_to_sqlite
from app.core.reporter import compile_pdf_report
from app.core.agent import compiled_graph
from datetime import datetime
import uuid
import io
import os
import shutil
from typing import Dict, Any, List

router = APIRouter(prefix="/api")

# Global thread-safe processing cache for tracking upload statuses
processing_statuses: Dict[str, Dict[str, Any]] = {}

# Session history logs cache for exporting reports
session_histories: Dict[str, List[Dict[str, Any]]] = {}

async def process_file_background(file_id: str, file_path: str, filename: str, ext: str):
    """
    Background worker function that parses, chunks, and embeds files.
    """
    processing_statuses[file_id] = {
        "status": "processing",
        "filename": filename,
        "error": None
    }
    
    try:
        if ext == "pdf":
            # Use OCR-aware extractor: handles both text-based and scanned image PDFs
            pages = extract_text_from_pdf_with_ocr(file_path)
            chunks = chunk_documents(pages, filename)
            if not chunks:
                processing_statuses[file_id]["status"] = "failed"
                processing_statuses[file_id]["error"] = (
                    "No text could be extracted from the PDF. "
                    "The file may be corrupted or OCR failed for all pages."
                )
                return
            add_documents_to_store(chunks)
            print(f"[Ingestion] '{filename}': {len(chunks)} chunks stored in ChromaDB")
        elif ext == "docx":
            pages = extract_text_from_docx(file_path)
            chunks = chunk_documents(pages, filename)
            add_documents_to_store(chunks)
        elif ext in ["png", "jpg", "jpeg"]:
            ocr_text = perform_ocr_on_image(file_path)
            if not ocr_text or ocr_text.startswith("["):
                processing_statuses[file_id]["status"] = "failed"
                processing_statuses[file_id]["error"] = (
                    "No readable text could be extracted from this image. "
                    "The image may be purely graphical, blurry, or too low resolution."
                )
                return
            pages = [{"text": ocr_text, "page": 1}]
            chunks = chunk_documents(pages, filename)
            add_documents_to_store(chunks)
            print(f"[Ingestion] '{filename}': {len(chunks)} chunks stored from image OCR")
        elif ext == "csv":
            table_name = sanitize_table_name(filename)
            db_path = settings.sqlite_db_path
            ingest_csv_to_sqlite(file_path, table_name, db_path)
        elif ext in ["sqlite", "db"]:
            # SQLite db saved directly to sqlite directory, registered.
            pass
        processing_statuses[file_id]["status"] = "completed"
    except Exception as e:
        import traceback
        traceback.print_exc()
        processing_statuses[file_id]["status"] = "failed"
        processing_statuses[file_id]["error"] = str(e)

@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Upload file endpoint. Saves uploaded file and queues background parsing.
    """
    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    if ext not in ["pdf", "docx", "csv", "sqlite", "db", "png", "jpg", "jpeg"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Supported types: PDF, DOCX, CSV, SQLite/DB, Images (PNG/JPG/JPEG)."
        )

    file_id = str(uuid.uuid4())
    
    if ext in ["sqlite", "db"]:
        target_dir = settings.sqlite_dir
    else:
        target_dir = settings.documents_dir
        
    target_path = target_dir / filename
    
    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )
    finally:
        file.file.close()

    background_tasks.add_task(
        process_file_background,
        file_id=file_id,
        file_path=str(target_path),
        filename=filename,
        ext=ext
    )

    processing_statuses[file_id] = {
        "status": "processing",
        "filename": filename,
        "error": None
    }

    return UploadResponse(
        status="success",
        message=f"File '{filename}' upload accepted. Processing started in the background.",
        file_id=file_id,
        filename=filename,
        processing_status="processing"
    )

@router.get("/upload/status/{file_id}")
async def get_upload_status(file_id: str):
    """
    Endpoint for frontend polling to check the processing state of an uploaded file.
    """
    if file_id not in processing_statuses:
        raise HTTPException(status_code=404, detail="File ID not found")
    return processing_statuses[file_id]

@router.get("/session/{session_id}")
async def get_session_history(session_id: str):
    """
    Retrieve the historical messages/logs for a given session ID to reload in the frontend.
    """
    history = session_histories.get(session_id, [])
    return {"session_id": session_id, "history": history}

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Submit a query and execute the LangGraph state machine workflow.
    """
    session_id = request.session_id
    history = session_histories.get(session_id, [])
    
    # Initialize shared graph state with conversational memory context
    initial_state = {
        "query": request.query,
        "intent": "",
        "retrieved_chunks": [],
        "sql_query": None,
        "sql_results": [],
        "sql_error": None,
        "sql_retry_count": 0,
        "response_text": "",
        "citations": [],
        "chart_config": None,
        "evaluation_metrics": {},
        "active_files": request.active_files,
        "history": history,
        "standalone_query": None
    }
    
    try:
        # Invoke state graph
        result = await compiled_graph.ainvoke(initial_state)
        
        # Save logs to session history for exporting reports and future context turns
        if session_id not in session_histories:
            session_histories[session_id] = []
            
        session_histories[session_id].append({
            "query": request.query,
            "answer": result["response_text"],
            "sql_query": result["sql_query"],
            "sql_results": result["sql_results"],
            "chart_config": result["chart_config"],
            "citations": result["citations"]
        })
        
        return ChatResponse(
            status="success",
            intent=result["intent"],
            answer=result["response_text"],
            citations=result["citations"],
            sql_query=result["sql_query"],
            sql_results=result["sql_results"],
            chart_config=result["chart_config"],
            evaluation_metrics=result["evaluation_metrics"]
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"LangGraph execution failed: {str(e)}"
        )

@router.get("/export-pdf")
async def export_pdf(session_id: str = Query(..., description="The session ID to export report for")):
    """
    Generate and download a PDF report containing the query and response logs.
    """
    # Fetch session history
    history = session_histories.get(session_id, [])
    
    try:
        # Compile PDF report using ReportLab
        pdf_data = compile_pdf_report(history, session_id)
        
        # Stream PDF back as a file download
        pdf_stream = io.BytesIO(pdf_data)
        
        # Format current timestamp for filename
        time_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"analyst_report_{session_id}_{time_str}.pdf"
        
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report: {str(e)}"
        )

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe uploaded audio file using Groq Whisper-large-v3-turbo model.
    """
    groq_key = settings.GROQ_API_KEY
    
    if not groq_key or "mock" in groq_key or "your_" in groq_key:
        print("Using Mock transcription since Groq API key is mock.")
        return {"text": "This is a mock transcribed text representing your voice prompt."}
        
    try:
        file_bytes = await file.read()
        
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {groq_key}"
        }
        files = {
            "file": (file.filename or "audio.webm", file_bytes, file.content_type or "audio/webm")
        }
        data = {
            "model": "whisper-large-v3-turbo",
            "response_format": "json"
        }
        
        import requests
        import asyncio
        
        def call_groq():
            return requests.post(url, headers=headers, files=files, data=data, timeout=30)
            
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, call_groq)
        
        if res.status_code != 200:
            raise HTTPException(
                status_code=res.status_code, 
                detail=f"Groq Whisper API returned error: {res.text}"
            )
            
        transcription_result = res.json()
        return {"text": transcription_result.get("text", "").strip()}
        
    except Exception as e:
        print(f"Audio transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to transcribe audio: {str(e)}")
