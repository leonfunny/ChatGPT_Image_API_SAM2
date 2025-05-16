import base64
import io
from typing import List, Optional
import uuid
from api.v1.schemas.base import GeneralModel
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from openai import AsyncOpenAI, OpenAIError

from api.v1.schemas.generate_image import ImageResponse
from api.v1.services.image import ImageService, prepare_openai_params
from api.v1.services.leonardo import LeonardoService
from core.config import settings
from core.google_cloud import ImageStorage

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
router = APIRouter()
image_service = ImageService(
    openai_api_key=settings.OPENAI_API_KEY,
    bucket_name=settings.GCS_BUCKET_NAME,
    credentials_path=settings.GCS_CREDENTIALS_PATH,
)

image_storage = ImageStorage(
    bucket_name=settings.GCS_BUCKET_NAME, credentials_path=settings.GCS_CREDENTIALS_PATH
)


class PromptInput(GeneralModel):
    prompt: str


class UpscaleFromGcsRequest(GeneralModel):
    gcs_url: str
    ultra_upscale_style: str
    creativity_strength: int
    detail_contrast: int
    similarity: int
    upscale_multiplier: float


class UpscaleFromGcsResponse(GeneralModel):
    status: str
    message: str
    variation_id: str
    init_image_id: str


class VariationResponse(GeneralModel):
    id: str
    status: str
    created_at: str
    generated_images: str = ""
    error: Optional[str] = ""


@router.post("/prompt-generating", response_model=dict)
async def generate_prompt_with_files(
    prompt: str = Form(...),
    images: List[UploadFile] = File([]),
):
    try:
        content = [{"type": "text", "text": prompt}]

        for image in images:
            contents = await image.read()
            base64_image = base64.b64encode(contents).decode("utf-8")

            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{image.content_type};base64,{base64_image}"
                    },
                }
            )

        completion = await client.chat.completions.create(
            model="gpt-4.1", messages=[{"role": "user", "content": content}]
        )

        response_dict = {
            "id": completion.id,
            "created_at": completion.created,
            "model": completion.model,
            "content": completion.choices[0].message.content
            if completion.choices
            else "",
        }

        return response_dict

    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e


@router.post("/edit", response_model=ImageResponse)
async def edit_image(
    prompt: str = Form(...),
    model: str = Form("gpt-image-1"),
    size: str = Form("1024x1024"),
    output_format: str = Form("png"),
    output_compression: Optional[int] = Form(None),
    quality: Optional[str] = Form(None),
    image: UploadFile = File(...),
):
    try:
        image_data = await image.read()
        image_file = io.BytesIO(image_data)
        image_file.name = f"image.{image.filename.split('.')[-1]}"

        params = prepare_openai_params(
            model=model,
            prompt=prompt,
            size=size,
            output_format=output_format,
            output_compression=output_compression,
            quality=quality,
        )
        generated_image = await image_service.edit_image(
            image_file=image_file, params=params, mask_file=None
        )
        image_content = base64.b64decode(generated_image.b64_json)

        upload_file = UploadFile(
            file=io.BytesIO(image_content),
            filename=f"{uuid.uuid4()}.{output_format}",
        )
        upload_file.headers = {"content-type": f"image/{output_format}"}

        gcs_info = await image_storage.upload_image(upload_file)
        result = {
            "image_url": gcs_info["url"],
            "format": output_format,
        }

        return ImageResponse(**result)

    except OpenAIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e


@router.post("/edit-merge", response_model=ImageResponse)
async def megre_imanges(
    prompt: str = Form(...),
    model: str = Form("gpt-image-1"),
    size: str = Form("1024x1024"),
    output_format: str = Form("png"),
    output_compression: Optional[int] = Form(None),
    quality: Optional[str] = Form(None),
    images: List[UploadFile] = File(...),
):
    try:
        if not images or len(images) == 0:
            raise HTTPException(status_code=400, detail="No images provided")

        image_files = []
        for image in images:
            image_data = await image.read()
            image_file = io.BytesIO(image_data)
            image_file.name = f"image.{image.filename.split('.')[-1]}"
            image_files.append(image_file)

        params = prepare_openai_params(
            model=model,
            prompt=prompt,
            size=size,
            output_format=output_format,
            output_compression=output_compression,
            quality=quality,
        )

        response = await image_service.client.images.edit(image=image_files, **params)
        result = response.data[0]
        image_content = base64.b64decode(result.b64_json)

        upload_file = UploadFile(
            file=io.BytesIO(image_content),
            filename=f"{uuid.uuid4()}.{output_format}",
        )
        upload_file.headers = {"content-type": f"image/{output_format}"}

        gcs_info = await image_storage.upload_image(upload_file)
        result = {
            "image_url": gcs_info["url"],
            "format": output_format,
        }

        return ImageResponse(**result)

    except OpenAIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e


async def get_leonardo_service():
    return LeonardoService(api_key=settings.LEONARDO_API_KEY)


@router.post("/upscale-from-gcs", response_model=UpscaleFromGcsResponse)
async def upscale_from_gcs(
    request: UpscaleFromGcsRequest,
    leonardo_service: LeonardoService = Depends(get_leonardo_service),
):
    try:
        upscale_params = {
            "ultraUpscaleStyle": request.ultra_upscale_style,
            "creativityStrength": request.creativity_strength,
            "detailContrast": request.detail_contrast,
            "similarity": request.similarity,
            "upscaleMultiplier": request.upscale_multiplier,
        }

        result = await leonardo_service.upscale_from_gcs(
            gcs_url=request.gcs_url, upscale_params=upscale_params
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in upscale flow: {str(e)}")


@router.get("/upscale/variations/{variation_id}", response_model=VariationResponse)
async def get_variation_result(
    variation_id: str, leonardo_service: LeonardoService = Depends(get_leonardo_service)
):
    try:
        result = await leonardo_service.get_variation(variation_id)
        generated_image_variation_generic = result.get(
            "generated_image_variation_generic", {}
        )

        if not generated_image_variation_generic:
            return {
                "id": variation_id,
                "status": "PENDING",
                "created_at": "",
                "generated_images": "",
            }

        variation_data = generated_image_variation_generic[0]
        url = variation_data.get("url", "")

        response = {
            "id": variation_data.get("id", ""),
            "status": variation_data.get("status", "PENDING"),
            "created_at": variation_data.get("createdAt", ""),
            "generated_images": url if isinstance(url, str) else "",
        }

        return response
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting variation: {str(e)}"
        )
