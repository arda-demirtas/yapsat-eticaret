from sqlalchemy.orm import Session
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from typing import List, Any
from datetime import datetime

class CategoryRepository:
    """Repository class for DB queries on Category model."""
    
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, category_id: Any) -> Category | None:
        """Retrieves an active category by its ID."""
        return self.db.query(Category).filter(
            Category.id == category_id,
            Category.deleted_at.is_(None)
        ).first()

    def get_by_slug(self, slug: str) -> Category | None:
        """Retrieves an active category by its slug."""
        return self.db.query(Category).filter(
            Category.slug == slug,
            Category.deleted_at.is_(None)
        ).first()

    def get_multi(self) -> List[Category]:
        """Retrieves all active categories."""
        return self.db.query(Category).filter(
            Category.deleted_at.is_(None)
        ).order_by(Category.name.asc()).all()

    def create(self, obj_in: CategoryCreate) -> Category:
        """Creates a new category in the database."""
        db_obj = Category(
            name=obj_in.name,
            slug=obj_in.slug
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: Category, obj_in: CategoryUpdate) -> Category:
        """Updates category details."""
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def remove(self, db_obj: Category) -> Category:
        """Soft-deletes a category."""
        db_obj.deleted_at = datetime.utcnow()
        self.db.add(db_obj)
        self.db.commit()
        return db_obj
