import uuid
from api.v1.schemas.video import (
    GenerateVideoRequest,
    GenerationLeonardoResponse,
    VideoGenerationRequest,
    VideoResponse,
)
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Depends, UploadFile
import fal_client
import httpx
from core.config import settings


router = APIRouter()

request_states = {}

# SAMPLE_VIDEO_URLS = [
#     "https://v3.fal.media/files/lion/DDHlO3zS6d9QvQTZqC6L0_output.mp4",
#     "https://v3.fal.media/files/kangaroo/IkMxgPpvf3jZ5UKfrlnEY_output.mp4",
#     "https://v3.fal.media/files/zebra/vvzj5u7wv9wk06GA4zTJX_output.mp4",
#     "https://v3.fal.media/files/rabbit/s2UBvHIiFlX0mw7i4TIWp_output.mp4",
# ]


@router.post("/video", response_model=VideoResponse, status_code=202)
async def generate_video(
    request: GenerateVideoRequest, background_tasks: BackgroundTasks
):
    request_id = str(uuid.uuid4())
    request_states[request_id] = {"status": "pending"}

    background_tasks.add_task(process_video_request, request, request_id)

    return VideoResponse(request_id=request_id, status="pending")


# async def fake_process_video_request(request, request_id: str):
#     request_states[request_id]["status"] = "processing"

#     processing_time = random.uniform(3, 20)
#     await asyncio.sleep(processing_time)

#     if random.random() < 0.95:
#         video_url = random.choice(SAMPLE_VIDEO_URLS)
#         request_states[request_id] = {
#             "status": "completed",
#             "video_url": video_url,
#             "params": request_states[request_id].get("params", {}),
#         }
#     else:
#         error_messages = [
#             "Network error during processing",
#             "Invalid image format",
#             "Server overloaded",
#             "Processing timeout",
#         ]
#         request_states[request_id] = {
#             "status": "failed",
#             "error": random.choice(error_messages),
#         }


async def process_video_request(request: GenerateVideoRequest, request_id: str):
    try:
        handler = await fal_client.submit_async(
            "fal-ai/kling-video/v2/master/image-to-video",
            arguments={
                "prompt": request.prompt,
                "image_url": str(request.image_url),
                "duration": request.duration,
                "aspect_ratio": request.aspect_ratio,
                "negative_prompt": request.negative_prompt,
                "cfg_scale": request.cfg_scale,
            },
        )

        request_states[request_id]["status"] = "processing"
        result = await handler.get()

        if "video" in result and "url" in result["video"]:
            request_states[request_id] = {
                "status": "completed",
                "video_url": result["video"]["url"],
            }
        else:
            request_states[request_id] = {
                "status": "failed",
                "error": "No video URL in response",
            }
    except Exception as e:
        request_states[request_id] = {"status": "failed", "error": str(e)}


@router.get("/status/{request_id}", response_model=VideoResponse)
async def check_status(request_id: str):
    if request_id not in request_states:
        raise HTTPException(status_code=404, detail="Request not found")

    state = request_states[request_id]
    response = VideoResponse(request_id=request_id, status=state["status"])

    if state["status"] == "completed" and "video_url" in state:
        response.video_url = state["video_url"]

    return response


async def call_leonardo_api(
    client: httpx.AsyncClient,
    endpoint: str,
    method: str = "GET",
    payload: dict = None,
    files: dict = None,
):
    url = f"{settings.LEONARDO_API_URL}/{endpoint}"
    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {settings.LEONARDO_API_KEY}",
    }

    try:
        if method == "GET":
            response = await client.get(url, headers=headers)
        elif method == "POST":
            if files:
                form_data = {}
                if payload:
                    for key, value in payload.items():
                        form_data[key] = value

                response = await client.post(
                    url, headers=headers, files=files, data=form_data
                )
            else:
                headers["content-type"] = "application/json"
                response = await client.post(url, headers=headers, json=payload)
        else:
            raise ValueError(f"Unsupported method: {method}")

        return response
    except Exception as e:
        error_msg = f"Error calling Leonardo API: {str(e)}"
        return {"error": error_msg, "status_code": 500}


async def get_http_client():
    async with httpx.AsyncClient(timeout=60.0) as client:
        yield client


@router.post("/text-to-video", response_model=GenerationLeonardoResponse)
async def generate_text_to_video(
    request: VideoGenerationRequest,
    client: httpx.AsyncClient = Depends(get_http_client),
):
    payload = {
        "height": request.height,
        "width": request.width,
        "prompt": request.prompt,
        "frameInterpolation": request.frame_interpolation,
        "isPublic": False,
        "promptEnhance": request.prompt_enhance,
    }

    if request.style_ids and len(request.style_ids) > 0:
        payload["styleIds"] = request.style_ids

    response = await call_leonardo_api(
        client, "generations-text-to-video", "POST", payload
    )

    if "error" in response:
        if response.get("status_code", 500) == 429:
            raise HTTPException(
                status_code=429, detail="Rate limit exceeded. Please try again later."
            )
        raise HTTPException(
            status_code=response.get("status_code", 500), detail=response["error"]
        )

    generation_id = response.get("motionVideoGenerationJob", {}).get("generationId")

    if not generation_id:
        raise HTTPException(
            status_code=500, detail="Failed to get generation ID from Leonardo.ai"
        )

    return GenerationLeonardoResponse(generation_id=generation_id, status="pending")


@router.get("/leonardo-status/{generation_id}")
async def get_generation_status(
    generation_id: str, client: httpx.AsyncClient = Depends(get_http_client)
):
    endpoint = f"generations/{generation_id}"
    response = await call_leonardo_api(client, endpoint)

    if "error" in response:
        raise HTTPException(
            status_code=response.get("status_code", 500), detail=response["error"]
        )

    generation_status = response.get("generations_by_pk", {}).get("status", "UNKNOWN")

    result = {
        "id": generation_id,
        "status": generation_status,
    }

    if generation_status == "COMPLETE":
        generated_items = response.get("generations_by_pk", {}).get(
            "generated_images", []
        )
        if generated_items:
            result["video_url"] = generated_items[0].get("motionMP4URL")

    elif generation_status == "FAILED":
        result["error"] = "Generation failed"

    return result


@router.post("/upload-to-leonardo", response_model=dict)
async def upload_to_leonardo(
    image: UploadFile = File(...),
    client: httpx.AsyncClient = Depends(get_http_client),
):
    image_bytes = await image.read()
    filename = image.filename
    extension = filename.split(".")[-1] if "." in filename else ""
    payload = {"extension": extension}

    files = {"file": (image.filename, image_bytes, image.content_type)}

    response = await call_leonardo_api(
        client,
        "init-image",
        "POST",
        payload=payload,
        files=files,
    )

    if isinstance(response, dict) and "error" in response:
        raise HTTPException(
            status_code=response.get("status_code", 500), detail=response["error"]
        )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()


# @router.post("/image-to-video", response_model=ImageToVideoResponse)
# async def generate_image_to_video(
#     request: ImageToVideoRequest,
#     leonardo_service: LeonardoService = Depends(get_leonardo_service),
# ):
#     try:
#         result = await leonardo_service.image_to_video_from_url(
#             image_url=str(request.image_url),
#             prompt=request.prompt,
#             frame_interpolation=request.frame_interpolation,
#             is_public=request.is_public,
#             prompt_enhance=request.prompt_enhance,
#         )

#         return ImageToVideoResponse(
#             generation_id=result["generation_id"],
#             status=result["status"],
#             message=result.get("message"),
#             image_id=result.get("image_id"),
#         )

#     except Exception as e:
#         if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 429:
#             raise HTTPException(
#                 status_code=429, detail="Rate limit exceeded. Please try again later."
#             )
#         raise HTTPException(status_code=500, detail=str(e))
