from abc import ABC, abstractmethod
from typing import Tuple

class IStorageRepository(ABC):
    @abstractmethod
    async def save(self, content: bytes, asset_type: str, filename: str) -> Tuple[str, str, int]:
        """Returns (storage_url, local_path, size_bytes)"""
        pass
