import sys
from os.path import abspath, dirname
# Add the backend app folder to the Python path
sys.path.insert(0, abspath(dirname(dirname(__file__))))

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Import our settings and base metadata
from app.core.config import settings
from app.db.base import Base
from app.models.user import User
from app.models.address import Address
from app.models.category import Category
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.cart import CartItem
from app.models.coupon import Coupon
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.store import Store

config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the target metadata for autogenerate migrations support
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Set the database connection URL dynamically from settings
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.DATABASE_URL

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
