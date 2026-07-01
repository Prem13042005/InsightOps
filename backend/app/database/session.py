from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Configure the asynchronous database engine.
# We set pool_size and max_overflow to prevent connection exhaustion.
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,            # Keep up to 20 connections open in the pool
    max_overflow=10,         # Allow up to 10 additional connections during peak traffic
    pool_recycle=3600,       # Recycle connections older than 1 hour to prevent stale connections
    pool_pre_ping=True,      # Ping connections before checking them out to ensure they are alive
    echo=False,              # Set to True for debugging SQL queries if needed
)

# Configure the asynchronous session maker.
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Dependency to yield an async database session (useful for FastAPI endpoints).
async def get_db():
    async with async_session_maker() as session:
        yield session
