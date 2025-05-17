from fastapi import APIRouter, Depends

from api.v1.routes import (
    login,
    generate_image,
    auto_segment,
    upload,
    generate_video,
    picture_ads,
    download,
)
from api.v1.services.auth import get_current_user


router = APIRouter()
secure_router = APIRouter(dependencies=[Depends(get_current_user)])

router.include_router(login.router, tags=["Auth"], prefix="/auth")
secure_router.include_router(download.router, prefix="/download")
secure_router.include_router(
    generate_image.router, tags=["Generate Image"], prefix="/generate"
)
secure_router.include_router(
    generate_video.router, tags=["Generate Video"], prefix="/generate"
)
secure_router.include_router(upload.router, tags=["Upload File"])
router.include_router(
    auto_segment.router, tags=["Auto segment"], prefix="/auto-segment"
)
secure_router.include_router(
    picture_ads.router, tags=["Picture Ads"], prefix="/picture-ads"
)
