from typing import Dict, Optional
from api.v1.schemas.base import GeneralModel


class ImageUploadResponse(GeneralModel):
    filename: str
    path: str
    size: int
    content_type: str
    url: str
    public_url: str


class DeleteImageRequest(GeneralModel):
    image_url: str


class VideoResponse(GeneralModel):
    filename: str
    path: str
    size: int
    content_type: str
    url: str
    public_url: str
    metadata: Dict
    upload_time: str


class VideoUrlRequest(GeneralModel):
    video_url: str
    folder: Optional[str] = "external_videos"
    custom_filename: Optional[str] = None
    metadata: Optional[Dict] = None
