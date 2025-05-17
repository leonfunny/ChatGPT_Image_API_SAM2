from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
import httpx
import urllib.parse
import re


router = APIRouter()


@router.get("/")
async def download_file(request: Request, url: str):
    filename = url.split("/")[-1]
    filename = filename.split("?")[0]
    filename = urllib.parse.unquote(filename)
    filename = re.sub(r'[\\/*?:"<>|]', "_", filename)

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Referer": url,
            }

            head_response = await client.head(url, headers=headers)
            content_type = head_response.headers.get(
                "content-type", "application/octet-stream"
            )

            if "image" in content_type.lower():
                media_type = content_type
            else:
                if filename.lower().endswith((".jpg", ".jpeg")):
                    media_type = "image/jpeg"
                elif filename.lower().endswith(".png"):
                    media_type = "image/png"
                elif filename.lower().endswith(".gif"):
                    media_type = "image/gif"
                elif filename.lower().endswith(".pdf"):
                    media_type = "application/pdf"
                else:
                    media_type = "application/octet-stream"

            # Gửi request GET để tải file
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            # Trả về response dạng stream với header tải xuống
            return StreamingResponse(
                content=response.iter_bytes(),
                media_type=media_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )
    except httpx.HTTPStatusError as e:
        status_code = e.response.status_code
        raise HTTPException(
            status_code=status_code, detail=f"Lỗi HTTP {status_code}: {str(e)}"
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Lỗi kết nối: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi không xác định: {str(e)}")
