from http.client import HTTPException
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile

from api.v1.schemas.upload import ImageUploadResponse
from core.google_cloud import ImageStorage
from core.config import settings

router = APIRouter()


def get_image_storage():
    return ImageStorage(
        bucket_name=settings.GCS_BUCKET_NAME,
        credentials_path=settings.GCS_CREDENTIALS_PATH,
    )


@router.post("/upload", response_model=ImageUploadResponse, status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    custom_filename: Optional[str] = Form(None),
    storage: ImageStorage = Depends(get_image_storage),
):
    try:
        result = await storage.upload_image(file=file, custom_filename=custom_filename)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi upload ảnh: {str(e)}")
