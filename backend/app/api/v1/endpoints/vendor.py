from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_vendor
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.order import OrderResponse
from app.services.store import StoreService
from app.services.product import ProductService
from app.models.user import User
from uuid import UUID
from typing import List

router = APIRouter()

@router.get("/stats")
def get_vendor_dashboard_stats(
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor)
) -> dict:
    """Returns store-specific sales volume, active orders count, and total products list."""
    try:
        stats = StoreService(db).get_vendor_stats(current_vendor.id)
        return {
            "success": True,
            "data": stats
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/products")
def list_vendor_products(
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor)
) -> dict:
    """Lists all products belonging to the authenticated vendor's store."""
    try:
        products = StoreService(db).get_vendor_products(current_vendor.id)
        return {
            "success": True,
            "data": [ProductResponse.model_validate(p) for p in products]
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/products")
def create_vendor_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor)
) -> dict:
    """Allows vendors to add products, automatically linking them to their store."""
    store = StoreService(db).store_repo.get_by_user_id(current_vendor.id)
    if not store or not store.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aktif bir mağaza profiliniz bulunmuyor. Ürün ekleyemezsiniz."
        )
    
    try:
        product = ProductService(db).create_product(product_in, store_id=store.id)
        return {
            "success": True,
            "data": ProductResponse.model_validate(product)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/products/{product_id}")
def update_vendor_product(
    product_id: UUID,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor)
) -> dict:
    """Allows vendors to edit their own products, enforcing ownership verification."""
    store = StoreService(db).store_repo.get_by_user_id(current_vendor.id)
    if not store:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mağaza bulunamadı.")

    product = ProductService(db).product_repo.get_by_id(product_id)
    if not product or product.store_id != store.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu ürünü güncelleme yetkiniz bulunmuyor.")

    try:
        updated = ProductService(db).update_product(product_id, product_in)
        return {
            "success": True,
            "data": ProductResponse.model_validate(updated)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/products/{product_id}")
def delete_vendor_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor)
) -> dict:
    """Soft-deletes a product, verifying vendor ownership first."""
    store = StoreService(db).store_repo.get_by_user_id(current_vendor.id)
    if not store:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mağaza bulunamadı.")

    product = ProductService(db).product_repo.get_by_id(product_id)
    if not product or product.store_id != store.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu ürünü silme yetkiniz bulunmuyor.")

    ProductService(db).product_repo.remove(product)
    return {
        "success": True,
        "message": "Ürün başarıyla silindi."
    }

@router.get("/orders")
def list_vendor_orders(
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor)
) -> dict:
    """Lists orders containing this vendor's products, filtering items to show only their products."""
    store = StoreService(db).store_repo.get_by_user_id(current_vendor.id)
    if not store or not store.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aktif mağaza bulunamadı.")

    orders = StoreService(db).get_vendor_orders(current_vendor.id)
    
    result = []
    for o in orders:
        order_dict = OrderResponse.model_validate(o).model_dump()
        # Filter items to only show vendor's products
        order_dict["items"] = [item for item in order_dict["items"] if item["product"]["store_id"] == store.id]
        result.append(order_dict)

    return {
        "success": True,
        "data": result
    }

from fastapi import UploadFile, File
from app.services.cloudinary import CloudinaryService
from app.schemas.product import ProductImageResponse

@router.post("/products/{product_id}/images")
def upload_vendor_product_image(
    product_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor)
) -> dict:
    """Allows vendors to upload images to their own products."""
    store = StoreService(db).store_repo.get_by_user_id(current_vendor.id)
    if not store:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mağaza bulunamadı.")

    product = ProductService(db).product_repo.get_by_id(product_id)
    if not product or product.store_id != store.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu ürüne görsel yükleme yetkiniz bulunmuyor.")

    try:
        upload_result = CloudinaryService.upload_image(file)
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/products/images/{image_id}")
def delete_vendor_product_image(
    image_id: UUID,
    db: Session = Depends(get_db),
    current_vendor: User = Depends(get_current_vendor)
) -> dict:
    """Allows vendors to delete images from their own products."""
    store = StoreService(db).store_repo.get_by_user_id(current_vendor.id)
    if not store:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mağaza bulunamadı.")

    db_image = ProductService(db).get_image_by_id(image_id)
    if not db_image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Görsel bulunamadı.")

    product = ProductService(db).product_repo.get_by_id(db_image.product_id)
    if not product or product.store_id != store.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu görseli silme yetkiniz bulunmuyor.")

    try:
        removed_image = ProductService(db).delete_product_image(image_id)
        if removed_image.public_id:
            CloudinaryService.delete_image(removed_image.public_id)
        return {
            "success": True,
            "data": {"message": "Görsel başarıyla silindi."}
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
