from infrastructure.storage.local_fs_storage import LocalFsStorage
from infrastructure.db.repositories.sqlite_unit_of_work import SQLiteUnitOfWork
from infrastructure.ai_providers.mock_provider import MockImageProvider
from application.use_cases.commands.generate_image.generate_image_handler import GenerateImageHandler

class Container:
    """Simple manual DI Container for gradual migration."""
    _instances = {}

    @classmethod
    def get_storage(cls):
        if 'storage' not in cls._instances:
            cls._instances['storage'] = LocalFsStorage()
        return cls._instances['storage']

    @classmethod
    def get_uow(cls):
        return SQLiteUnitOfWork()

    @classmethod
    def get_image_provider(cls):
        if 'image_provider' not in cls._instances:
            cls._instances['image_provider'] = MockImageProvider()
        return cls._instances['image_provider']

    @classmethod
    def get_generate_image_handler(cls) -> GenerateImageHandler:
        return GenerateImageHandler(
            unit_of_work=cls.get_uow(),
            image_provider=cls.get_image_provider(),
            storage=cls.get_storage()
        )
