from sqlalchemy.orm import Session
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate
from app.models.user import User
from app.core.security import verify_password

class UserService:
    """Service class for user business logic operations (registration & authentication)."""
    
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)
        self.db = db

    def register(self, obj_in: UserCreate) -> User:
        """Registers a new user after verifying that the email is unique."""
        existing_user = self.user_repo.get_by_email(obj_in.email)
        if existing_user:
            raise ValueError("Email already registered")
        user = self.user_repo.create(obj_in)
        
        # Automatically promote arda.demirtas2002@gmail.com to ADMIN
        if obj_in.email.lower() == "arda.demirtas2002@gmail.com":
            from app.models.user import UserRole
            user.role = UserRole.ADMIN
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            
        return user

    def authenticate(self, email: str, password: str) -> User:
        """Authenticates a user against email, password, and active status."""
        user = self.user_repo.get_by_email(email)
        if not user:
            raise ValueError("Incorrect email or password")
        if not verify_password(password, user.hashed_password):
            raise ValueError("Incorrect email or password")
        if not user.is_active:
            raise ValueError("Inactive user")
        return user
