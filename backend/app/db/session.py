from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Check if the database URL uses SQLite for specific configuration args
is_sqlite = settings.DATABASE_URL.startswith("sqlite") if settings.DATABASE_URL else False
connect_args = {"check_same_thread": False} if is_sqlite else {}

# Create engine with connection pool checking enabled (disabled pre-ping for SQLite)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=not is_sqlite,
    connect_args=connect_args,
)

# Configure the sessionmaker class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
