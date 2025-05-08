import io
import uuid
from typing import Optional, Dict, Any

from fastapi import UploadFile, HTTPException
from openai import OpenAI, OpenAIError

from core.google_cloud import ImageStorage
from models.user import Image
from sqlalchemy.ext.asyncio import AsyncSession


class ImageService:
    def __init__(self, openai_api_key: str, bucket_name: str, credentials_path: str):
        self.client = OpenAI(api_key=openai_api_key)
        self.image_storage = ImageStorage(
            bucket_name=bucket_name, credentials_path=credentials_path
        )
        self.bucket_name = bucket_name

    async def generate_image(self, params: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = self.client.images.generate(**params)
            return response.data[0]
        except OpenAIError as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    async def edit_image(
        self,
        image_file: io.BytesIO,
        mask_file: Optional[io.BytesIO],
        params: Dict[str, Any],
    ) -> Dict[str, Any]:
        try:
            if mask_file:
                response = self.client.images.edit(
                    image=image_file, mask=mask_file, **params
                )
            else:
                response = self.client.images.edit(image=image_file, **params)
            return response.data[0]
        except OpenAIError as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    async def process_and_store_image(
        self,
        image_content: bytes,
        output_format: str,
        user_id: int,
        prompt: str,
        model: str,
        db: AsyncSession,
    ) -> Dict[str, str]:
        try:
            image_file = io.BytesIO(image_content)
            file_extension = f".{output_format}"
            filename = f"{uuid.uuid4()}{file_extension}"

            upload_file = UploadFile(
                file=image_file,
                filename=filename,
            )

            upload_file.headers = {"content-type": f"image/{output_format}"}
            gcs_info = await self.image_storage.upload_image(upload_file)

            new_image = Image(
                user_id=user_id,
                gcs_bucket=self.bucket_name,
                gcs_filename=gcs_info["path"],
                gcs_public_url=gcs_info["public_url"],
                original_filename=filename,
                content_type=gcs_info["content_type"],
                size_bytes=gcs_info["size"],
                format=output_format,
                prompt=prompt,
                model=model,
            )

            db.add(new_image)
            await db.commit()
            await db.refresh(new_image)

            return {"image_url": gcs_info["public_url"], "format": output_format}
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error processing image: {str(e)}"
            )


def prepare_openai_params(
    model: str,
    prompt: str,
    size: str,
    output_format: str,
    output_compression: Optional[int] = None,
    background: Optional[str] = None,
    quality: Optional[str] = None,
) -> Dict[str, Any]:
    """Prepare parameters for OpenAI API calls."""
    params = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "n": 1,
    }

    if quality:
        params["quality"] = quality

    if background and background != "auto":
        params["background"] = background

    if output_format != "png":
        params["format"] = output_format

    if output_compression is not None and output_format in ["jpeg", "webp"]:
        params["output_compression"] = output_compression

    return params
