import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.api.deps import get_db
from app.db.base import Base
from app.models.user import User
from app.models.address import Address
from app.models.category import Category
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.cart import CartItem
from app.models.coupon import Coupon
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.store import Store

# Use in-memory SQLite for testing to avoid external service dependencies
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    """Provides a clean in-memory database session for test scope."""
    # Create all tables in the SQLite memory database
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        # Drop all tables after tests finish
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db) -> TestClient:
    """Provides a TestClient with overridden get_db dependency pointing to the test DB."""
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    # Inject test database session into FastAPI dependencies
    app.dependency_overrides[get_db] = override_get_db
    
    # Disable rate limiting during test executions
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False

    with TestClient(app) as c:
        yield c
    # Clean up overrides after test module runs
    app.dependency_overrides.clear()
