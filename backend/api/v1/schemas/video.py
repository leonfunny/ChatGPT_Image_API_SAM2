from enum import Enum
from typing import List, Optional

from api.v1.schemas.base import GeneralModel


class DurationEnum(str, Enum):
    FIVE = "5"
    TEN = "10"


class AspectRatioEnum(str, Enum):
    LANDSCAPE = "16:9"
    PORTRAIT = "9:16"
    SQUARE = "1:1"


class GenerateVideoRequest(GeneralModel):
    prompt: str
    image_url: str
    duration: DurationEnum = DurationEnum.FIVE
    aspect_ratio: AspectRatioEnum = AspectRatioEnum.LANDSCAPE
    negative_prompt: Optional[str] = "blur, distort, and low quality"
    cfg_scale: float = 0.5


class VideoResponse(GeneralModel):
    request_id: str
    status: str
    video_url: Optional[str] = None


class VideoGenerationRequest(GeneralModel):
    width: int
    height: int
    prompt: str
    frame_interpolation: bool
    prompt_enhance: bool
    style_ids: Optional[List[str]]


class GenerationLeonardoResponse(GeneralModel):
    generation_id: str
    status: str
