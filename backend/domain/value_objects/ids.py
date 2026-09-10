from dataclasses import dataclass
import uuid

@dataclass(frozen=True)
class DomainId:
    value: str

    @classmethod
    def new(cls) -> "DomainId":
        return cls(value=uuid.uuid4().hex)
        
    def __str__(self) -> str:
        return self.value

class ProjectId(DomainId): pass
class AssetId(DomainId): pass
class GenerationId(DomainId): pass
