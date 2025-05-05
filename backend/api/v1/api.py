from fastapi import APIRouter

from api.v1.routes import login, generate_image

router = APIRouter()

router.include_router(login.router, tags=["Auth"], prefix="/auth")
router.include_router(generate_image.router, tags=["Generate Image"], prefix="/generate")

