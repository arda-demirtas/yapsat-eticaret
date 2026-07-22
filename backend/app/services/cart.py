from sqlalchemy.orm import Session
from app.repositories.cart import CartRepository
from app.repositories.product import ProductRepository
from app.models.cart import CartItem
from typing import List, Any

class CartService:
    """Service class encapsulating shopping cart business logic."""
    
    def __init__(self, db: Session):
        self.cart_repo = CartRepository(db)
        self.product_repo = ProductRepository(db)

    def get_cart(self, user_id: Any) -> List[CartItem]:
        """Gets all cart items for a user."""
        return self.cart_repo.get_user_cart(user_id)

    def add_to_cart(self, user_id: Any, product_id: Any, quantity: int) -> CartItem:
        """
        Adds a product to the user's cart, enforcing stock availability.
        If product already exists in the cart, increments quantity.
        """
        product = self.product_repo.get_by_id(product_id)
        if not product or product.is_archived:
            raise ValueError("Product not found or unavailable")
            
        if product.stock < quantity:
            raise ValueError(f"Only {product.stock} items are in stock")

        existing_item = self.cart_repo.get_item(user_id, product_id)
        if existing_item:
            new_qty = existing_item.quantity + quantity
            if product.stock < new_qty:
                raise ValueError(f"Cannot add more. Only {product.stock} items are in stock and you have {existing_item.quantity} in your cart.")
            return self.cart_repo.update(existing_item, new_qty)
            
        return self.cart_repo.create(user_id, product_id, quantity)

    def update_cart_item(self, user_id: Any, cart_item_id: Any, quantity: int) -> CartItem:
        """Updates the quantity of a cart item after validating ownership and stock."""
        item = self.cart_repo.get_item_by_id(cart_item_id)
        if not item or item.user_id != user_id:
            raise ValueError("Cart item not found")
            
        product = self.product_repo.get_by_id(item.product_id)
        if not product or product.is_archived:
            raise ValueError("Product is no longer available")
            
        if product.stock < quantity:
            raise ValueError(f"Only {product.stock} items are in stock")
            
        return self.cart_repo.update(item, quantity)

    def remove_from_cart(self, user_id: Any, cart_item_id: Any) -> None:
        """Removes an item from the user's cart."""
        item = self.cart_repo.get_item_by_id(cart_item_id)
        if not item or item.user_id != user_id:
            raise ValueError("Cart item not found")
        self.cart_repo.remove(item)

    def merge_carts(self, user_id: Any, guest_items: List[dict]) -> List[CartItem]:
        """
        Merges guest cart items (from localStorage) into the user's database cart on login.
        Quantities are combined and capped at product stock limits.
        """
        for guest_item in guest_items:
            product_id = guest_item.get("product_id")
            quantity = guest_item.get("quantity", 1)
            
            if not product_id:
                continue
                
            product = self.product_repo.get_by_id(product_id)
            if not product or product.is_archived or product.stock == 0:
                continue  # Skip items that are unavailable or out of stock
                
            # Cap quantity at stock limit
            safe_qty = min(quantity, product.stock)
            
            existing_item = self.cart_repo.get_item(user_id, product_id)
            if existing_item:
                new_qty = min(existing_item.quantity + safe_qty, product.stock)
                self.cart_repo.update(existing_item, new_qty)
            else:
                self.cart_repo.create(user_id, product_id, safe_qty)
                
        return self.get_cart(user_id)

    def clear_cart(self, user_id: Any) -> None:
        """Empties the cart."""
        self.cart_repo.clear(user_id)
