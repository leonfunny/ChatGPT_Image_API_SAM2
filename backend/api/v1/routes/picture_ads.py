from api.v1.schemas.base import GeneralModel


from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI

from core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

router = APIRouter()


class PromptInput(GeneralModel):
    prompt: str


@router.post("/prompt-generating", response_model=dict)
async def generate_prompt(payload: PromptInput):
    try:
        response = await client.responses.create(
            model="gpt-4.1",
            input=payload.prompt,
        )

        response_dict = {
            "id": response.id,
            "created_at": response.created_at,
            "model": response.model,
            "content": response.output[0].content[0].text
            if response.output and response.output[0].content
            else "",
            "status": response.status,
        }

        return response_dict

    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        raise e
