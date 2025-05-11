from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, Path, HTTPException

from api.v1.schemas.upload import DeleteImageRequest, ImageUploadResponse
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
