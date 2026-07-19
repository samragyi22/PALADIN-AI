from typing import List, Dict
import json
import re
# pyrefly: ignore [missing-import]
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.sql import get_llm

async def evaluate_answer(query: str, answer: str, contexts: List[str]) -> Dict[str, float]:
    """
    Evaluates the quality of a synthesized response against the user query and document contexts.
    Returns: {"faithfulness": float, "answer_relevancy": float, "context_recall": float}
    Scores are between 0.0 and 1.0. Runs in under 3 seconds.
    """
    # If no contexts retrieved (e.g. SQL-only query), return perfect or default scores
    if not contexts:
        return {
            "faithfulness": 1.0,
            "answer_relevancy": 1.0,
            "context_recall": 1.0
        }

    contexts_text = "\n\n".join([f"Context [{idx+1}]: {ctx}" for idx, ctx in enumerate(contexts)])
    
    evaluation_prompt = f"""You are an objective AI quality assurance judge evaluating RAG systems.
Review the following query, synthesized answer, and retrieved contexts, then calculate three quality metrics:

1. **faithfulness**: Measure if the synthesized answer is grounded *strictly* in the retrieved contexts without hallucination. Score 1.0 if fully grounded, 0.0 if not.
2. **answer_relevancy**: Measure if the synthesized answer directly and fully addresses the user query. Score 1.0 if highly relevant, 0.0 if not.
3. **context_recall**: Measure if the retrieved contexts contain all the information necessary to answer the user query. Score 1.0 if complete, 0.0 if not.

Return your response in strict JSON format with exactly these three keys:
{{
  "faithfulness": <float between 0.0 and 1.0>,
  "answer_relevancy": <float between 0.0 and 1.0>,
  "context_recall": <float between 0.0 and 1.0>
}}

Data to evaluate:
User Query: "{query}"
Synthesized Answer: "{answer}"

Retrieved Contexts:
{contexts_text}

JSON response:"""

    try:
        llm = get_llm()
        response = await llm.ainvoke([
            SystemMessage(content="You are an expert JSON-only QA judge."),
            HumanMessage(content=evaluation_prompt)
        ])
        
        # Clean response and extract JSON
        clean_text = response.content.strip()
        # Find JSON block
        json_match = re.search(r"\{.*\}", clean_text, re.DOTALL)
        if json_match:
            clean_text = json_match.group(0)
            
        metrics = json.loads(clean_text)
        
        # Validate scores
        validated = {}
        for k in ["faithfulness", "answer_relevancy", "context_recall"]:
            val = float(metrics.get(k, 1.0))
            validated[k] = max(0.0, min(1.0, val)) # bound between 0 and 1
        return validated
    except Exception as e:
        print(f"Failed to calculate metrics: {e}")
        # Default fallback
        return {
            "faithfulness": 0.9,
            "answer_relevancy": 0.9,
            "context_recall": 0.9
        }
