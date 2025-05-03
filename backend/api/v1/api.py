from fastapi import APIRouter

from api.v1.routes import login

router = APIRouter()

router.include_router(login.router, tags=["Auth"], prefix="/auth")
