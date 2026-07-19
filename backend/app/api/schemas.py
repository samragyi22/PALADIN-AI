from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ChatRequest(BaseModel):
    query: str
    session_id: str
    active_files: Optional[List[str]] = None

class Citation(BaseModel):
    source: str
    page: int
    text: str
    score: float

class ChartConfig(BaseModel):
    type: str  # "bar" | "line" | "pie"
    data: List[Dict[str, Any]]
    xAxis: str
    yAxis: str
    title: str

class ChatResponse(BaseModel):
    status: str
    intent: str
    answer: str
    citations: List[Citation]
    sql_query: Optional[str] = None
    sql_results: Optional[List[Dict[str, Any]]] = None
    chart_config: Optional[ChartConfig] = None
    evaluation_metrics: Dict[str, Any]

class UploadResponse(BaseModel):
    status: str
    message: str
    file_id: str
    filename: str
    processing_status: str
