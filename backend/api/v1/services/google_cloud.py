from google.cloud import storage
from fastapi import UploadFile
from typing import Optional, Dict
import os
import uuid


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
        folder: str = "images",
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
            predefined_acl="publicRead",
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
