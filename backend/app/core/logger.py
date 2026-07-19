import os
import logging
import json
from datetime import datetime
from app.config import settings

# Ensure logs directory exists — settings.logs_dir is a Path, convert to str for os.path.join compatibility
logs_dir_path = str(settings.logs_dir)
os.makedirs(logs_dir_path, exist_ok=True)
log_file_path = os.path.join(logs_dir_path, "session.log")

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage()
        }
        # Add any extra custom fields passed to logging
        if hasattr(record, "custom_fields") and isinstance(record.custom_fields, dict):
            log_entry.update(record.custom_fields)
        return json.dumps(log_entry)

# Setup logger
logger = logging.getLogger("session_logger")
logger.setLevel(logging.INFO)

# Prevent duplicate handlers if module is reloaded
if not logger.handlers:
    file_handler = logging.FileHandler(log_file_path)
    file_handler.setFormatter(JsonFormatter())
    logger.addHandler(file_handler)

def log_session_event(message: str, **kwargs):
    """
    Utility to log structured JSON entries.
    """
    record = logger.makeRecord(
        name="session_logger",
        level=logging.INFO,
        fn="",
        lno=0,
        msg=message,
        args=(),
        exc_info=None
    )
    record.custom_fields = kwargs
    logger.handle(record)
