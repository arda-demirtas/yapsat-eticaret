from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.category import CategoryService
from uuid import UUID
from typing import Any
import json
from app.core.redis import get_cache, set_cache

router = APIRouter()

@router.get("/")
def list_categories(db: Session = Depends(get_db)) -> dict:
    """Lists all active product categories."""
    cache_key = "categories:all"
    cached_data = get_cache(cache_key)
    if cached_data:
        try:
            return {
                "success": True,
                "data": json.loads(cached_data)
            }
        except Exception:
            pass

    categories = CategoryService(db).get_categories()
    serialized_categories = [CategoryResponse.model_validate(cat).model_dump(mode="json") for cat in categories]
    
    # Cache categories for 1 hour (3600 seconds) since they change rarely
    set_cache(cache_key, json.dumps(serialized_categories), expire=3600)

    return {
        "success": True,
        "data": serialized_categories
    }

@router.get("/{category_id}")
def read_category(category_id: UUID, db: Session = Depends(get_db)) -> dict:
    """Gets details for a single category by ID."""
    try:
        category = CategoryService(db).get_category_by_id(category_id)
        return {
            "success": True,
            "data": CategoryResponse.model_validate(category)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.post("/")
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Creates a new category. Restricted to Administrators."""
    try:
        category = CategoryService(db).create_category(category_in)
        return {
            "success": True,
            "data": CategoryResponse.model_validate(category)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{category_id}")
def update_category(
    category_id: UUID,
    category_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Updates category name or slug. Restricted to Administrators."""
    try:
        category = CategoryService(db).update_category(category_id, category_in)
        return {
            "success": True,
            "data": CategoryResponse.model_validate(category)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{category_id}")
def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin)
) -> dict:
    """Soft-deletes a category. Restricted to Administrators."""
    try:
        CategoryService(db).delete_category(category_id)
        return {
            "success": True,
            "data": {"message": "Category deleted successfully"}
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
