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
