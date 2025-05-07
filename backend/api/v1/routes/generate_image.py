import io
from typing import Optional, List
from api.v1.schemas.generate_image import (
    GenerateImageRequest,
    ImageResponse,
    BatchEditImageResponse,
)
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from openai import OpenAI, OpenAIError
from core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)


router = APIRouter()


@router.post("/", response_model=ImageResponse)
async def generate_image(data: GenerateImageRequest):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        params = {
            "model": data.model,
            "prompt": data.prompt,
            "size": data.size,
            "n": 1,
        }

        if data.model == "dall-e-3" or data.model == "gpt-image-1":
            if data.quality:
                params["quality"] = data.quality

        if data.background != "auto":
            params["background"] = data.background

        if data.output_format != "png":
            params["format"] = data.output_format

        if data.output_compression is not None and data.output_format in [
            "jpeg",
            "webp",
        ]:
            params["output_compression"] = data.output_compression

        response = client.images.generate(**params)

        result = response.data[0]
        return ImageResponse(image_data=result.url, format=data.output_format)

    except OpenAIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.post("/edit", response_model=ImageResponse)
async def edit_image(
    prompt: str = Form(...),
    model: str = Form("dall-e-2"),
    size: str = Form("1024x1024"),
    output_format: str = Form("png"),
    output_compression: Optional[int] = Form(None),
    image: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        image_data = await image.read()
        image_mime_type = f"image/{image.filename.split('.')[-1].lower()}"

        if image_mime_type not in ["image/jpeg", "image/png", "image/webp"]:
            image_mime_type = "image/png"

        image_file = io.BytesIO(image_data)
        image_file.name = image.filename

        params = {
            "model": model,
            "prompt": prompt,
            "n": 1,
            "size": size,
        }

        if output_format != "png":
            params["format"] = output_format

        if output_compression is not None and output_format in ["jpeg", "webp"]:
            params["output_compression"] = output_compression

        if mask:
            mask_data = await mask.read()
            mask_file = io.BytesIO(mask_data)
            mask_file.name = mask.filename

            response = client.images.edit(image=image_file, mask=mask_file, **params)
        else:
            response = client.images.edit(image=image_file, **params)

        if hasattr(response.data[0], "url") and response.data[0].url:
            return ImageResponse(image_data=response.data[0].url, format=output_format)
        else:
            raise HTTPException(
                status_code=500, detail="No image data received from OpenAI API"
            )

    except OpenAIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.post("/batch-edit", response_model=BatchEditImageResponse)
async def batch_edit_images(
    prompt: str = Form(...),
    model: str = Form("gpt-image-1"),
    size: str = Form("1024x1024"),
    output_format: str = Form("png"),
    output_compression: Optional[int] = Form(None),
    images: List[UploadFile] = File(...),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    if not images or len(images) == 0:
        raise HTTPException(status_code=400, detail="No images provided")

    try:
        image_files = []
        for img in images:
            img_data = await img.read()
            img_file = io.BytesIO(img_data)
            img_file.name = img.filename
            image_files.append(img_file)

        params = {
            "model": model,
            "prompt": prompt,
            "n": 1,
            "size": size,
        }

        if output_format != "png":
            params["format"] = output_format

        if output_compression is not None and output_format in ["jpeg", "webp"]:
            params["output_compression"] = output_compression

        response = client.images.edit(image=image_files, **params)

        results = []
        for item in response.data:
            if hasattr(item, "url"):
                results.append({"image_data": item.url, "format": output_format})

        return BatchEditImageResponse(results=results)

    except OpenAIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
