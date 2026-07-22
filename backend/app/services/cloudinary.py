import os
import shutil
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from fastapi import UploadFile
from app.core.config import settings

# Configure Cloudinary if credentials are provided in settings
if all([settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET]):
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

class CloudinaryService:
    """Service to manage product image uploads, format validation, and CDN storage."""
    
    @staticmethod
    def validate_file(file: UploadFile) -> None:
        """Validates that file format is allowed (jpg, png, webp) and is under 10MB."""
        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        _, file_extension = os.path.splitext(file.filename or "")
        
        if file_extension.lower() not in allowed_extensions:
            raise ValueError("Only jpg, png, and webp formats are allowed")
            
        # Determine file size
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)  # Reset pointer to start
        
        max_size = 10 * 1024 * 1024  # 10 MB
        if size > max_size:
            raise ValueError("File size exceeds the 10 MB limit")

    @classmethod
    def upload_image(cls, file: UploadFile) -> dict:
        """
        Uploads the file to Cloudinary and returns CDN URLs and public_id.
        Falls back to local file storage if Cloudinary credentials are not configured.
        """
        cls.validate_file(file)

        # Check if Cloudinary is fully configured
        if all([settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET]):
            try:
                upload_result = cloudinary.uploader.upload(
                    file.file,
                    folder="yapsat/products"
                )
                public_id = upload_result.get("public_id")
                url = upload_result.get("secure_url")
                
                # Generate optimized 200x200 filled square thumbnail
                thumb_url, _ = cloudinary.utils.cloudinary_url(
                    public_id,
                    width=200,
                    height=200,
                    crop="fill",
                    secure=True
                )
                
                return {
                    "url": url,
                    "thumbnail_url": thumb_url,
                    "public_id": public_id
                }
            except Exception as e:
                raise RuntimeError(f"Cloudinary upload failed: {str(e)}")
        else:
            # Fallback to local files storage for local development
            upload_dir = os.path.join("static", "uploads")
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate unique filename to avoid overrides
            import uuid
            _, file_extension = os.path.splitext(file.filename or "")
            unique_filename = f"{uuid.uuid4().hex}{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            local_url = f"{settings.BACKEND_HOST}/static/uploads/{unique_filename}"
            return {
                "url": local_url,
                "thumbnail_url": local_url,
                "public_id": f"local_{unique_filename}"
            }

    @staticmethod
    def delete_image(public_id: str) -> None:
        """Deletes an image from Cloudinary or local file system based on public_id."""
        if not public_id:
            return
            
        if public_id.startswith("local_"):
            filename = public_id.replace("local_", "")
            file_path = os.path.join("static", "uploads", filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        else:
            if all([settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET]):
                try:
                    cloudinary.uploader.destroy(public_id)
                except Exception:
                    pass  # Fail silently on CDN errors during cleanup
