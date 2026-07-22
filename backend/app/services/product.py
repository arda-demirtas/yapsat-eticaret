import uuid
from sqlalchemy.orm import Session
from app.repositories.product import ProductRepository
from app.repositories.category import CategoryRepository
from app.schemas.product import ProductCreate, ProductUpdate
from app.models.product import Product
from app.models.product_image import ProductImage
from app.services.category import slugify
from typing import List, Any
from app.core.redis import clear_cache_pattern

class ProductService:
    """Service class encapsulating Product and ProductImage business logic."""
    
    def __init__(self, db: Session):
        self.product_repo = ProductRepository(db)
        self.category_repo = CategoryRepository(db)

    def get_products(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        category_id: Any | None = None,
        show_archived: bool = False
    ) -> List[Product]:
        """Lists active products with search filters and category constraints."""
        return self.product_repo.get_multi(
            skip=skip,
            limit=limit,
            search=search,
            category_id=category_id,
            show_archived=show_archived
        )

    def get_product_by_id(self, product_id: Any) -> Product:
        """Retrieves a product by ID, raising an error if it doesn't exist."""
        product = self.product_repo.get_by_id(product_id)
        if not product:
            raise ValueError("Product not found")
        return product

    def get_product_by_slug(self, slug: str) -> Product:
        """Retrieves a product by its unique slug."""
        product = self.product_repo.get_by_slug(slug)
        if not product:
            raise ValueError("Product not found")
        return product

    def create_product(self, obj_in: ProductCreate, store_id: Any | None = None) -> Product:
        """Creates a Product, verifying SKU uniqueness, category, and de-duplicating slugs."""
        # Check SKU uniqueness
        existing_sku = self.product_repo.get_by_sku(obj_in.sku)
        if existing_sku:
            raise ValueError(f"SKU {obj_in.sku} is already in use")

        # Validate category if provided
        if obj_in.category_id:
            category = self.category_repo.get_by_id(obj_in.category_id)
            if not category:
                raise ValueError("Category not found")

        # Auto-generate slug if not provided
        if not obj_in.slug:
            obj_in.slug = slugify(obj_in.name)

        # De-duplicate slug if necessary
        existing_slug = self.product_repo.get_by_slug(obj_in.slug)
        if existing_slug:
            obj_in.slug = f"{obj_in.slug}-{uuid.uuid4().hex[:6]}"

        product = self.product_repo.create(obj_in, store_id=store_id)
        clear_cache_pattern("products:*")
        return product

    def update_product(self, product_id: Any, obj_in: ProductUpdate) -> Product:
        """Updates product details, enforcing SKU and category constraints."""
        product = self.product_repo.get_by_id(product_id)
        if not product:
            raise ValueError("Product not found")

        # Validate SKU uniqueness if updated
        if obj_in.sku:
            existing_sku = self.product_repo.get_by_sku(obj_in.sku)
            if existing_sku and existing_sku.id != product_id:
                raise ValueError(f"SKU {obj_in.sku} is already in use")

        # Validate category if updated
        if obj_in.category_id:
            category = self.category_repo.get_by_id(obj_in.category_id)
            if not category:
                raise ValueError("Category not found")

        # Regenerate slug if name changed but no custom slug provided
        if obj_in.name and not obj_in.slug:
            obj_in.slug = slugify(obj_in.name)
            
        if obj_in.slug:
            existing_slug = self.product_repo.get_by_slug(obj_in.slug)
            if existing_slug and existing_slug.id != product_id:
                obj_in.slug = f"{obj_in.slug}-{uuid.uuid4().hex[:6]}"

        updated_product = self.product_repo.update(product, obj_in)
        clear_cache_pattern("products:*")
        return updated_product

    def delete_product(self, product_id: Any) -> Product:
        """Soft-deletes a product by ID."""
        product = self.product_repo.get_by_id(product_id)
        if not product:
            raise ValueError("Product not found")
        deleted_product = self.product_repo.remove(product)
        clear_cache_pattern("products:*")
        return deleted_product

    def add_product_image(self, product_id: Any, url: str, thumbnail_url: str, public_id: str | None = None) -> ProductImage:
        """Attaches an image record to a product."""
        product = self.product_repo.get_by_id(product_id)
        if not product:
            raise ValueError("Product not found")
        image = self.product_repo.add_image(product_id, url, thumbnail_url, public_id)
        clear_cache_pattern("products:*")
        return image

    def delete_product_image(self, image_id: Any) -> ProductImage:
        """Deletes a product image record from the database."""
        image = self.product_repo.get_image_by_id(image_id)
        if not image:
            raise ValueError("Image not found")
        
        self.product_repo.remove_image(image)
        clear_cache_pattern("products:*")
        return image
