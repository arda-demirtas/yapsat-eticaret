from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.addresses import router as addresses_router
from app.api.v1.endpoints.categories import router as categories_router
from app.api.v1.endpoints.products import router as products_router
from app.api.v1.endpoints.cart import router as cart_router
from app.api.v1.endpoints.coupons import router as coupons_router
from app.api.v1.endpoints.orders import router as orders_router
from app.api.v1.endpoints.payments import router as payments_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.stores import router as stores_router
from app.api.v1.endpoints.vendor import router as vendor_router

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.responses import JSONResponse
import logging
from app.core.limiter import limiter
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger("app")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)
app.state.limiter = limiter

# CORS middleware
cors_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limit Exception Handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Formats rate limit errors to return success=False and user-friendly message."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "success": False,
            "message": "Çok fazla istek gönderdiniz. Lütfen bir süre sonra tekrar deneyin."
        }
    )

# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Formats HTTP exceptions to return success=False and the error message."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats validation errors to join field-specific messages into a clean output."""
    errors = []
    for error in exc.errors():
        loc = " -> ".join(str(x) for x in error["loc"])
        errors.append(f"{loc}: {error['msg']}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "; ".join(errors)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handles unexpected server errors, logging details internally without leaking exception details to the user."""
    logger.exception("Unhandled server error occurred")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An unexpected error occurred. Please try again later."
        }
    )

# Register routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(addresses_router, prefix=f"{settings.API_V1_STR}/addresses", tags=["addresses"])
app.include_router(categories_router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(products_router, prefix=f"{settings.API_V1_STR}/products", tags=["products"])
app.include_router(cart_router, prefix=f"{settings.API_V1_STR}/cart", tags=["cart"])
app.include_router(coupons_router, prefix=f"{settings.API_V1_STR}/coupons", tags=["coupons"])
app.include_router(orders_router, prefix=f"{settings.API_V1_STR}/orders", tags=["orders"])
app.include_router(payments_router, prefix=f"{settings.API_V1_STR}/payments", tags=["payments"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(stores_router, prefix=f"{settings.API_V1_STR}/stores", tags=["stores"])
app.include_router(vendor_router, prefix=f"{settings.API_V1_STR}/vendor", tags=["vendor"])

# Mount static directory for local uploads fallback
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get(f"{settings.API_V1_STR}/health")

def health_check() -> dict:
    """
    API Health check endpoint.
    Returns standard success format.
    """
    return {
        "success": True,
        "data": {
            "status": "healthy"
        }
    }

@app.on_event("startup")
def ensure_default_admin():
    from app.db.session import SessionLocal
    from app.models.user import User, UserRole
    db = SessionLocal()
    try:
        # Promote admin user
        user = db.query(User).filter(User.email == "arda.demirtas2002@gmail.com").first()
        if user and user.role != UserRole.ADMIN:
            user.role = UserRole.ADMIN
            db.add(user)
            db.commit()
            print("Automatically promoted arda.demirtas2002@gmail.com to ADMIN.")

        # Seed categories if they don't exist
        from app.schemas.category import CategoryCreate
        from app.services.category import CategoryService, slugify
        from app.repositories.category import CategoryRepository
        category_service = CategoryService(db)
        category_repo = CategoryRepository(db)
        default_categories = [
            "Elektronik",
            "Ev & Yaşam",
            "Giyim & Aksesuar",
            "Kozmetik & Kişisel Bakım",
            "Spor & Outdoor",
            "Anne & Bebek",
            "Kitap, Müzik & Hobi",
            "Süpermarket & Gıda",
            "Otomotiv & Yapı Market",
            "Pet Shop"
        ]
        for cat_name in default_categories:
            slug = slugify(cat_name)
            existing = category_repo.get_by_slug(slug)
            if not existing:
                category_service.create_category(CategoryCreate(name=cat_name))
        print("Ensured default categories are seeded.")
    finally:
        db.close()
