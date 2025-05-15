import io
import base64
import aiohttp
from typing import Optional, List
import uuid
from api.v1.schemas.generate_image import (
    GenerateImageRequest,
    ImageHistoryPaginatedResponse,
    ImageResponse,
)
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, Query
from openai import OpenAI, OpenAIError
from api.v1.services.auth import get_current_user
from api.v1.services.image import (
    ImageHistoryService,
    ImageService,
    prepare_openai_params,
)
from core.config import settings
from core.database import DbSession
from models.user import Image, User

client = OpenAI(api_key=settings.OPENAI_API_KEY)
image_service = ImageService(
    openai_api_key=settings.OPENAI_API_KEY,
    bucket_name=settings.GCS_BUCKET_NAME,
    credentials_path=settings.GCS_CREDENTIALS_PATH,
)

router = APIRouter()


@router.post("/", response_model=ImageResponse)
async def generate_image(
    db: DbSession,
    data: GenerateImageRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        params = prepare_openai_params(
            model=data.model,
            prompt=data.prompt,
            size=data.size,
            output_format=data.output_format,
            output_compression=data.output_compression,
            background=data.background,
            quality=data.quality,
        )
        result = await image_service.generate_image(params)
        image_content = base64.b64decode(result.b64_json)

        result = await image_service.process_and_store_image(
            image_content=image_content,
            output_format=data.output_format,
            user_id=current_user.id,
            prompt=data.prompt,
            model=data.model,
            db=db,
        )

        return ImageResponse(**result)

    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e


@router.post("/edit", response_model=ImageResponse)
async def edit_image(
    db: DbSession,
    prompt: str = Form(...),
    model: str = Form("gpt-image-1"),
    size: str = Form("1024x1024"),
    output_format: str = Form("png"),
    output_compression: Optional[int] = Form(None),
    quality: Optional[str] = Form(None),
    image: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    source_image = None
    mask_source_image = None

    try:
        image_data = await image.read()
        source_image = await image_service.upload_source_image_to_gcs(
            image_data=image_data,
            original_filename=image.filename,
            user_id=current_user.id,
            db=db,
        )

        image_file = io.BytesIO(image_data)
        image_file.name = image.filename

        mask_file = None
        if mask:
            mask_data = await mask.read()
            mask_source_image = await image_service.upload_source_image_to_gcs(
                image_data=mask_data,
                original_filename=mask.filename,
                user_id=current_user.id,
                db=db,
            )
            mask_file = io.BytesIO(mask_data)
            mask_file.name = mask.filename

        params = prepare_openai_params(
            model=model,
            prompt=prompt,
            size=size,
            output_format=output_format,
            output_compression=output_compression,
            quality=quality,
        )

        try:
            result = await image_service.edit_image(
                image_file=image_file, mask_file=mask_file, params=params
            )
            image_content = base64.b64decode(result.b64_json)

            source_images = [source_image]
            if mask_source_image:
                source_images.append(mask_source_image)

            result = await image_service.process_and_store_image(
                image_content=image_content,
                output_format=output_format,
                user_id=current_user.id,
                prompt=prompt,
                model=model,
                db=db,
                source_images=source_images,
            )

            return ImageResponse(**result)

        except OpenAIError as e:
            if source_image:
                await image_service.delete_image_from_gcs(source_image, db)
            if mask_source_image:
                await image_service.delete_image_from_gcs(mask_source_image, db)

            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    except Exception as e:
        if source_image:
            await image_service.delete_image_from_gcs(source_image, db)
        if mask_source_image:
            await image_service.delete_image_from_gcs(mask_source_image, db)

        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e


@router.post("/batch-edit", response_model=ImageResponse)
async def batch_edit_images(
    db: DbSession,
    prompt: str = Form(...),
    model: str = Form("gpt-image-1"),
    size: str = Form("1024x1024"),
    output_format: str = Form("png"),
    output_compression: Optional[int] = Form(None),
    images: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
    if not images or len(images) == 0:
        raise HTTPException(status_code=400, detail="No images provided")

    source_images = []

    try:
        image_files = []

        for img in images:
            img_data = await img.read()

            source_image = await image_service.upload_source_image_to_gcs(
                image_data=img_data,
                original_filename=img.filename,
                user_id=current_user.id,
                db=db,
            )
            source_images.append(source_image)

            img_file = io.BytesIO(img_data)
            img_file.name = img.filename
            image_files.append(img_file)

        params = prepare_openai_params(
            model=model,
            prompt=prompt,
            size=size,
            output_format=output_format,
            output_compression=output_compression,
        )

        try:
            response = image_service.client.images.edit(image=image_files, **params)
            result = response.data[0]
            image_content = base64.b64decode(result.b64_json)

            result = await image_service.process_and_store_image(
                image_content=image_content,
                output_format=output_format,
                user_id=current_user.id,
                prompt=prompt,
                model=model,
                db=db,
                source_images=source_images,
            )

            return ImageResponse(**result)

        except OpenAIError as e:
            for source_image in source_images:
                await image_service.delete_image_from_gcs(source_image, db)

            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    except Exception as e:
        for source_image in source_images:
            await image_service.delete_image_from_gcs(source_image, db)

        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e


@router.get("/history", response_model=ImageHistoryPaginatedResponse)
async def get_image_history(
    db: DbSession,
    page: int = Query(1, ge=1, description="Số trang"),
    size: int = Query(10, ge=1, le=100, description="Kích thước trang"),
    current_user: User = Depends(get_current_user),
):
    try:
        images, total = await ImageHistoryService.get_user_image_history(
            db=db, user_id=current_user.id, page=page, size=size, is_source=False
        )

        result = ImageHistoryService.format_image_history_response(
            images=images, total=total, page=page, size=size
        )

        return result

    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e


@router.post("/edit-from-url", response_model=ImageResponse)
async def edit_image_from_url(
    db: DbSession,
    prompt: str = Form(...),
    model: str = Form("gpt-image-1"),
    size: str = Form("1024x1024"),
    output_format: str = Form("png"),
    output_compression: Optional[int] = Form(None),
    image_url: str = Form(...),  # URL từ Google Cloud Storage
    mask_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    source_image_record = None
    mask_source_image = None

    try:
        url_parts = image_url.split("/")
        bucket_name = url_parts[3]
        gcs_filename = "/".join(url_parts[4:])
        original_filename = url_parts[-1]
        image_format = original_filename.split(".")[-1].lower()

        source_image_record = Image(
            user_id=current_user.id,
            gcs_bucket=bucket_name,
            gcs_filename=gcs_filename,
            gcs_public_url=image_url,
            original_filename=original_filename,
            content_type=f"image/{image_format}",
            size_bytes=0,
            format=image_format,
            is_source=True,
        )

        db.add(source_image_record)
        await db.flush()

        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Không thể tải ảnh từ URL: {response.status}",
                    )
                image_data = await response.read()

        source_image_record.size_bytes = len(image_data)
        image_file = io.BytesIO(image_data)
        image_file.name = original_filename

        mask_file_io = None
        if mask_file:
            mask_data = await mask_file.read()
            mask_filename = f"mask_{uuid.uuid4()}.png"

            mask_source_image = await image_service.upload_source_image_to_gcs(
                image_data=mask_data,
                original_filename=mask_filename,
                user_id=current_user.id,
                db=db,
            )

            mask_file_io = io.BytesIO(mask_data)
            mask_file_io.name = mask_filename

        params = prepare_openai_params(
            model=model,
            prompt=prompt,
            size=size,
            output_format=output_format,
            output_compression=output_compression,
        )

        try:
            result = await image_service.edit_image(
                image_file=image_file, mask_file=mask_file_io, params=params
            )
            image_content = base64.b64decode(result.b64_json)

            source_images = [source_image_record]
            if mask_source_image:
                source_images.append(mask_source_image)

            await db.commit()

            result = await image_service.process_and_store_image(
                image_content=image_content,
                output_format=output_format,
                user_id=current_user.id,
                prompt=prompt,
                model=model,
                db=db,
                source_images=source_images,
            )

            return ImageResponse(**result)

        except OpenAIError as e:
            if source_image_record and source_image_record.id:
                await db.delete(source_image_record)
            if mask_source_image:
                await image_service.delete_image_from_gcs(mask_source_image, db)

            await db.commit()
            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    except Exception as e:
        if source_image_record and source_image_record.id:
            await db.delete(source_image_record)
        if mask_source_image:
            await image_service.delete_image_from_gcs(mask_source_image, db)

        await db.commit()

        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

        raise e


@router.delete("/history/{image_id}", response_model=dict)
async def delete_image(
    image_id: int,
    db: DbSession,
    current_user: User = Depends(get_current_user),
):
    try:
        result = await ImageHistoryService.delete_image_with_sources(
            db=db,
            image_storage=image_service.image_storage,
            image_id=image_id,
            user_id=current_user.id,
        )
        return result
    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e
