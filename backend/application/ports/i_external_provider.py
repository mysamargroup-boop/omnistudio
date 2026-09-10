from abc import ABC, abstractmethod
from typing import Tuple
from dataclasses import dataclass
from domain.value_objects.money import Money

@dataclass
class ProviderMetadata:
    model_name: str
    estimated_cost: Money

class IImageProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, model: str, size: str) -> Tuple[bytes, ProviderMetadata]:
        """Returns (image_bytes, metadata)"""
        pass
