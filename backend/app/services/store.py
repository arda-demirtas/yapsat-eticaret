import re
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.repositories.store import StoreRepository
from app.repositories.user import UserRepository
from app.schemas.store import StoreCreate
from app.models.store import Store
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from typing import List, Any

def slugify(text: str) -> str:
    """Helper method to convert store name into a unique URL-friendly slug."""
    tr_map = str.maketrans("çğışöüÇĞİŞÖÜ ", "cgisouCGISOU-")
    slug = text.translate(tr_map).lower()
    slug = re.sub(r"[^a-z0-9\-]", "", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")

class StoreService:
    """Service class encapsulating Store creation, admin approvals, and vendor reports."""

    def __init__(self, db: Session):
        self.store_repo = StoreRepository(db)
        self.user_repo = UserRepository(db)
        self.db = db

    def apply_for_store(self, user_id: Any, store_in: StoreCreate) -> Store:
        """Submits a new store application in inactive pending state."""
        existing = self.store_repo.get_by_user_id(user_id)
        if existing:
            raise ValueError("Zaten bir mağaza başvurunuz veya aktif mağazanız bulunuyor.")

        slug = slugify(store_in.name)
        existing_slug = self.store_repo.get_by_slug(slug)
        if existing_slug:
            raise ValueError("Bu mağaza ismi zaten kullanımda. Lütfen başka bir isim seçin.")

        return self.store_repo.create(
            user_id=user_id,
            name=store_in.name,
            slug=slug,
            description=store_in.description,
            logo_url=store_in.logo_url
        )

    def approve_store(self, store_id: Any, is_active: bool) -> Store:
        """Approves/activates a store, elevating the owner's role to VENDOR."""
        store = self.store_repo.get_by_id(store_id)
        if not store:
            raise ValueError("Mağaza bulunamadı.")

        if is_active and not store.is_active:
            # Elevate store owner to VENDOR role
            user = self.db.query(User).filter(User.id == store.user_id).first()
            if user:
                user.role = UserRole.VENDOR
                self.db.add(user)

        updated_store = self.store_repo.update_active_status(store, is_active)
        self.db.commit()
        return updated_store

    def get_vendor_stats(self, vendor_user_id: Any) -> dict:
        """Rolls up statistics widgets and sales revenues scoped ONLY to the vendor's products."""
        store = self.store_repo.get_by_user_id(vendor_user_id)
        if not store or not store.is_active:
            raise ValueError("Aktif mağaza profiliniz bulunamadı.")

        total_products = self.db.query(Product).filter(
            Product.store_id == store.id,
            Product.deleted_at == None
        ).count()

        # Ciro sum scoped to vendor store's products
        sales_val = self.db.query(func.sum(OrderItem.quantity * OrderItem.price)).join(Product).join(Order).filter(
            Product.store_id == store.id,
            Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.COMPLETED])
        ).scalar()
        total_sales = float(sales_val) if sales_val is not None else 0.0

        # Unique orders containing this vendor's products
        orders_count = self.db.query(func.count(func.distinct(Order.id))).join(OrderItem).join(Product).filter(
            Product.store_id == store.id,
            Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.COMPLETED])
        ).scalar()
        total_orders = int(orders_count) if orders_count is not None else 0

        return {
            "store_name": store.name,
            "total_sales": total_sales,
            "total_orders": total_orders,
            "total_products": total_products
        }

    def get_vendor_products(self, vendor_user_id: Any) -> List[Product]:
        """Lists products belonging to the vendor's store."""
        store = self.store_repo.get_by_user_id(vendor_user_id)
        if not store:
            raise ValueError("Mağaza bulunamadı.")
        return self.db.query(Product).filter(
            Product.store_id == store.id,
            Product.deleted_at == None
        ).all()

    def get_vendor_orders(self, vendor_user_id: Any) -> List[Order]:
        """Lists orders containing products belonging to this vendor."""
        store = self.store_repo.get_by_user_id(vendor_user_id)
        if not store:
            raise ValueError("Mağaza bulunamadı.")
        
        # Get orders containing this vendor's products
        return self.db.query(Order).join(OrderItem).join(Product).filter(
            Product.store_id == store.id,
            Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.COMPLETED])
        ).order_by(Order.created_at.desc()).all()
