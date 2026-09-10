from dataclasses import dataclass
from domain.value_objects.money import Money

@dataclass
class GenerateImageResponse:
    asset_id: str
    url: str
    local_path: str
    enhanced_prompt: str
    estimated_cost: Money
