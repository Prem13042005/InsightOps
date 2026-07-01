from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import String, ForeignKey, DateTime, Integer, Numeric, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    auth_provider: Mapped[str] = mapped_column(String(50), default="local", nullable=False)
    encrypted_gemini_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships with cascading deletes from Python session-level
    customers: Mapped[List["TenantCustomer"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    products: Mapped[List["TenantProduct"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    orders: Mapped[List["TenantOrder"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    audit_entries: Mapped[List["QueryAuditLedger"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    credentials: Mapped[List["TenantCredentialVault"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class TenantCustomer(Base):
    __tablename__ = "tenant_customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    join_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    
    # owner_id foreign key with indexing for hyper-fast lookup, and database-level cascade on delete
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Relationships
    owner: Mapped["AppUser"] = relationship(back_populates="customers")
    orders: Mapped[List["TenantOrder"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )


class TenantProduct(Base):
    __tablename__ = "tenant_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # owner_id foreign key with indexing and cascade on delete
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Relationships
    owner: Mapped["AppUser"] = relationship(back_populates="products")
    orders: Mapped[List["TenantOrder"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class TenantOrder(Base):
    __tablename__ = "tenant_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Foreign keys with database-level cascades and indexing
    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenant_customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tenant_products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)

    # Relationships
    owner: Mapped["AppUser"] = relationship(back_populates="orders")
    customer: Mapped["TenantCustomer"] = relationship(back_populates="orders")
    product: Mapped["TenantProduct"] = relationship(back_populates="orders")


class QueryAuditLedger(Base):
    __tablename__ = "query_audit_ledgers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_question: Mapped[str] = mapped_column(Text, nullable=False)
    generated_sql: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_status: Mapped[str] = mapped_column(String(50), nullable=False)  # Success or Failed
    execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["AppUser"] = relationship(back_populates="audit_entries")


class TenantCredentialVault(Base):
    __tablename__ = "tenant_credential_vaults"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    connection_name: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_db_uri: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["AppUser"] = relationship(back_populates="credentials")
