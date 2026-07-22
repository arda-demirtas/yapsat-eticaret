from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.payment import PaymentRequest
from app.services.payment import PaymentService
from app.models.user import User
from app.core.limiter import limiter

router = APIRouter()

@router.post("/charge")
@limiter.limit("5/minute")
def charge_payment(
    request: Request,
    payment_in: PaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Processes simulated payment charge, returns transaction details on success."""
    try:
        payment = PaymentService(db).process_mock_payment(
            user_id=current_user.id,
            order_id=payment_in.order_id,
            card_holder=payment_in.card_holder,
            card_number=payment_in.card_number,
            cvc=payment_in.cvc
        )
        return {
            "success": True,
            "data": {
                "message": "Ödeme başarıyla tamamlandı",
                "transaction_id": payment.transaction_id,
                "amount": payment.amount
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
