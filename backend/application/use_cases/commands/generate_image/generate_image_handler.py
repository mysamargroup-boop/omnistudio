from dataclasses import dataclass
from application.ports.i_unit_of_work import IUnitOfWork
from application.ports.i_external_provider import IImageProvider
from application.ports.i_storage_repository import IStorageRepository
from domain.entities.generation import Generation
from domain.value_objects.ids import GenerationId, AssetId
from .generate_image_command import GenerateImageCommand
from .generate_image_response import GenerateImageResponse
import logging

logger = logging.getLogger(__name__)

@dataclass
class GenerateImageHandler:
    unit_of_work: IUnitOfWork
    image_provider: IImageProvider
    storage: IStorageRepository

    async def handle(self, command: GenerateImageCommand) -> GenerateImageResponse:
        final_prompt = f"{command.prompt}, {command.style} style"
        if command.lens:
            final_prompt += f", shot on {command.lens}"
        if command.lighting:
            final_prompt += f", {command.lighting} lighting"

        image_bytes, provider_metadata = await self.image_provider.generate(
            prompt=final_prompt,
            model=command.model,
            size=command.size
        )

        asset_id = AssetId.new()
        storage_url, local_path, size_bytes = await self.storage.save(
            content=image_bytes,
            asset_type="image",
            filename=f"{asset_id}.png"
        )

        generation = Generation(
            id=GenerationId.new(),
            service_type="image",
            provider=command.model,
            model_used=provider_metadata.model_name,
            prompt=final_prompt,
            output_url=storage_url,
            cost_usd=provider_metadata.estimated_cost
        )

        async with self.unit_of_work as uow:
            # Domain events would be dispatched here
            await uow.commit_with_outbox()

        return GenerateImageResponse(
            asset_id=str(asset_id),
            url=storage_url,
            local_path=local_path,
            enhanced_prompt=final_prompt,
            estimated_cost=provider_metadata.estimated_cost
        )
