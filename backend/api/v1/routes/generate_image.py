import io
import base64
from typing import Optional, List
from api.v1.schemas.generate_image import (
    GenerateImageRequest,
    ImageResponse,
)
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from openai import OpenAI
from api.v1.services.auth import get_current_user
from api.v1.services.image import ImageService, prepare_openai_params
from core.config import settings
from core.database import DbSession
from models.user import User

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
    image: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    try:
        image_data = await image.read()
        image_file = io.BytesIO(image_data)
        image_file.name = image.filename
        mask_file = None

        if mask:
            mask_data = await mask.read()
            mask_file = io.BytesIO(mask_data)
            mask_file.name = mask.filename

        params = prepare_openai_params(
            model=model,
            prompt=prompt,
            size=size,
            output_format=output_format,
            output_compression=output_compression,
        )
        result = await image_service.edit_image(
            image_file=image_file, mask_file=mask_file, params=params
        )
        image_content = base64.b64decode(result.b64_json)
        result = await image_service.process_and_store_image(
            image_content=image_content,
            output_format=output_format,
            user_id=current_user.id,
            prompt=prompt,
            model=model,
            db=db,
        )

        return ImageResponse(**result)

    except Exception as e:
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

    try:
        image_files = []
        for img in images:
            img_data = await img.read()
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
        )

        return ImageResponse(**result)

    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e
