from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.services.user import UserService
from app.core.security import create_access_token
from app.models.user import User
from app.core.limiter import limiter

router = APIRouter()

@router.post("/register")
@limiter.limit("5/minute")
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)) -> dict:
    """Registers a new customer user and returns the profile details."""
    try:
        user = UserService(db).register(user_in)
        return {
            "success": True,
            "data": UserResponse.model_validate(user)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, login_in: UserLogin, db: Session = Depends(get_db)) -> dict:
    """Authenticates the user and returns a JWT access token along with user profile."""
    try:
        user = UserService(db).authenticate(
            email=login_in.email,
            password=login_in.password
        )
        access_token = create_access_token(subject=user.id)
        return {
            "success": True,
            "data": {
                "access_token": access_token,
                "token_type": "bearer",
                "user": UserResponse.model_validate(user)
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/me")
def read_current_user(current_user: User = Depends(get_current_user)) -> dict:
    """Returns the profile details of the currently logged-in user."""
    return {
        "success": True,
        "data": UserResponse.model_validate(current_user)
    }
