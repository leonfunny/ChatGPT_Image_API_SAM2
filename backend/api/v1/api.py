from fastapi import APIRouter, Depends

from api.v1.routes import login, generate_image
from api.v1.services.auth import get_current_user

router = APIRouter()
secure_router = APIRouter(dependencies=[Depends(get_current_user)])

router.include_router(login.router, tags=["Auth"], prefix="/auth")
secure_router.include_router(
    generate_image.router, tags=["Generate Image"], prefix="/generate"
)
