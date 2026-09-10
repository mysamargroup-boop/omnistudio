from dataclasses import dataclass, field
from datetime import datetime
from typing import List
from domain.events.base import EventRecorderMixin, DomainEvent
from domain.value_objects.ids import ProjectId, AssetId
from domain.value_objects.money import Money
from domain.entities.asset import Asset
from domain.entities.generation import Generation
from domain.exceptions.domain_error import DomainError

@dataclass
class ProjectFinishedEvent(DomainEvent):
    project_id: str
    final_asset_id: str
    scenes_count: int
    total_cost: Money

@dataclass
class Project(EventRecorderMixin):
    id: ProjectId
    title: str
    topic: str
    style: str = "cinematic"
    scenes_count: int = 1
    scenes: List[dict] = field(default_factory=list)
    assets: List[Asset] = field(default_factory=list)
    generations: List[Generation] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "draft"
    
    def __post_init__(self):
        super().__init__()

    def mark_completed(self, final_asset: Asset):
        if self.status == "completed":
            raise DomainError("Project already completed")
        self.assets.append(final_asset)
        self.status = "completed"
        
        self.record_event(ProjectFinishedEvent(
            project_id=str(self.id),
            final_asset_id=str(final_asset.id),
            scenes_count=self.scenes_count,
            total_cost=self.calculate_total_cost()
        ))

    def calculate_total_cost(self) -> Money:
        total_usd = sum(g.cost_usd.amount for g in self.generations)
        return Money(amount=total_usd, currency="USD")

    def can_add_scene(self) -> bool:
        return self.scenes_count < 30
