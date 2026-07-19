
import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    LLM_PROVIDER: str = "groq"  # "gemini", "openai", or "groq"
    EMBEDDING_PROVIDER: str = "cohere"  # "gemini", "openai", "huggingface", or "cohere"
    GOOGLE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    COHERE_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    HF_API_KEY: Optional[str] = None

    # Storage paths
    DATA_DIR: str = "../data"

    # Server configurations
    ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Automatically load from a .env file if it exists
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def data_path(self) -> Path:
        return Path(self.DATA_DIR).resolve()

    @property
    def documents_dir(self) -> Path:
        path = self.data_path / "documents"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def sqlite_dir(self) -> Path:
        path = self.data_path / "sqlite"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def chroma_dir(self) -> Path:
        path = self.data_path / "chroma"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def logs_dir(self) -> Path:
        path = self.data_path / "logs"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def sqlite_db_path(self) -> str:
        return str(self.sqlite_dir / "analyst.db")

settings = Settings()
