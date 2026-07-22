from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse
from app.services.address import AddressService
from app.models.user import User
from uuid import UUID

router = APIRouter()

@router.get("/")
def list_addresses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Lists all active addresses of the logged-in customer."""
    addresses = AddressService(db).get_user_addresses(current_user.id)
    return {
        "success": True,
        "data": [AddressResponse.model_validate(addr) for addr in addresses]
    }

@router.post("/")
def create_address(
    address_in: AddressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Creates a new address for the logged-in customer."""
    address = AddressService(db).add_address(current_user.id, address_in)
    return {
        "success": True,
        "data": AddressResponse.model_validate(address)
    }

@router.put("/{address_id}")
def update_address(
    address_id: UUID,
    address_in: AddressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Updates an address for the logged-in customer after verifying ownership."""
    try:
        address = AddressService(db).update_address(current_user.id, address_id, address_in)
        return {
            "success": True,
            "data": AddressResponse.model_validate(address)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{address_id}")
def delete_address(
    address_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Soft-deletes an address for the logged-in customer after verifying ownership."""
    try:
        AddressService(db).delete_address(current_user.id, address_id)
        return {
            "success": True,
            "data": {"message": "Address deleted successfully"}
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
