import json
import httpx
import tempfile
import os
from typing import Dict, Any


class LeonardoService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://cloud.leonardo.ai/api/rest/v1"
        self.headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Bearer {self.api_key}",
        }

    async def download_image_from_gcs(self, gcs_url: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.get(gcs_url)
            if response.status_code != 200:
                raise Exception(
                    f"Failed to download image from GCS. Status: {response.status_code}"
                )

            file_extension = gcs_url.split(".")[-1] if "." in gcs_url else "jpg"
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, suffix=f".{file_extension}"
            )
            temp_file_path = temp_file.name

            with open(temp_file_path, "wb") as f:
                f.write(response.content)

            return temp_file_path

    async def get_presigned_url(self, extension: str = "jpg") -> Dict[str, Any]:
        url = f"{self.base_url}/init-image"
        payload = {"extension": extension}

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=self.headers)
            if response.status_code != 200:
                raise Exception(
                    f"Failed to get presigned URL. Status: {response.status_code}, Response: {response.text}"
                )

            return response.json()

    async def upload_image_to_presigned_url(
        self, presigned_url: str, fields: Dict[str, str], file_path: str
    ) -> int:
        files = {"file": open(file_path, "rb")}

        async with httpx.AsyncClient() as client:
            response = await client.post(presigned_url, data=fields, files=files)
            return response.status_code

    async def create_universal_upscaler(self, params: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/variations/universal-upscaler"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=params, headers=self.headers)
            if response.status_code != 200:
                raise Exception(
                    f"Failed to create upscale. Status: {response.status_code}, Response: {response.text}"
                )

            return response.json()

    async def get_variation(self, variation_id: str) -> Dict[str, Any]:
        url = f"{self.base_url}/variations/{variation_id}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            if response.status_code != 200:
                raise Exception(
                    f"Failed to get variation. Status: {response.status_code}, Response: {response.text}"
                )

            return response.json()

    async def upscale_from_gcs(
        self, gcs_url: str, upscale_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            temp_file_path = await self.download_image_from_gcs(gcs_url)
            try:
                file_extension = os.path.basename(temp_file_path).split(".")[-1]
                init_image_result = await self.get_presigned_url(
                    extension=file_extension
                )
                presigned_url = init_image_result["uploadInitImage"]["url"]
                fields = json.loads(init_image_result["uploadInitImage"]["fields"])
                image_id = init_image_result["uploadInitImage"]["id"]
                status_code = await self.upload_image_to_presigned_url(
                    presigned_url=presigned_url, fields=fields, file_path=temp_file_path
                )

                if status_code != 204:
                    raise Exception(
                        f"Failed to upload image to Leonardo. Status: {status_code}"
                    )

                upscale_params["initImageId"] = image_id
                upscale_result = await self.create_universal_upscaler(upscale_params)

                variation_id = upscale_result["universalUpscaler"]["id"]

                return {
                    "status": "PENDING",
                    "message": "Upscale process initiated successfully",
                    "variation_id": variation_id,
                    "init_image_id": image_id,
                }
            finally:
                try:
                    os.unlink(temp_file_path)
                except Exception as e:
                    print(
                        f"Warning: Failed to delete temporary file {temp_file_path}: {str(e)}"
                    )

        except Exception as e:
            raise Exception(f"Error in upscale_from_gcs: {str(e)}")
