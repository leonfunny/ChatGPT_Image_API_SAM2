from typing import Dict, Optional
from api.v1.schemas.video import VideoResponse
from fastapi import APIRouter, Depends, File, Form, UploadFile, Path, HTTPException

from api.v1.schemas.upload import (
    DeleteImageRequest,
    ImageUploadResponse,
    VideoUrlRequest,
)
from core.google_cloud import ImageStorage, VideoStorage
from core.config import settings

router = APIRouter()


def get_image_storage():
    return ImageStorage(
        bucket_name=settings.GCS_BUCKET_NAME,
        credentials_path=settings.GCS_CREDENTIALS_PATH,
    )


video_storage = VideoStorage(
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


@router.delete("/images", status_code=204)
def delete_image(
    request: DeleteImageRequest,
    storage: ImageStorage = Depends(get_image_storage),
):
    try:
        image_url = request.image_url

        if image_url.startswith("image_data_learning/"):
            image_path = image_url.replace("image_data_learning/", "")

        success = storage.delete_image(image_path=image_path)
        if not success:
            raise HTTPException(
                status_code=404, detail="Không tìm thấy ảnh hoặc xóa thất bại"
            )
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa ảnh: {str(e)}")


@router.post("/upload-video", response_model=VideoResponse)
async def upload_video(
    file: UploadFile = File(...),
    folder: str = Form("videos_generated"),
):
    try:
        result = await video_storage.upload_video(
            file=file,
            folder=folder,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi upload video: {str(e)}")


@router.post("/from-url", response_model=VideoResponse)
async def save_video_from_url(request: VideoUrlRequest):
    try:
        result = await video_storage.save_video_from_url(
            video_url=request.video_url,
            folder=request.folder,
            custom_filename=request.custom_filename,
            metadata=request.metadata,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except TimeoutError as e:
        raise HTTPException(status_code=408, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Lỗi khi tải video từ URL: {str(e)}"
        )
