from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductImageResponse
from app.services.product import ProductService
from app.services.cloudinary import CloudinaryService
from uuid import UUID
from typing import Any
import json
from app.core.redis import get_cache, set_cache

router = APIRouter()

@router.get("/")
def list_products(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    category_id: UUID | None = None,
    db: Session = Depends(get_db)
) -> dict:
    """Lists active products with paging, brand/name search, and category filters."""
    # Dynamic cache key based on query parameters
    cache_key = f"products:skip={skip}:limit={limit}:search={search or ''}:category_id={category_id or ''}"
    
    cached_data = get_cache(cache_key)
    if cached_data:
        try:
            return {
                "success": True,
                "data": json.loads(cached_data)
            }
        except Exception:
            pass  # Fallback to DB query if JSON parsing fails

    products = ProductService(db).get_products(
        skip=skip,
        limit=limit,
        search=search,
        category_id=category_id
    )
    serialized_products = [ProductResponse.model_validate(p).model_dump(mode="json") for p in products]
    
    # Store in Redis cache for 5 minutes (300 seconds)
    set_cache(cache_key, json.dumps(serialized_products), expire=300)

    return {
        "success": True,
        "data": serialized_products
    }

@router.get("/{product_id}")
def read_product_by_id(product_id: UUID, db: Session = Depends(get_db)) -> dict:
    """Retrieves product details by ID."""
    try:
        product = ProductService(db).get_product_by_id(product_id)
        return {
            "success": True,
            "data": ProductResponse.model_validate(product)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/by-slug/{slug}")
def read_product_by_slug(slug: str, db: Session = Depends(get_db)) -> dict:
    """Retrieves product details by its unique slug."""
    try:
        product = ProductService(db).get_product_by_slug(slug)
        return {
            "success": True,
            "data": ProductResponse.model_validate(product)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.post("/")
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Creates a new product. Restricted to Administrators."""
    try:
        product = ProductService(db).create_product(product_in)
        return {
            "success": True,
            "data": ProductResponse.model_validate(product)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{product_id}")
def update_product(
    product_id: UUID,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Updates product details. Restricted to Administrators."""
    try:
        product = ProductService(db).update_product(product_id, product_in)
        return {
            "success": True,
            "data": ProductResponse.model_validate(product)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{product_id}")
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Soft-deletes a product. Restricted to Administrators."""
    try:
        ProductService(db).delete_product(product_id)
        return {
            "success": True,
            "data": {"message": "Product deleted successfully"}
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{product_id}/images")
def upload_image(
    product_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Uploads a product image (max 10MB, formats: jpg, png, webp). Restricted to Administrators."""
    try:
        # Upload using the Cloudinary helper service
        upload_result = CloudinaryService.upload_image(file)
        
        # Save image record to database
        db_image = ProductService(db).add_product_image(
            product_id=product_id,
            url=upload_result["url"],
            thumbnail_url=upload_result["thumbnail_url"],
            public_id=upload_result["public_id"]
        )
        return {
            "success": True,
            "data": ProductImageResponse.model_validate(db_image)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image upload failed: {str(e)}"
        )

@router.delete("/images/{image_id}")
def delete_image(
    image_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Deletes a product image record and purges it from the CDN/local file system. Restricted to Administrators."""
    try:
        removed_image = ProductService(db).delete_product_image(image_id)
        
        # Clean up asset in CDN / storage fallback
        if removed_image.public_id:
            CloudinaryService.delete_image(removed_image.public_id)
            
        return {
            "success": True,
            "data": {"message": "Image deleted successfully"}
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
