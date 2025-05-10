from fastapi import HTTPException
import fal_client


async def process_image_with_sam(
    image_url: str, prompts=None, box_prompts=None, output_format="png"
):
    try:
        request_payload = {"image_url": image_url, "output_format": output_format}
        if prompts:
            request_payload["prompts"] = prompts

        if box_prompts:
            request_payload["box_prompts"] = box_prompts

        result = await fal_client.submit_async("fal-ai/sam2/image", request_payload)

        final_result = await result.get()

        return final_result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Lỗi khi xử lý ảnh với SAM2: {str(e)}"
        )
