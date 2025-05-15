from datetime import datetime, timedelta
import mimetypes
from google.cloud import storage
from fastapi import UploadFile
from typing import List, Optional, Dict
import os
import uuid
import aiohttp
import asyncio


class ImageStorage:
    def __init__(self, bucket_name: str, credentials_path: Optional[str] = None):
        """
        Khởi tạo kết nối đến Google Cloud Storage

        Args:
            bucket_name: Tên của bucket GCS
            credentials_path: Đường dẫn đến file credentials JSON (tùy chọn)
        """
        if credentials_path:
            self.client = storage.Client.from_service_account_json(credentials_path)
        else:
            self.client = storage.Client()

        self.bucket_name = bucket_name
        self.bucket = self.client.bucket(bucket_name)

        # URL cố định không hết hạn
        self.base_url = f"https://storage.googleapis.com/{bucket_name}/"

    async def upload_image(
        self,
        file: UploadFile,
        folder: str = "images_generated",
        custom_filename: Optional[str] = None,
    ) -> Dict:
        """
        Upload ảnh lên Google Cloud Storage

        Args:
            file: File ảnh được upload từ FastAPI
            folder: Thư mục lưu trữ trong bucket
            custom_filename: Tên file tùy chọn (nếu không cung cấp sẽ tạo UUID)

        Returns:
            Dict chứa các URL và thông tin về ảnh đã upload
        """
        if not file.content_type.startswith("image/"):
            raise ValueError("Chỉ cho phép upload file ảnh")

        if custom_filename:
            filename = custom_filename
        else:
            file_extension = (
                os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
            )
            filename = f"{uuid.uuid4()}{file_extension}"

        full_path = f"{folder}/{filename}".lstrip("/")

        blob = self.bucket.blob(full_path)
        content = await file.read()

        blob.upload_from_string(
            content,
            content_type=file.content_type,
        )

        return {
            "filename": filename,
            "path": full_path,
            "size": len(content),
            "content_type": file.content_type,
            "url": f"{self.base_url}{full_path}",
            "public_url": blob.public_url,
        }

    def delete_image(self, image_path: str) -> bool:
        """
        Xóa ảnh từ Google Cloud Storage

        Args:
            image_path: Đường dẫn đến ảnh trong bucket

        Returns:
            True nếu xóa thành công, False nếu không tìm thấy hoặc xóa thất bại
        """
        blob = self.bucket.blob(image_path)
        try:
            blob.delete()
            return True
        except Exception:
            return False

    def make_bucket_public(self) -> bool:
        """
        Thiết lập toàn bộ bucket cho phép đọc công khai
        Chỉ sử dụng khi bạn chắc chắn muốn mọi ảnh đều công khai

        Returns:
            True nếu thành công
        """
        policy = self.bucket.get_iam_policy()
        policy.bindings.append(
            {"role": "roles/storage.objectViewer", "members": ["allUsers"]}
        )
        self.bucket.set_iam_policy(policy)
        return True


class VideoStorage:
    def __init__(self, bucket_name: str, credentials_path: Optional[str] = None):
        if credentials_path:
            self.client = storage.Client.from_service_account_json(credentials_path)
        else:
            self.client = storage.Client()

        self.bucket_name = bucket_name
        self.bucket = self.client.bucket(bucket_name)
        self.base_url = f"https://storage.googleapis.com/{bucket_name}/"

        self.allowed_video_types = [
            "video/mp4",
            "video/mpeg",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-ms-wmv",
            "video/webm",
            "video/ogg",
            "video/3gpp",
        ]

    async def upload_video(
        self,
        file: UploadFile,
        folder: str = "videos_generated",
        custom_filename: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        content_type = file.content_type

        if not content_type or content_type == "application/octet-stream":
            guessed_type = mimetypes.guess_type(file.filename)[0]
            if guessed_type:
                content_type = guessed_type
            else:
                content_type = "video/mp4"

        if content_type not in self.allowed_video_types:
            raise ValueError(
                f"Định dạng video không được hỗ trợ: {content_type}. "
                f"Các định dạng được hỗ trợ: {', '.join(self.allowed_video_types)}"
            )

        if custom_filename:
            filename = custom_filename
        else:
            file_extension = (
                os.path.splitext(file.filename)[1].lower() if file.filename else ".mp4"
            )
            if not file_extension:
                file_extension = self._get_extension_from_content_type(content_type)
            filename = f"{uuid.uuid4()}{file_extension}"

        folder = folder.rstrip("/")
        full_path = f"{folder}/{filename}"

        content = await file.read()

        video_metadata = {
            "content-type": content_type,
            "cache-control": "public, max-age=86400",
            "uploaded-at": datetime.now().isoformat(),
            "original-filename": file.filename,
        }

        if metadata:
            video_metadata.update(metadata)

        blob = self.bucket.blob(full_path)
        blob.metadata = video_metadata

        try:
            blob.upload_from_string(
                content,
                content_type=content_type,
            )
            self.logger.info(
                f"Đã upload video: {full_path}, kích thước: {len(content)} bytes"
            )
        except Exception as e:
            self.logger.error(f"Lỗi khi upload video: {str(e)}")
            raise

        return {
            "filename": filename,
            "path": full_path,
            "size": len(content),
            "content_type": content_type,
            "url": f"{self.base_url}{full_path}",
            "public_url": blob.public_url,
            "metadata": video_metadata,
            "upload_time": datetime.now().isoformat(),
        }

    async def save_video_from_url(
        self,
        video_url: str,
        folder: str = "external_videos",
        custom_filename: Optional[str] = None,
        metadata: Optional[Dict] = None,
        timeout: int = 60,
    ) -> Dict:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(video_url, timeout=timeout) as response:
                    if response.status != 200:
                        error_msg = f"Không thể tải video từ URL: {video_url}, status: {response.status}"
                        self.logger.error(error_msg)
                        raise ValueError(error_msg)

                    content = await response.read()
                    content_type = response.headers.get("content-type")

                    if not content_type or content_type == "application/octet-stream":
                        content_type = mimetypes.guess_type(video_url)[0]

                    if not content_type or content_type not in self.allowed_video_types:
                        content_type = "video/mp4"
        except asyncio.TimeoutError:
            error_msg = f"Timeout khi tải video từ URL: {video_url}"
            self.logger.error(error_msg)
            raise TimeoutError(error_msg)
        except Exception as e:
            error_msg = f"Lỗi khi tải video từ URL {video_url}: {str(e)}"
            self.logger.error(error_msg)
            raise

        if custom_filename:
            filename = custom_filename
        else:
            ext = os.path.splitext(video_url.split("?")[0])[1]
            if not ext:
                ext = self._get_extension_from_content_type(content_type)

            filename = f"{uuid.uuid4()}{ext}"

        folder = folder.rstrip("/")
        full_path = f"{folder}/{filename}"

        video_metadata = {
            "content-type": content_type,
            "cache-control": "public, max-age=86400",
            "source-url": video_url,
            "downloaded-at": datetime.now().isoformat(),
        }

        if metadata:
            video_metadata.update(metadata)

        blob = self.bucket.blob(full_path)
        blob.metadata = video_metadata

        try:
            blob.upload_from_string(
                content,
                content_type=content_type,
            )
            self.logger.info(
                f"Đã lưu video từ URL: {video_url}, kích thước: {len(content)} bytes"
            )
        except Exception as e:
            self.logger.error(f"Lỗi khi lưu video từ URL {video_url}: {str(e)}")
            raise

        return {
            "filename": filename,
            "path": full_path,
            "size": len(content),
            "content_type": content_type,
            "url": f"{self.base_url}{full_path}",
            "public_url": blob.public_url,
            "source_url": video_url,
            "metadata": video_metadata,
            "download_time": datetime.now().isoformat(),
        }

    def delete_video(self, video_path: str) -> bool:
        blob = self.bucket.blob(video_path)
        try:
            blob.delete()
            self.logger.info(f"Đã xóa video: {video_path}")
            return True
        except Exception as e:
            self.logger.error(f"Lỗi khi xóa video {video_path}: {str(e)}")
            return False

    def get_video_info(self, video_path: str) -> Optional[Dict]:
        blob = self.bucket.blob(video_path)
        try:
            if not blob.exists():
                return None

            return {
                "filename": os.path.basename(video_path),
                "path": video_path,
                "size": blob.size,
                "content_type": blob.content_type,
                "url": f"{self.base_url}{video_path}",
                "public_url": blob.public_url,
                "metadata": blob.metadata,
                "updated": blob.updated.isoformat() if blob.updated else None,
                "created": blob.time_created.isoformat() if blob.time_created else None,
            }
        except Exception:
            return None

    def list_videos(
        self,
        folder: Optional[str] = None,
        prefix: Optional[str] = None,
        max_results: int = 100,
    ) -> List[Dict]:
        if folder and not prefix:
            folder = folder.rstrip("/")
            prefix = f"{folder}/"

        blobs = list(
            self.client.list_blobs(
                self.bucket_name, prefix=prefix, max_results=max_results
            )
        )

        videos = []
        for blob in blobs:
            if blob.name.endswith("/"):
                continue

            content_type = blob.content_type
            if not content_type or content_type not in self.allowed_video_types:
                guessed_type = mimetypes.guess_type(blob.name)[0]
                if not guessed_type or guessed_type not in self.allowed_video_types:
                    continue

            videos.append(
                {
                    "filename": os.path.basename(blob.name),
                    "path": blob.name,
                    "size": blob.size,
                    "content_type": blob.content_type,
                    "url": f"{self.base_url}{blob.name}",
                    "public_url": blob.public_url,
                    "updated": blob.updated.isoformat() if blob.updated else None,
                }
            )

        return videos

    def generate_signed_url(
        self, video_path: str, expiration: int = 3600, method: str = "GET"
    ) -> Optional[str]:
        blob = self.bucket.blob(video_path)
        try:
            if not blob.exists():
                return None

            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expiration),
                method=method,
            )
            return url
        except Exception as e:
            self.logger.error(f"Lỗi khi tạo signed URL cho {video_path}: {str(e)}")
            return None

    def _get_extension_from_content_type(self, content_type: str) -> str:
        extension_map = {
            "video/mp4": ".mp4",
            "video/mpeg": ".mpeg",
            "video/quicktime": ".mov",
            "video/x-msvideo": ".avi",
            "video/x-ms-wmv": ".wmv",
            "video/webm": ".webm",
            "video/ogg": ".ogv",
            "video/3gpp": ".3gp",
        }

        return extension_map.get(content_type, ".mp4")
