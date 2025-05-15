import aiohttp
import fal_client
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class KlingService:
    """Service to interact with Kling 2.0 Master API"""

    MODEL_ENDPOINT = "fal-ai/kling-video/v2/master/image-to-video"

    @staticmethod
    async def generate_video(
        prompt: str,
        image_url: str,
        duration: str = "5",
        aspect_ratio: str = "16:9",
        negative_prompt: str = "blur, distort, and low quality",
        cfg_scale: float = 0.5,
    ) -> dict:
        try:
            arguments = {
                "prompt": prompt,
                "image_url": image_url,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "negative_prompt": negative_prompt,
                "cfg_scale": cfg_scale,
            }

            handler = await fal_client.submit_async(
                KlingService.MODEL_ENDPOINT, arguments=arguments
            )

            return {"request_id": handler.request_id, "status": "submitted"}
        except Exception as e:
            logger.error(f"Error submitting request to Kling API: {str(e)}")
            raise

    @staticmethod
    async def check_status(request_id: str) -> Dict[str, Any]:
        """
        Check the status of a video generation request

        Args:
            request_id: The ID of the request to check

        Returns:
            Dictionary containing status and other information
        """
        try:
            status = await fal_client.status_async(
                KlingService.MODEL_ENDPOINT, request_id, with_logs=True
            )

            return status
        except Exception as e:
            logger.error(f"Error checking status for request {request_id}: {str(e)}")
            raise

    @staticmethod
    async def get_result(request_id: str) -> Dict[str, Any]:
        try:
            result = await fal_client.result_async(
                KlingService.MODEL_ENDPOINT, request_id
            )

            return result
        except Exception as e:
            logger.error(f"Error getting result for request {request_id}: {str(e)}")
            raise

    @staticmethod
    async def download_video(video_url: str) -> bytes:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(video_url) as response:
                    if response.status != 200:
                        raise Exception(f"Failed to download video: {response.status}")

                    return await response.read()
        except Exception as e:
            logger.error(f"Error downloading video from {video_url}: {str(e)}")
            raise
