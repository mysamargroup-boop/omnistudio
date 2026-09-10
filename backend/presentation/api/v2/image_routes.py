from fastapi import APIRouter
from application.container import Container
from application.use_cases.commands.generate_image.generate_image_command import GenerateImageCommand

router = APIRouter(prefix="/api/v2/image", tags=["Image Generation (v2)"])

@router.post("/generate")
async def generate_image_v2(command: GenerateImageCommand):
    handler = Container.get_generate_image_handler()
    response = await handler.handle(command)
    return response
