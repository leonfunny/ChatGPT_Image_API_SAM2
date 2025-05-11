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
