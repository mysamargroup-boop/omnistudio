from dataclasses import dataclass, field
from datetime import datetime
from domain.value_objects.ids import AssetId

@dataclass
class Asset:
    id: AssetId
    media_type: str
    filename: str
    storage_url: str
    local_path: str
    size_bytes: int
    created_at: datetime = field(default_factory=datetime.utcnow)
