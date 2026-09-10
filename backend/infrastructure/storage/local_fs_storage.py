import os
from pathlib import Path
from typing import Tuple
from application.ports.i_storage_repository import IStorageRepository
from config import settings

class LocalFsStorage(IStorageRepository):
    def __init__(self, base_path: Path = None):
        self.base_path = base_path or settings.OUTPUTS_PATH
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save(self, content: bytes, asset_type: str, filename: str) -> Tuple[str, str, int]:
        target_dir = self.base_path / f"{asset_type}s"
        target_dir.mkdir(parents=True, exist_ok=True)
        
        local_path = target_dir / filename
        with open(local_path, "wb") as f:
            f.write(content)
            
        size_bytes = len(content)
        storage_url = f"/outputs/{asset_type}s/{filename}"
        
        return storage_url, str(local_path), size_bytes
