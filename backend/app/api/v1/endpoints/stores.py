from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_current_admin
from app.schemas.store import StoreCreate, StoreResponse, StoreApproval
from app.services.store import StoreService
from app.models.user import User
from uuid import UUID
from typing import List

router = APIRouter()

@router.post("/apply", response_model=dict)
def apply_for_store(
    store_in: StoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Submits a new store application for review."""
    try:
        store = StoreService(db).apply_for_store(current_user.id, store_in)
        return {
            "success": True,
            "data": StoreResponse.model_validate(store)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/my-store", response_model=dict)
def get_my_store_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Gets the store profile belonging to the authenticated user, if any."""
    store = StoreService(db).store_repo.get_by_user_id(current_user.id)
    if not store:
        return {
            "success": True,
            "data": None
        }
    return {
        "success": True,
        "data": StoreResponse.model_validate(store)
    }

@router.get("/admin/applications", response_model=dict)
def list_store_applications(
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
) -> dict:
    """Lists store profiles in the system (for admin review)."""
    stores = StoreService(db).store_repo.get_multi(is_active=is_active, skip=skip, limit=limit)
    return {
        "success": True,
        "data": [StoreResponse.model_validate(s) for s in stores]
    }

@router.put("/admin/{store_id}/approve", response_model=dict)
def approve_store_profile(
    store_id: UUID,
    approval: StoreApproval,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
) -> dict:
    """Approves and activates a store profile, upgrading the owner's role to VENDOR."""
    try:
        store = StoreService(db).approve_store(store_id, approval.is_active)
        return {
            "success": True,
            "data": StoreResponse.model_validate(store)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
