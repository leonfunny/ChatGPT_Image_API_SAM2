from datetime import datetime
from typing import List, Optional
from api.v1.schemas.base import GeneralModel


class GenerateImageRequest(GeneralModel):
    prompt: str
    model: str = "gpt-image-1"
    size: str = "1024x1024"
    quality: str = "auto"
    background: str = "auto"
    output_format: str = "png"
    output_compression: Optional[int] = None


class EditImageRequest(GeneralModel):
    prompt: str
    model: str = "gpt-image-1"
    size: str = "1024x1024"
    n: int = 1
    output_format: str = "png"
    output_compression: Optional[int] = None


class ImageResponse(GeneralModel):
    image_url: str
    format: str


class SourceImageResponse(GeneralModel):
    id: int
    gcs_public_url: str
    original_filename: Optional[str]
    format: str
    content_type: str
    created_at: datetime


class ImageHistoryResponse(GeneralModel):
    id: int
    gcs_public_url: str
    format: str
    prompt: Optional[str]
    model: Optional[str]
    created_at: datetime
    source_images: List[SourceImageResponse] = []


class ImageHistoryPaginatedResponse(GeneralModel):
    items: List[ImageHistoryResponse]
    total: int
    page: int
    size: int
    pages: int
