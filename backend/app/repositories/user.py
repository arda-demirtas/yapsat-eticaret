from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from typing import Any

class UserRepository:
    """Repository class for DB queries on User model."""
    
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: Any) -> User | None:
        """Retrieves an active (non-soft-deleted) user by their ID."""
        import uuid
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                return None
        return self.db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()

    def get_by_email(self, email: str) -> User | None:
        """Retrieves an active user by their email address."""
        return self.db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()

    def create(self, obj_in: UserCreate) -> User:
        """Creates a new User row in the database, hashing the password."""
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: User, obj_in: UserUpdate) -> User:
        """Updates user details in the database."""
        if obj_in.first_name is not None:
            db_obj.first_name = obj_in.first_name
        if obj_in.last_name is not None:
            db_obj.last_name = obj_in.last_name
        if obj_in.password is not None:
            db_obj.hashed_password = get_password_hash(obj_in.password)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def get_total_users_count(self) -> int:
        """Returns the total number of users registered in the system."""
        return self.db.query(User).count()
