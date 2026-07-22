import re
import uuid
from sqlalchemy.orm import Session
from app.repositories.category import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.models.category import Category
from typing import List, Any
from app.core.redis import delete_cache, clear_cache_pattern

def slugify(text: str) -> str:
    """Helper to convert string into a URL-friendly slug, supporting Turkish characters mapping."""
    text = text.lower().strip()
    turkish_map = {
        'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
        'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c'
    }
    for char, replacement in turkish_map.items():
        text = text.replace(char, replacement)
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text

class CategoryService:
    """Service class encapsulating Category business logic."""
    
    def __init__(self, db: Session):
        self.category_repo = CategoryRepository(db)

    def get_categories(self) -> List[Category]:
        """Lists all categories."""
        return self.category_repo.get_multi()

    def get_category_by_id(self, category_id: Any) -> Category:
        """Retrieves a single category by ID, raising an error if it doesn't exist."""
        category = self.category_repo.get_by_id(category_id)
        if not category:
            raise ValueError("Category not found")
        return category

    def create_category(self, obj_in: CategoryCreate) -> Category:
        """Creates a Category, automatically generating and de-duplicating slugs."""
        if not obj_in.slug:
            obj_in.slug = slugify(obj_in.name)
        
        # Resolve duplicates by appending a short uuid suffix
        existing = self.category_repo.get_by_slug(obj_in.slug)
        if existing:
            obj_in.slug = f"{obj_in.slug}-{uuid.uuid4().hex[:6]}"
            
        category = self.category_repo.create(obj_in)
        delete_cache("categories:all")
        clear_cache_pattern("products:*")
        return category

    def update_category(self, category_id: Any, obj_in: CategoryUpdate) -> Category:
        """Updates category name or slug, verifying slug uniqueness."""
        category = self.category_repo.get_by_id(category_id)
        if not category:
            raise ValueError("Category not found")
            
        if obj_in.slug:
            existing = self.category_repo.get_by_slug(obj_in.slug)
            if existing and existing.id != category_id:
                raise ValueError("Slug already in use")
                
        updated_category = self.category_repo.update(category, obj_in)
        delete_cache("categories:all")
        clear_cache_pattern("products:*")
        return updated_category

    def delete_category(self, category_id: Any) -> Category:
        """Soft-deletes a category by ID."""
        category = self.category_repo.get_by_id(category_id)
        if not category:
            raise ValueError("Category not found")
        deleted_category = self.category_repo.remove(category)
        delete_cache("categories:all")
        clear_cache_pattern("products:*")
        return deleted_category
