import asyncio
from app.database.session import engine
from app.database.models import Base


async def init_db():
    print("Initializing PostgreSQL database...")
    try:
        async with engine.begin() as conn:
            # Import models to register them on Base.metadata
            from app.database.models import AppUser, TenantCustomer, TenantProduct, TenantOrder, QueryAuditLedger
            
            # Drop all tables first to sync schema changes
            await conn.run_sync(Base.metadata.drop_all)
            # Create all tables if they do not exist
            await conn.run_sync(Base.metadata.create_all)
        print("PostgreSQL database tables created successfully!")
    except Exception as e:
        print(f"Error initializing database: {e}")


if __name__ == "__main__":
    asyncio.run(init_db())
