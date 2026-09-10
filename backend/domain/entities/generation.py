from dataclasses import dataclass, field
from datetime import datetime
from domain.value_objects.ids import GenerationId
from domain.value_objects.money import Money

@dataclass
class Generation:
    id: GenerationId
    service_type: str  # image, video, voice
    provider: str
    model_used: str
    prompt: str
    output_url: str
    cost_usd: Money
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "completed"
