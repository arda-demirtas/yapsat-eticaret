from sqlalchemy.orm import Session
from app.models.payment import Payment
from typing import Any

class PaymentRepository:
    """Repository class for DB queries on Payment model."""
    
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        order_id: Any,
        provider: str,
        transaction_id: str,
        status: str,
        amount: float,
        signature: str | None = None,
        raw_payload: str | None = None,
        commit: bool = True
    ) -> Payment:
        """Saves a Payment record in the database."""
        db_obj = Payment(
            order_id=order_id,
            provider=provider,
            transaction_id=transaction_id,
            status=status,
            amount=amount,
            signature=signature,
            raw_payload=raw_payload
        )
        self.db.add(db_obj)
        if commit:
            self.db.commit()
            self.db.refresh(db_obj)
        else:
            self.db.flush()
        return db_obj
