from typing import Dict, List, Optional
from api.v1.schemas.base import GeneralModel


class SegmentationResult(GeneralModel):
    image_url: str
    original_image_url: str


class WebSocketMessage(GeneralModel):
    action: str
    image_url: str
    prompts: Optional[List[Dict[str, int]]] = None
    box_prompts: Optional[List[Dict[str, int]]] = None


class PointPrompt(GeneralModel):
    x: int
    y: int
    label: int = 1  # 1 for foreground, 0 for background


class BoxPrompt(GeneralModel):
    x_min: int
    y_min: int
    x_max: int
    y_max: int


class ImageProcessRequest(GeneralModel):
    image_url: str  # URL của ảnh (có thể từ Google Cloud Storage)
    prompts: Optional[List[PointPrompt]] = None
    box_prompts: Optional[List[BoxPrompt]] = None
    output_format: str = "png"
    client_id: Optional[str] = None
