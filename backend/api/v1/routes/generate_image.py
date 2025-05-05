import io
from typing import Optional, List
from api.v1.schemas.generate_image import GenerateImageRequest, ImageResponse, BatchEditImageResponse
from fastapi import APIRouter, Depends, File, Form, UploadFile, status, HTTPException
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
            "quality": data.quality,
            "n": 1,
        }
        
        if data.background != "auto":
            params["background"] = data.background
        
        if data.output_format != "png":
            params["format"] = data.output_format
            
        # Add compression for supported formats
        if data.output_compression is not None and data.output_format in ["jpeg", "webp"]:
            params["output_compression"] = data.output_compression
        
        
        # Call OpenAI API using the client library
        response = client.images.generate(**params)
        
        # Extract base64 image data from the response
        image_data = response.data[0].b64_json
        
        return ImageResponse(
            image_data=image_data,
            format=data.output_format
        )
        
    except OpenAIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@router.post("/edit", response_model=ImageResponse)
async def edit_image(
    prompt: str = Form(...),
    model: str = Form("dall-e-2"),
    size: str = Form("1024x1024"),
    output_format: str = Form("png"),
    output_compression: Optional[int] = Form(None),
    image: UploadFile = File(...),
    mask: Optional[UploadFile] = File(None)
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    try:
        # Map frontend model names to API model names
        model_mapping = {
            "gpt-image-1": "dall-e-3",  # Default to DALL-E 3
            "dall-e-2": "dall-e-2",
            "dall-e-3": "dall-e-3"
        }
        
        # Get the correct model name
        api_model = model_mapping.get(model, "dall-e-2")
        
        # Read image and mask files
        image_data = await image.read()
        
        # Create BytesIO with proper MIME type based on file extension
        image_mime_type = f"image/{image.filename.split('.')[-1].lower()}"
        # Fallback to png if extension is not recognized
        if image_mime_type not in ["image/jpeg", "image/png", "image/webp"]:
            image_mime_type = "image/png"
            
        # Create file-like object with explicit MIME type
        image_file = io.BytesIO(image_data)
        image_file.name = image.filename  # Set filename to help determine MIME type
        
        params = {
            "model": api_model,
            "prompt": prompt,
            "n": 1,
            "size": size,
        }
        
        # Handle output format
        if output_format != "png":
            params["format"] = output_format
            
        # Add compression for supported formats
        if output_compression is not None and output_format in ["jpeg", "webp"]:
            params["output_compression"] = output_compression
        
        # Determine if it's a regular edit or inpainting based on mask presence
        if mask:
            # Inpainting with mask
            mask_data = await mask.read()
            mask_file = io.BytesIO(mask_data)
            mask_file.name = mask.filename  # Set filename to help determine MIME type
            
            # Call OpenAI API for inpainting with explicit MIME type
            response = client.images.edit(
                image=image_file,
                mask=mask_file,
                **params
            )
        else:
            # Regular image edit without mask
            response = client.images.edit(
                image=image_file,
                **params
            )
        
        # Extract base64 image data from the response
        if hasattr(response.data[0], 'b64_json'):
            result_image_data = response.data[0].b64_json
        elif hasattr(response.data[0], 'url'):
            raise HTTPException(
                status_code=500,
                detail="Received URL instead of base64 data"
            )
        
        return ImageResponse(
            image_data=result_image_data,
            format=output_format
        )
        
    except OpenAIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@router.post("/batch-edit", response_model=BatchEditImageResponse)
async def batch_edit_images(
    prompt: str = Form(...),
    model: str = Form("gpt-image-1"),
    size: str = Form("1024x1024"),
    output_format: str = Form("png"),
    output_compression: Optional[int] = Form(None),
    images: List[UploadFile] = File(...)
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
        
        # Handle output format
        if output_format != "png":
            params["format"] = output_format
            
        # Add compression for supported formats
        if output_compression is not None and output_format in ["jpeg", "webp"]:
            params["output_compression"] = output_compression
        
        # Call OpenAI API for batch editing
        response = client.images.edit(
            image=image_files,
            **params
        )
        
        # Process the results
        results = []
        for item in response.data:
            if hasattr(item, 'b64_json'):
                results.append({
                    "image_data": item.b64_json,
                    "format": output_format
                })
            elif hasattr(item, 'url'):
                raise HTTPException(
                    status_code=500,
                    detail="Received URL instead of base64 data"
                )
        
        return BatchEditImageResponse(results=results)
        
    except OpenAIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )