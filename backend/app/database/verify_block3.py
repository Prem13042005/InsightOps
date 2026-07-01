import asyncio
from app.core.guardrails import validate_sql_query
from app.core.schema_router import route_relevant_schemas, get_table_blueprints

def test_guardrails():
    print("=========================================")
    print("Testing SQL WAF Guardrails...")
    print("=========================================")
    
    # 1. Valid Read-only Queries
    valid_queries = [
        "SELECT * FROM tenant_products WHERE price > 100",
        "  select id, name FROM app_users; ",
        "WITH cte AS (SELECT id FROM tenant_customers) SELECT * FROM cte",
        "SELECT * FROM tenant_products; -- inline comment is fine",
        "SELECT * FROM tenant_products /* multi-line comment */ WHERE stock > 10"
    ]
    for q in valid_queries:
        print(f"Validating query: {q!r}")
        assert validate_sql_query(q), f"Query should be valid: {q}"
        print("  => VALID (Passed)")

    # 2. Destructive Queries (should be blocked)
    invalid_queries = [
        "DROP TABLE app_users",
        "DELETE FROM tenant_customers WHERE id = 5",
        "UPDATE tenant_products SET stock = 0",
        "INSERT INTO app_users (name, email) VALUES ('hacker', 'hack@me.com')",
        "ALTER TABLE tenant_orders ADD COLUMN hack_col text",
        "TRUNCATE TABLE tenant_orders",
        "CREATE TABLE hack (id serial primary key)",
        "GRANT ALL PRIVILEGES ON app_users TO public",
    ]
    for q in invalid_queries:
        print(f"Validating destructive query: {q!r}")
        assert not validate_sql_query(q), f"Destructive query should be blocked: {q}"
        print("  => BLOCKED (Passed)")

    # 3. SQL Comment Bypass Attempt Queries (should be blocked)
    bypass_queries = [
        "SELECT * FROM tenant_products; DROP TABLE app_users;",
        "SELECT * FROM tenant_products; /* comment */ DELETE FROM tenant_customers",
        "UPDATE tenant_products /* comment */ SET price = 0.0"
    ]
    for q in bypass_queries:
        print(f"Validating bypass attempt query: {q!r}")
        assert not validate_sql_query(q), f"Bypass attempt should be blocked: {q}"
        print("  => BLOCKED (Passed)")

    print("SQL WAF Guardrails test PASSED!\n")


async def test_schema_router():
    print("=========================================")
    print("Testing Semantic Schema Router...")
    print("=========================================")
    
    # Check that blueprints compile properly
    blueprints = get_table_blueprints()
    print(f"Found table blueprints for: {list(blueprints.keys())}")
    assert len(blueprints) == 4
    
    # Run router on different questions
    questions = [
        "How do I log in or retrieve my app users credentials?",
        "Show me all product stocks and prices list",
        "What order transactions were placed by our customers?"
    ]
    
    for question in questions:
        print(f"\nUser Question: {question!r}")
        routed_schema = await route_relevant_schemas(question)
        print("Routed schemas length:", len(routed_schema))
        # Print a short preview
        lines = routed_schema.split("\n")
        preview = "\n".join(lines[:10])
        print(f"--- Routed Schema Preview ---\n{preview}\n...")

    print("\nSemantic Schema Router test PASSED!")

if __name__ == "__main__":
    test_guardrails()
    asyncio.run(test_schema_router())
