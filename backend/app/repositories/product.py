from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.product_image import ProductImage
from app.schemas.product import ProductCreate, ProductUpdate
from typing import List, Any
from datetime import datetime

class ProductRepository:
    """Repository class for DB queries on Product and ProductImage models."""
    
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, product_id: Any) -> Product | None:
        """Retrieves an active product by its ID."""
        return self.db.query(Product).filter(
            Product.id == product_id,
            Product.deleted_at.is_(None)
        ).first()

    def get_by_slug(self, slug: str) -> Product | None:
        """Retrieves an active product by its unique slug."""
        return self.db.query(Product).filter(
            Product.slug == slug,
            Product.deleted_at.is_(None)
        ).first()

    def get_by_sku(self, sku: str) -> Product | None:
        """Retrieves an active product by its unique SKU."""
        return self.db.query(Product).filter(
            Product.sku == sku,
            Product.deleted_at.is_(None)
        ).first()

    def get_multi(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        category_id: Any | None = None,
        show_archived: bool = False
    ) -> List[Product]:
        """Queries active products with search, pagination, and archiving filters."""
        query = self.db.query(Product).filter(Product.deleted_at.is_(None))
        
        if not show_archived:
            query = query.filter(Product.is_archived.is_(False))
            
        if category_id:
            query = query.filter(Product.category_id == category_id)
            
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_filter),
                    Product.description.ilike(search_filter),
                    Product.brand.ilike(search_filter),
                    Product.sku.ilike(search_filter)
                )
            )
            
        return query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, obj_in: ProductCreate, store_id: Any | None = None, commit: bool = True) -> Product:
        """Creates a new product in the database."""
        # Auto-generate SEO Title and Description
        category_name = ""
        if obj_in.category_id:
            from app.models.category import Category
            cat = self.db.query(Category).filter(Category.id == obj_in.category_id).first()
            if cat:
                category_name = cat.name
        
        seo_title = f"{obj_in.name} - {category_name} | YAPSAT" if category_name else f"{obj_in.name} | YAPSAT"
        if obj_in.description:
            seo_description = obj_in.description[:150] + "..." if len(obj_in.description) > 150 else obj_in.description
        else:
            seo_description = f"{obj_in.name} en uygun fiyatlarla YAPSAT'ta!"

        # Auto-generate SKU if not provided
        sku = obj_in.sku
        if not sku:
            import random
            import string
            sku_prefix = "YS-"
            while True:
                random_suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
                generated_sku = f"{sku_prefix}{random_suffix}"
                existing_sku = self.db.query(Product).filter(Product.sku == generated_sku, Product.deleted_at.is_(None)).first()
                if not existing_sku:
                    sku = generated_sku
                    break

        db_obj = Product(
            category_id=obj_in.category_id,
            store_id=store_id,
            name=obj_in.name,
            slug=obj_in.slug,
            sku=sku,
            description=obj_in.description,
            price=obj_in.price,
            brand=obj_in.brand,
            stock=obj_in.stock,
            is_archived=obj_in.is_archived,
            seo_title=seo_title,
            seo_description=seo_description
        )
        self.db.add(db_obj)
        if commit:
            self.db.commit()
            self.db.refresh(db_obj)
        else:
            self.db.flush()
        return db_obj

    def update(self, db_obj: Product, obj_in: ProductUpdate, commit: bool = True) -> Product:
        """Updates product details."""
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        # Re-generate auto-SEO fields on update
        category_name = ""
        if db_obj.category_id:
            from app.models.category import Category
            cat = self.db.query(Category).filter(Category.id == db_obj.category_id).first()
            if cat:
                category_name = cat.name
        
        db_obj.seo_title = f"{db_obj.name} - {category_name} | YAPSAT" if category_name else f"{db_obj.name} | YAPSAT"
        if db_obj.description:
            db_obj.seo_description = db_obj.description[:150] + "..." if len(db_obj.description) > 150 else db_obj.description
        else:
            db_obj.seo_description = f"{db_obj.name} en uygun fiyatlarla YAPSAT'ta!"

        self.db.add(db_obj)
        if commit:
            self.db.commit()
            self.db.refresh(db_obj)
        else:
            self.db.flush()
        return db_obj

    def remove(self, db_obj: Product, commit: bool = True) -> Product:
        """Soft-deletes a product."""
        db_obj.deleted_at = datetime.utcnow()
        self.db.add(db_obj)
        if commit:
            self.db.commit()
        else:
            self.db.flush()
        return db_obj

    def add_image(self, product_id: Any, url: str, thumbnail_url: str, public_id: str | None = None, commit: bool = True) -> ProductImage:
        """Adds a ProductImage record for a product."""
        db_image = ProductImage(
            product_id=product_id,
            url=url,
            thumbnail_url=thumbnail_url,
            public_id=public_id
        )
        self.db.add(db_image)
        if commit:
            self.db.commit()
            self.db.refresh(db_image)
        else:
            self.db.flush()
        return db_image

    def get_image_by_id(self, image_id: Any) -> ProductImage | None:
        """Retrieves a ProductImage by its ID."""
        return self.db.query(ProductImage).filter(ProductImage.id == image_id).first()

    def remove_image(self, db_image: ProductImage, commit: bool = True) -> None:
        """Permanently deletes a ProductImage record from the database."""
        self.db.delete(db_image)
        if commit:
            self.db.commit()
        else:
            self.db.flush()

    def get_total_products_count(self) -> int:
        """Returns total active (non-archived, non-deleted) products count."""
        return self.db.query(Product).filter(
            Product.is_archived == False,
            Product.deleted_at == None
        ).count()
