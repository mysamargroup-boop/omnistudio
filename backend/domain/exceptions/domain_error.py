class DomainError(Exception):
    """Base exception for all domain logic errors."""
    pass
    
class QuotaExceededError(DomainError):
    pass
    
class AssetNotFoundError(DomainError):
    pass
