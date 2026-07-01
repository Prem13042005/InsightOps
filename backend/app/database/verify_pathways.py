import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import Base, QueryAuditLedger, AppUser
from app.api.routes.analytics import execute_query, get_history, QueryRequest
from app.main import app


def test_models_compilation():
    print("Verifying QueryAuditLedger metadata compilation...")
    metadata = Base.metadata
    assert "query_audit_ledgers" in metadata.tables
    table = metadata.tables["query_audit_ledgers"]
    
    # Assert columns
    columns = [c.name for c in table.columns]
    assert "id" in columns
    assert "user_id" in columns
    assert "user_question" in columns
    assert "generated_sql" in columns
    assert "execution_status" in columns
    assert "execution_time_ms" in columns
    assert "created_at" in columns
    
    # Assert foreign key indexing and delete cascade
    user_id_col = table.columns.get("user_id")
    assert user_id_col.index
    fk = list(user_id_col.foreign_keys)[0]
    assert fk.ondelete == "CASCADE"
    print("  => QueryAuditLedger model checks PASSED!")


async def test_query_route_success():
    print("Testing POST /query route success...")
    db = AsyncMock(spec=AsyncSession)
    user = AppUser(id=77, name="Bob", email="bob@test.com")
    payload = QueryRequest(question="How many orders did we get?")

    # Mock process_analytics_query to simulate success
    with patch("app.api.routes.analytics.process_analytics_query", new_callable=AsyncMock) as mock_agent:
        mock_agent.return_value = {
            "sql": "SELECT COUNT(*) FROM tenant_orders WHERE owner_id = :user_id;",
            "results": [{"count": 42}]
        }
        
        response = await execute_query(payload, current_user=user, db=db)
        
        # Verify response payloads
        assert response["sql"] == "SELECT COUNT(*) FROM tenant_orders WHERE owner_id = :user_id;"
        assert response["results"] == [{"count": 42}]
        assert response["execution_time_ms"] >= 0
        
        # Verify db log row
        db.add.assert_called_once()
        logged_row = db.add.call_args[0][0]
        assert isinstance(logged_row, QueryAuditLedger)
        assert logged_row.user_id == 77
        assert logged_row.user_question == "How many orders did we get?"
        assert logged_row.generated_sql == "SELECT COUNT(*) FROM tenant_orders WHERE owner_id = :user_id;"
        assert logged_row.execution_status == "Success"
        assert logged_row.execution_time_ms == response["execution_time_ms"]
        db.commit.assert_awaited_once()
    print("  => POST /query success test PASSED!")


async def test_query_route_failure():
    print("Testing POST /query route failure...")
    db = AsyncMock(spec=AsyncSession)
    db.add.reset_mock()
    db.commit.reset_mock()
    
    user = AppUser(id=77, name="Bob", email="bob@test.com")
    payload = QueryRequest(question="Invalid question triggering error")

    # Mock process_analytics_query to trigger exception
    with patch("app.api.routes.analytics.process_analytics_query", new_callable=AsyncMock) as mock_agent:
        mock_agent.side_effect = RuntimeError("OpenAI connection timed out")
        
        try:
            await execute_query(payload, current_user=user, db=db)
            assert False, "Should raise HTTPException on failure"
        except HTTPException as e:
            assert e.status_code == 500
            assert "Query execution failed" in e.detail
            
        # Verify database logged failed trace
        db.add.assert_called_once()
        logged_row = db.add.call_args[0][0]
        assert isinstance(logged_row, QueryAuditLedger)
        assert logged_row.user_id == 77
        assert logged_row.user_question == "Invalid question triggering error"
        assert logged_row.generated_sql is None
        assert logged_row.execution_status == "Failed"
        db.commit.assert_awaited_once()
    print("  => POST /query failure test PASSED!")


async def test_history_route():
    print("Testing GET /history route...")
    db = AsyncMock(spec=AsyncSession)
    user = AppUser(id=77, name="Bob", email="bob@test.com")
    
    mock_result = MagicMock()
    mock_entry = QueryAuditLedger(
        id=12,
        user_id=77,
        user_question="Give my products",
        generated_sql="SELECT * FROM tenant_products",
        execution_status="Success",
        execution_time_ms=120,
        created_at=MagicMock()
    )
    mock_entry.created_at.isoformat.return_value = "2026-06-29T01:00:00+00:00"
    
    db.execute.return_value = mock_result
    mock_result.scalars.return_value.all.return_value = [mock_entry]

    history = await get_history(current_user=user, db=db)
    assert len(history) == 1
    assert history[0]["id"] == 12
    assert history[0]["user_question"] == "Give my products"
    assert history[0]["generated_sql"] == "SELECT * FROM tenant_products"
    assert history[0]["execution_status"] == "Success"
    assert history[0]["execution_time_ms"] == 120
    assert history[0]["created_at"] == "2026-06-29T01:00:00+00:00"
    print("  => GET /history test PASSED!")


def test_fastapi_factory():
    print("Verifying FastAPI application factory config...")
    # Check middleware list
    middlewares = [m.cls for m in app.user_middleware]
    assert CORSMiddleware in middlewares
    
    # Check mounted paths
    auth_mounted = False
    analytics_mounted = False
    for r in app.routes:
        path = getattr(r, "path", "")
        if path.startswith("/api/v1/auth"):
            auth_mounted = True
        elif path.startswith("/api/v1/analytics"):
            analytics_mounted = True
            
    assert auth_mounted, "Auth sub-router not registered under /api/v1"
    assert analytics_mounted, "Analytics sub-router not registered under /api/v1"
    print("  => FastAPI factory config verification PASSED!")


async def main():
    test_models_compilation()
    await test_query_route_success()
    await test_query_route_failure()
    await test_history_route()
    test_fastapi_factory()
    print("\nAll API Pathways and Audits block tests PASSED!")


if __name__ == "__main__":
    asyncio.run(main())
