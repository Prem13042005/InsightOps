import time
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.database.models import AppUser, QueryAuditLedger, TenantProduct, TenantOrder, TenantCustomer
from app.core.query_agent import process_analytics_query

# Setup analytics logger
logger = logging.getLogger("app.api.routes.analytics")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s [AnalyticsAPI]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Initialize analytics APIRouter
router = APIRouter()


# Pydantic schemas for analytics queries
class QueryRequest(BaseModel):
    question: str


@router.post("/query")
async def execute_query(
    payload: QueryRequest,
    current_user: AppUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Protected query execution endpoint.
    Translates natural language questions to SQL, validates it via WAF, executes it, 
    measures response latency, logs the transaction to the QueryAuditLedger, 
    and returns SQL and result rows.
    """
    start_time = time.perf_counter()
    sql_generated = None

    try:
        # Run query agent execution loop
        agent_response = await process_analytics_query(
            question=payload.question, 
            user_id=current_user.id, 
            db_session=db
        )
        sql_generated = agent_response.get("sql")
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        # 1. Log transaction as Successful to QueryAuditLedger
        audit_row = QueryAuditLedger(
            user_id=current_user.id,
            user_question=payload.question,
            generated_sql=sql_generated,
            execution_status="Success",
            execution_time_ms=elapsed_ms
        )
        db.add(audit_row)
        await db.commit()

        logger.info(f"Successful query audited. Latency: {elapsed_ms}ms")
        return {
            "sql": sql_generated,
            "sql_executed": sql_generated,
            "rows": agent_response.get("results"),
            "data": agent_response.get("results"),
            "results": agent_response.get("results"),
            "execution_time_ms": elapsed_ms
        }

    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.error(f"Failed query execution. Auditing failure: {e}")

        # 2. Log transaction as Failed to QueryAuditLedger
        audit_row = QueryAuditLedger(
            user_id=current_user.id,
            user_question=payload.question,
            generated_sql=sql_generated,  # Might be None if it failed before SQL generation
            execution_status="Failed",
            execution_time_ms=elapsed_ms
        )
        db.add(audit_row)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query execution failed: {e}"
        )


@router.get("/history")
async def get_history(
    current_user: AppUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Protected query history retrieval endpoint.
    Queries the database and returns the last 20 audit entries belonging to the current user.
    """
    # Query last 20 query audit ledger entries, ordered by created_at descending
    stmt = (
        select(QueryAuditLedger)
        .where(QueryAuditLedger.user_id == current_user.id)
        .order_by(QueryAuditLedger.created_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    entries = result.scalars().all()

    # Format output items cleanly
    history_list = []
    for entry in entries:
        history_list.append({
            "id": entry.id,
            "user_question": entry.user_question,
            "generated_sql": entry.generated_sql,
            "execution_status": entry.execution_status,
            "execution_time_ms": entry.execution_time_ms,
            "created_at": entry.created_at.isoformat()
        })

    return history_list


@router.get("/schemas")
async def get_schemas(
    current_user: AppUser = Depends(get_current_user)
):
    """
    Protected schema discovery endpoint.
    Retrieves a list of active tables and their column name/type schemas,
    strictly stripping out sensitive columns matching a security blacklist.
    """
    from app.database.models import Base
    
    blacklist = ["password", "token", "secret", "ssn"]
    
    schemas = []
    for table_name, table in Base.metadata.tables.items():
        if table_name in ("query_audit_ledgers", "tenant_credential_vaults"):
            continue
        columns = []
        for col in table.columns:
            col_name_lower = col.name.lower()
            if any(item in col_name_lower for item in blacklist):
                continue
            columns.append({
                "name": col.name,
                "type": str(col.type)
            })
        schemas.append({
            "table_name": table_name,
            "columns": columns
        })
    return schemas


@router.get("/guardrails")
async def get_guardrails(
    current_user: AppUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Protected guardrails log retrieval endpoint.
    Queries database and returns the audit entries with "Failed" status belonging to the current user.
    """
    stmt = (
        select(QueryAuditLedger)
        .where(QueryAuditLedger.user_id == current_user.id)
        .where(QueryAuditLedger.execution_status == "Failed")
        .order_by(QueryAuditLedger.created_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    entries = result.scalars().all()
    
    logs_list = []
    for entry in entries:
        logs_list.append({
            "id": entry.id,
            "user_question": entry.user_question,
            "generated_sql": entry.generated_sql,
            "execution_status": entry.execution_status,
            "execution_time_ms": entry.execution_time_ms,
            "created_at": entry.created_at.isoformat()
        })
    return logs_list


async def seed_user_data_if_empty(user_id: int, db: AsyncSession):
    # Check if products already exist
    from decimal import Decimal
    from datetime import datetime, timedelta

    prod_stmt = select(TenantProduct).where(TenantProduct.owner_id == user_id)
    prod_res = await db.execute(prod_stmt)
    if prod_res.scalars().first():
        return

    # Seed default products
    products = [
        TenantProduct(product_name="Enterprise SaaS", category="Enterprise SaaS", price=Decimal("1200.00"), stock=45, owner_id=user_id),
        TenantProduct(product_name="Developer Tools", category="Developer Tools", price=Decimal("350.00"), stock=120, owner_id=user_id),
        TenantProduct(product_name="Security & Auditing", category="Security & Auditing", price=Decimal("2500.00"), stock=15, owner_id=user_id),
        TenantProduct(product_name="Data Warehousing", category="Data Warehousing", price=Decimal("4500.00"), stock=8, owner_id=user_id)
    ]
    for p in products:
        db.add(p)
    await db.commit()

    # Seed default customers
    cust_stmt = select(TenantCustomer).where(TenantCustomer.owner_id == user_id)
    cust_res = await db.execute(cust_stmt)
    customers = cust_res.scalars().all()
    if not customers:
        customers = [
            TenantCustomer(name="Alpha Corp", email="contact@alphacorp.com", status="active", owner_id=user_id),
            TenantCustomer(name="Beta LLC", email="info@betallc.com", status="active", owner_id=user_id),
            TenantCustomer(name="Gamma Labs", email="billing@gammalabs.com", status="active", owner_id=user_id)
        ]
        for c in customers:
            db.add(c)
        await db.commit()
        # Refetch customers to get IDs
        cust_res = await db.execute(select(TenantCustomer).where(TenantCustomer.owner_id == user_id))
        customers = cust_res.scalars().all()

    # Seed default orders
    # Get seeded products to link them
    prod_res = await db.execute(select(TenantProduct).where(TenantProduct.owner_id == user_id))
    products = prod_res.scalars().all()

    if products and customers:
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        orders = []
        now = datetime.now()
        for i, day in enumerate(days):
            prod = products[i % len(products)]
            cust = customers[i % len(customers)]
            qty = (i % 3) + 1
            tot = prod.price * qty
            order_date = now - timedelta(days=(7 - i))
            orders.append(
                TenantOrder(
                    customer_id=cust.id,
                    product_id=prod.id,
                    owner_id=user_id,
                    order_date=order_date,
                    quantity=qty,
                    total_amount=tot,
                    status="completed" if i % 4 != 0 else "pending"
                )
            )
        for o in orders:
            db.add(o)
        await db.commit()


@router.get("/chart-metrics")
async def get_chart_metrics(
    current_user: AppUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Protected endpoint to fetch and format orders and inventory metrics
    for the active user session, auto-seeding if empty.
    """
    await seed_user_data_if_empty(current_user.id, db)

    # 1. Fetch all tenant orders belonging to current_user
    orders_stmt = (
        select(TenantOrder)
        .where(TenantOrder.owner_id == current_user.id)
        .order_by(TenantOrder.order_date.asc())
    )
    orders_res = await db.execute(orders_stmt)
    orders = orders_res.scalars().all()

    # 2. Fetch all tenant products belonging to current_user
    products_stmt = (
        select(TenantProduct)
        .where(TenantProduct.owner_id == current_user.id)
    )
    products_res = await db.execute(products_stmt)
    products = products_res.scalars().all()

    # Format orders
    order_metrics = []
    for o in orders:
        day_label = o.order_date.strftime("%a") if o.order_date else "N/A"
        order_metrics.append({
            "id": o.id,
            "order_date": o.order_date.isoformat() if o.order_date else None,
            "day": day_label,
            "quantity": o.quantity,
            "total_amount": float(o.total_amount),
            "status": o.status
        })

    # Format inventory
    inventory_metrics = []
    for p in products:
        inventory_metrics.append({
            "id": p.id,
            "product_name": p.product_name,
            "category": p.category,
            "price": float(p.price),
            "stock": p.stock
        })

    return {
        "order_metrics": order_metrics,
        "inventory_metrics": inventory_metrics
    }
