from sqlalchemy.orm import Session
from app.repositories.address import AddressRepository
from app.schemas.address import AddressCreate, AddressUpdate
from app.models.address import Address
from typing import List, Any

class AddressService:
    """Service class for managing Address CRUD business logic and ownership constraints."""
    
    def __init__(self, db: Session):
        self.address_repo = AddressRepository(db)

    def get_user_addresses(self, user_id: Any) -> List[Address]:
        """Gets all active addresses for a user."""
        return self.address_repo.get_multi_by_user(user_id)

    def add_address(self, user_id: Any, obj_in: AddressCreate) -> Address:
        """Adds a new address for a user."""
        return self.address_repo.create(user_id, obj_in)

    def update_address(self, user_id: Any, address_id: Any, obj_in: AddressUpdate) -> Address:
        """Updates an address, verifying first that the user owns it."""
        address = self.address_repo.get_by_id(address_id)
        if not address or address.user_id != user_id:
            raise ValueError("Address not found or unauthorized")
        return self.address_repo.update(address, obj_in)

    def delete_address(self, user_id: Any, address_id: Any) -> Address:
        """Soft-deletes an address, verifying first that the user owns it."""
        address = self.address_repo.get_by_id(address_id)
        if not address or address.user_id != user_id:
            raise ValueError("Address not found or unauthorized")
        return self.address_repo.remove(address)

    def get_address_by_id(self, user_id: Any, address_id: Any) -> Address | None:
        """Retrieves a single active address after verifying user ownership."""
        address = self.address_repo.get_by_id(address_id)
        if not address or address.user_id != user_id:
            return None
        return address
