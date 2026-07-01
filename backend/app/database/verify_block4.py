import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import ProgrammingError
from app.core.query_agent import process_analytics_query

async def run_tests():
    print("=========================================")
    print("Testing Query Agent Engine (Block 4)...")
    print("=========================================")

    # Setup mocked db session and result rows
    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [
        {"id": 1, "product_name": "Laptop", "price": 999.99, "owner_id": 10}
    ]
    mock_session.execute.return_value = mock_result

    # -------------------------------------------------------------
    # TEST 1: Happy path - standard translation & execution
    # -------------------------------------------------------------
    print("\n--- TEST 1: Successful Translation & Execution ---")
    mock_gemini_response = "```sql\nSELECT * FROM tenant_products WHERE owner_id = :user_id;\n```"
    
    with patch("app.core.query_agent.call_gemini_api", new_callable=AsyncMock) as mock_call_gemini:
        mock_call_gemini.return_value = mock_gemini_response
        
        res = await process_analytics_query("Show my products", user_id=10, db_session=mock_session)
        
        print("SQL Generated:", res["sql"])
        print("Results:", res["results"])
        print("Attempts:", res["attempts"])
        
        assert res["attempts"] == 1
        assert "owner_id = :user_id" in res["sql"]
        assert len(res["results"]) == 1
        print("TEST 1 PASSED!")

    # -------------------------------------------------------------
    # TEST 2: Self-healing from database syntax error
    # -------------------------------------------------------------
    print("\n--- TEST 2: Self-healing from DB Syntax Error ---")
    first_response = "```sql\nSELECT * owner_id = :user_id;\n```"
    second_response = "```sql\nSELECT * FROM tenant_products WHERE owner_id = :user_id;\n```"
    
    db_execute_mock = AsyncMock()
    # First call fails, second call succeeds
    db_execute_mock.side_effect = [
        ProgrammingError(
            statement="SELECT * owner_id = :user_id;", 
            params={}, 
            orig=Exception("syntax error near owner_id")
        ),
        mock_result
    ]
    mock_session.execute = db_execute_mock

    with patch("app.core.query_agent.call_gemini_api", new_callable=AsyncMock) as mock_call_gemini:
        mock_call_gemini.side_effect = [first_response, second_response]
        
        res = await process_analytics_query("Show my products", user_id=10, db_session=mock_session)
        
        print("SQL Generated:", res["sql"])
        print("Results:", res["results"])
        print("Attempts:", res["attempts"])
        
        assert res["attempts"] == 2
        assert mock_call_gemini.call_count == 2
        print("TEST 2 PASSED!")

    # -------------------------------------------------------------
    # TEST 3: Self-healing from WAF violation
    # -------------------------------------------------------------
    print("\n--- TEST 3: Self-healing from WAF Violation ---")
    mock_session.execute = AsyncMock(return_value=mock_result)
    
    # First response has destructive UPDATE, second has read-only SELECT
    first_response = "```sql\nUPDATE tenant_products SET price = 0.0 WHERE owner_id = :user_id;\n```"
    second_response = "```sql\nSELECT * FROM tenant_products WHERE owner_id = :user_id;\n```"
    
    with patch("app.core.query_agent.call_gemini_api", new_callable=AsyncMock) as mock_call_gemini:
        mock_call_gemini.side_effect = [first_response, second_response]
        
        res = await process_analytics_query("Show my products", user_id=10, db_session=mock_session)
        
        print("SQL Generated:", res["sql"])
        print("Attempts:", res["attempts"])
        
        assert res["attempts"] == 2
        assert "SELECT" in res["sql"]
        print("TEST 3 PASSED!")

    # -------------------------------------------------------------
    # TEST 4: Exhaustion of retry cycles
    # -------------------------------------------------------------
    print("\n--- TEST 4: Exhaustion of Retries ---")
    bad_response = "```sql\nSELECT * owner_id = :user_id;\n```"
    mock_session.execute = AsyncMock(
        side_effect=ProgrammingError(
            statement="SELECT * owner_id = :user_id;", 
            params={}, 
            orig=Exception("syntax error")
        )
    )
    
    with patch("app.core.query_agent.call_gemini_api", new_callable=AsyncMock) as mock_call_gemini:
        mock_call_gemini.return_value = bad_response
        
        try:
            await process_analytics_query("Show my products", user_id=10, db_session=mock_session)
            assert False, "Should have failed with RuntimeError"
        except RuntimeError as e:
            print("Successfully caught expected exception:", e)
            print("TEST 4 PASSED!")

    print("\nAll Query Agent (Block 4) unit tests PASSED!")

if __name__ == "__main__":
    asyncio.run(run_tests())
