from abc import ABC, abstractmethod

class IUnitOfWork(ABC):
    @abstractmethod
    async def __aenter__(self):
        pass

    @abstractmethod
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    @abstractmethod
    async def commit(self):
        pass

    @abstractmethod
    async def rollback(self):
        pass
        
    @abstractmethod
    async def commit_with_outbox(self):
        """Commits transaction and flushes domain events to outbox table"""
        pass
