import io
import uuid
from typing import Optional, Dict, Any, List, Tuple

from fastapi import UploadFile, HTTPException
from openai import OpenAI, OpenAIError

from core.google_cloud import ImageStorage
from models.user import Image, User
from sqlalchemy.ext.asyncio import AsyncSession


from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload


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

    async def upload_source_image_to_gcs(
        self,
        image_data: bytes,
        original_filename: str,
        user_id: int,
        db: AsyncSession,
    ) -> Image:
        try:
            format = original_filename.split(".")[-1].lower()
            content_type = f"image/{format}"

            image_file = io.BytesIO(image_data)
            filename = f"source_{uuid.uuid4()}.{format}"

            upload_file = UploadFile(
                file=image_file,
                filename=filename,
            )

            upload_file.headers = {"content-type": content_type}
            gcs_info = await self.image_storage.upload_image(upload_file)

            new_image = Image(
                user_id=user_id,
                gcs_bucket=self.bucket_name,
                gcs_filename=gcs_info["path"],
                gcs_public_url=gcs_info["public_url"],
                original_filename=original_filename,
                content_type=gcs_info["content_type"],
                size_bytes=gcs_info["size"],
                format=format,
                is_source=True,
            )

            db.add(new_image)
            await db.commit()
            await db.refresh(new_image)

            return new_image
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error uploading source image to GCS: {str(e)}"
            )

    async def delete_image_from_gcs(self, image: Image, db: AsyncSession) -> None:
        try:
            await self.image_storage.delete_image(image.gcs_filename)
            await db.delete(image)
            await db.commit()
        except Exception as e:
            print(f"Error deleting image from GCS: {str(e)}")

    async def process_and_store_image(
        self,
        image_content: bytes,
        output_format: str,
        user_id: int,
        prompt: str,
        model: str,
        db: AsyncSession,
        source_images: Optional[List[Image]] = None,
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
                is_source=False,
            )

            db.add(new_image)

            if source_images:
                for source_image in source_images:
                    new_image.source_images.append(source_image)

            await db.commit()
            await db.refresh(new_image)

            return {"image_url": gcs_info["public_url"], "format": output_format}
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error processing and storing image: {str(e)}"
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


class ImageHistoryService:
    @staticmethod
    async def get_user_image_history(
        db: AsyncSession,
        user_id: int,
        page: int = 1,
        size: int = 10,
        is_source: bool = False,
    ) -> Tuple[List[Image], int]:
        offset = (page - 1) * size
        query = (
            select(Image)
            .where(and_(Image.user_id == user_id, Image.is_source == is_source))
            .order_by(Image.created_at.desc())
            .offset(offset)
            .limit(size)
        )

        if not is_source:
            query = query.options(selectinload(Image.source_images))

        result = await db.execute(query)
        images = result.scalars().all()

        count_query = select(func.count()).where(
            and_(Image.user_id == user_id, Image.is_source == is_source)
        )
        result = await db.execute(count_query)
        total_count = result.scalar()

        return images, total_count

    @staticmethod
    def format_image_history_response(
        images: List[Image], total: int, page: int, size: int
    ) -> Dict[str, Any]:
        pages = (total + size - 1) // size if total > 0 else 0

        formatted_images = []
        for image in images:
            source_images = []
            for source in image.source_images:
                source_images.append(
                    {
                        "id": source.id,
                        "gcs_public_url": source.gcs_public_url,
                        "original_filename": source.original_filename,
                        "format": source.format,
                        "content_type": source.content_type,
                        "created_at": source.created_at,
                    }
                )

            formatted_images.append(
                {
                    "id": image.id,
                    "gcs_public_url": image.gcs_public_url,
                    "format": image.format,
                    "prompt": image.prompt,
                    "model": image.model,
                    "created_at": image.created_at,
                    "source_images": source_images,
                }
            )

        return {
            "items": formatted_images,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        }
