from application.ports.i_unit_of_work import IUnitOfWork

class SQLiteUnitOfWork(IUnitOfWork):
    async def __aenter__(self):
        # Establish DB session here
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            await self.rollback()
        else:
            await self.commit()

    async def commit(self):
        pass

    async def rollback(self):
        pass
        
    async def commit_with_outbox(self):
        pass
