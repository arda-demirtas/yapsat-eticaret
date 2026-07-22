from pydantic import BaseModel, Field
from uuid import UUID

class PaymentRequest(BaseModel):
    """Schema for processing a simulated payment charge request."""
    order_id: UUID
    card_holder: str = Field(..., min_length=2, max_length=100)
    card_number: str = Field(..., min_length=16, max_length=16, description="16 digit card number without spaces.")
    cvc: str = Field(..., min_length=3, max_length=4)
