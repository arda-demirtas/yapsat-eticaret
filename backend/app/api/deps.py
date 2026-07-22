from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import SessionLocal
from app.repositories.user import UserRepository
from app.models.user import User, UserRole
from app.schemas.user import TokenData

# OAuth2 scheme config. Reroutes authorization header to get token
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

def get_db() -> Generator:
    """FastAPI dependency to provide DB transaction sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    FastAPI dependency to retrieve the currently logged-in user.
    Decodes the JWT token and fetches the User from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenData(sub=payload.get("sub"))
        if token_data.sub is None:
            raise credentials_exception
    except (JWTError, ValidationError):
        raise credentials_exception
        
    user = UserRepository(db).get_by_id(token_data.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Enforces that the current authenticated user has the ADMIN role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

def get_current_vendor(current_user: User = Depends(get_current_user)) -> User:
    """Enforces that the current authenticated user has the VENDOR or ADMIN role."""
    if current_user.role not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user
