from typing import Tuple
from application.ports.i_external_provider import IImageProvider, ProviderMetadata
from domain.value_objects.money import Money

class MockImageProvider(IImageProvider):
    async def generate(self, prompt: str, model: str, size: str) -> Tuple[bytes, ProviderMetadata]:
        import io
        from PIL import Image
        img = Image.new("RGB", (100, 100), color="gray")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        
        meta = ProviderMetadata(
            model_name="mock_architecture_test",
            estimated_cost=Money(0.0)
        )
        return buf.getvalue(), meta
