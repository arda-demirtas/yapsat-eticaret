from sqlalchemy.orm import Session
from app.models.cart import CartItem
from typing import List, Any

class CartRepository:
    """Repository class for DB queries on CartItem model."""
    
    def __init__(self, db: Session):
        self.db = db

    def get_user_cart(self, user_id: Any) -> List[CartItem]:
        """Retrieves all cart items belonging to a specific user."""
        return self.db.query(CartItem).filter(
            CartItem.user_id == user_id
        ).all()

    def get_item(self, user_id: Any, product_id: Any) -> CartItem | None:
        """Retrieves a specific product entry from a user's cart."""
        return self.db.query(CartItem).filter(
            CartItem.user_id == user_id,
            CartItem.product_id == product_id
        ).first()

    def get_item_by_id(self, cart_item_id: Any) -> CartItem | None:
        """Retrieves a cart item directly by its unique record ID."""
        return self.db.query(CartItem).filter(
            CartItem.id == cart_item_id
        ).first()

    def create(self, user_id: Any, product_id: Any, quantity: int) -> CartItem:
        """Adds a new product line to the user's cart."""
        db_obj = CartItem(
            user_id=user_id,
            product_id=product_id,
            quantity=quantity
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: CartItem, quantity: int) -> CartItem:
        """Updates the quantity of an existing cart item."""
        db_obj.quantity = quantity
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def remove(self, db_obj: CartItem) -> None:
        """Deletes a cart item row entirely."""
        self.db.delete(db_obj)
        self.db.commit()

    def clear(self, user_id: Any) -> None:
        """Empties the user's cart (used after checkout or manual clear)."""
        self.db.query(CartItem).filter(CartItem.user_id == user_id).delete()
        self.db.commit()
