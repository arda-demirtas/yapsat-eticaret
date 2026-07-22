import uuid
from datetime import datetime
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy models.
    Enforces the database rules:
    - UUID primary key
    - created_at
    - updated_at
    - deleted_at (for soft delete)
    """
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        default=None,
        nullable=True
    )


