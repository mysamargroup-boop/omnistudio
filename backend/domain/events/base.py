from dataclasses import dataclass, field
from datetime import datetime
import uuid

@dataclass
class DomainEvent:
    event_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    occurred_on: datetime = field(default_factory=datetime.utcnow)

class EventRecorderMixin:
    def __init__(self):
        self._domain_events = []

    def record_event(self, event: DomainEvent):
        if not hasattr(self, '_domain_events'):
            self._domain_events = []
        self._domain_events.append(event)

    def clear_events(self):
        if hasattr(self, '_domain_events'):
            self._domain_events.clear()
        
    @property
    def domain_events(self):
        return self._domain_events.copy() if hasattr(self, '_domain_events') else []
