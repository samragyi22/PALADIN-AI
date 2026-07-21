from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
import os

db_path = settings.sqlite_db_path
os.makedirs(os.path.dirname(db_path), exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
