from sqlalchemy.orm import Session
from app.models.address import Address
from app.schemas.address import AddressCreate, AddressUpdate
from typing import List, Any
from datetime import datetime

class AddressRepository:
    """Repository class for DB queries on Address model."""
    
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, address_id: Any) -> Address | None:
        """Retrieves an active address by its ID."""
        return self.db.query(Address).filter(Address.id == address_id, Address.deleted_at.is_(None)).first()

    def get_multi_by_user(self, user_id: Any) -> List[Address]:
        """Retrieves all active addresses owned by a user, ordered by default first."""
        return self.db.query(Address).filter(
            Address.user_id == user_id,
            Address.deleted_at.is_(None)
        ).order_by(Address.is_default.desc(), Address.created_at.desc()).all()

    def _reset_default_addresses(self, user_id: Any) -> None:
        """Resets the is_default flag to False for all of a user's addresses."""
        self.db.query(Address).filter(
            Address.user_id == user_id,
            Address.deleted_at.is_(None)
        ).update({Address.is_default: False})

    def create(self, user_id: Any, obj_in: AddressCreate) -> Address:
        """Creates an address for a user. Enforces unique default address constraint."""
        existing_addresses = self.get_multi_by_user(user_id)
        is_default = obj_in.is_default
        
        # If it's the first address, make it the default automatically
        if not existing_addresses:
            is_default = True
        elif is_default:
            self._reset_default_addresses(user_id)

        db_obj = Address(
            user_id=user_id,
            title=obj_in.title,
            full_name=obj_in.full_name,
            phone_number=obj_in.phone_number,
            street_address=obj_in.street_address,
            city=obj_in.city,
            state=obj_in.state,
            postal_code=obj_in.postal_code,
            country=obj_in.country,
            is_default=is_default,
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: Address, obj_in: AddressUpdate) -> Address:
        """Updates address fields. Enforces default address constraint if updated."""
        update_data = obj_in.model_dump(exclude_unset=True)
        if "is_default" in update_data and update_data["is_default"] is True:
            self._reset_default_addresses(db_obj.user_id)

        for field, value in update_data.items():
            setattr(db_obj, field, value)

        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def remove(self, db_obj: Address) -> Address:
        """Soft-deletes an address. Assigns a new default address if the deleted one was default."""
        db_obj.deleted_at = datetime.utcnow()
        
        if db_obj.is_default:
            db_obj.is_default = False
            self.db.add(db_obj)
            self.db.flush()  # Apply changes to local session to query remaining correctly
            
            remaining = self.get_multi_by_user(db_obj.user_id)
            if remaining:
                remaining[0].is_default = True
                self.db.add(remaining[0])
                
        self.db.commit()
        return db_obj
