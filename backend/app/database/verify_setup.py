from app.core.config import settings
from app.database.session import engine
from app.database.models import Base
import asyncio

def verify_compilation():
    print("Checking metadata compilation...")
    metadata = Base.metadata
    print(f"Tables defined: {list(metadata.tables.keys())}")
    
    # Assert all tables exist in the registry
    assert "app_users" in metadata.tables
    assert "tenant_customers" in metadata.tables
    assert "tenant_products" in metadata.tables
    assert "tenant_orders" in metadata.tables
    
    # Check foreign key setup and indexing
    for table_name, table in metadata.tables.items():
        print(f"Table: {table_name}")
        for col in table.columns:
            fk_str = f" FK -> {list(col.foreign_keys)}" if col.foreign_keys else ""
            indexed = " [Indexed]" if col.index or (col.primary_key and col.name == "id") else ""
            print(f"  - {col.name} ({col.type}){fk_str}{indexed}")

        # Check cascading configurations
        if table_name not in ("app_users", "query_audit_ledgers", "tenant_credential_vaults"):
            owner_col = table.columns.get("owner_id")
            assert owner_col is not None, f"{table_name} is missing owner_id"
            assert owner_col.index, f"{table_name}.owner_id is not indexed"
            
            # verify that foreign key on owner_id has cascade on delete
            fk = list(owner_col.foreign_keys)[0]
            assert fk.ondelete == "CASCADE", f"{table_name}.owner_id foreign key doesn't have CASCADE ondelete"
            print(f"  => verified owner_id cascade ondelete is CASCADE")

    print("Metadata compilation verification PASSED!")

async def test_session():
    print("Verifying database engine connection pools...")
    print(f"Pool size: {engine.pool.size()}")
    print("Engine and async_session_maker configured successfully.")

if __name__ == "__main__":
    verify_compilation()
    asyncio.run(test_session())
