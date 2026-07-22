from sqlalchemy.orm import Session
from app.models.store import Store
from typing import List, Any

class StoreRepository:
    """Repository class for DB queries on Store model."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, store_id: Any) -> Store | None:
        """Retrieves a store by its ID."""
        return self.db.query(Store).filter(Store.id == store_id).first()

    def get_by_user_id(self, user_id: Any) -> Store | None:
        """Retrieves a store by its owner's user ID."""
        return self.db.query(Store).filter(Store.user_id == user_id).first()

    def get_by_slug(self, slug: str) -> Store | None:
        """Retrieves a store by its unique URL slug."""
        return self.db.query(Store).filter(Store.slug == slug).first()

    def get_multi(self, *, is_active: bool | None = None, skip: int = 0, limit: int = 100) -> List[Store]:
        """Lists stores, supporting active filters and pagination."""
        query = self.db.query(Store)
        if is_active is not None:
            query = query.filter(Store.is_active == is_active)
        return query.order_by(Store.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, *, user_id: Any, name: str, slug: str, description: str | None = None, logo_url: str | None = None) -> Store:
        """Creates a new Store record in inactive status."""
        db_obj = Store(
            user_id=user_id,
            name=name,
            slug=slug,
            description=description,
            logo_url=logo_url,
            is_active=False  # Must be approved by admin
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_active_status(self, store: Store, is_active: bool) -> Store:
        """Updates the active/approved status of a store."""
        store.is_active = is_active
        self.db.add(store)
        self.db.commit()
        self.db.refresh(store)
        return store
