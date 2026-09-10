"""Append-only security audit logging for security-sensitive events."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config import BASE_DIR

logger = logging.getLogger(__name__)
AUDIT_LOG_PATH = BASE_DIR / "security_audit.ndjson"


def audit_log(event: str, **details: Any) -> None:
    """Write one structured, append-only audit event without logging secret values."""
    record = {"timestamp": datetime.now(timezone.utc).isoformat(), "event": event, **details}
    try:
        with AUDIT_LOG_PATH.open("a", encoding="utf-8") as audit_file:
            audit_file.write(json.dumps(record, default=str) + "\n")
    except OSError:
        logger.exception("Unable to write security audit event: %s", event)
