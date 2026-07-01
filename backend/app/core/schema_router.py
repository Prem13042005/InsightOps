import os
import logging
from typing import Dict
from sqlalchemy.schema import CreateTable
from app.database.models import Base

# Setup schema router logger
logger = logging.getLogger("app.core.schema_router")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s [SchemaRouter]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Global router states
_collection = None
_chroma_failed = False
_ddl_blueprints: Dict[str, str] = {}


def get_table_blueprints() -> Dict[str, str]:
    """
    Generate structural SQL metadata blueprints (DDL SQL) from defined database models.
    """
    global _ddl_blueprints
    if _ddl_blueprints:
        return _ddl_blueprints

    blueprints = {}
    for table_name, table in Base.metadata.tables.items():
        if table_name == "query_audit_ledgers":
            continue
        # Compile standard DDL representation of the table schema
        ddl_str = str(CreateTable(table).compile(dialect=None))
        # Formulate a context-rich schema string for vector search
        blueprints[table_name] = (
            f"Table Name: {table_name}\n"
            f"Description: Database table schema DDL definitions and structure mapping for table {table_name}.\n"
            f"DDL:\n{ddl_str}"
        )
    _ddl_blueprints = blueprints
    return blueprints


def init_chroma():
    """
    Startup routine that reads structural database blueprints and indexes them into
    a local ChromaDB vector collection using SentenceTransformers cosine similarity.
    Gracefully logs a warning and flags fallback mode in case of import or model loading failure.
    """
    global _collection, _chroma_failed
    if _collection is not None or _chroma_failed:
        return

    try:
        import chromadb
        from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

        # Define path for local ChromaDB database
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        chroma_path = os.path.join(base_dir, "chroma_db")

        # Instantiate persistent Chroma client
        client = chromadb.PersistentClient(path=chroma_path)

        # Set up standard SentenceTransformer embedder (lightweight all-MiniLM-L6-v2)
        emb_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

        # Create or fetch collection using cosine-similarity distance
        collection = client.get_or_create_collection(
            name="schema_blueprints",
            embedding_function=emb_fn,
            metadata={"hnsw:space": "cosine"}
        )

        blueprints = get_table_blueprints()
        for table_name, ddl_text in blueprints.items():
            collection.upsert(
                documents=[ddl_text],
                metadatas=[{"table_name": table_name}],
                ids=[table_name]
            )

        _collection = collection
        logger.info("ChromaDB schema router collection initialized and populated successfully.")
    except Exception as e:
        logger.warning(
            f"Could not load ChromaDB / SentenceTransformers: {e}. "
            "Falling back to standard keyword-based database router."
        )
        _chroma_failed = True


async def route_relevant_schemas(user_question: str) -> str:
    """
    Asynchronously route database schemas using similarity search on user question.
    Returns table schemas required to fulfill the user question to reduce context bloat.
    """
    # 1. Initialize router and load schemas
    init_chroma()

    # 2. Query ChromaDB if active
    if _collection is not None:
        try:
            results = _collection.query(
                query_texts=[user_question],
                n_results=2  # Retrieve the top 2 matching tables
            )
            documents = results.get("documents", [[]])[0]
            if documents:
                return "\n\n---\n\n".join(documents)
        except Exception as e:
            logger.error(f"Error querying ChromaDB collection: {e}. Relying on keyword routing.")

    # 3. Fallback Keyword Routing System
    logger.info("Executing keyword-based fallback schema search.")
    blueprints = get_table_blueprints()
    relevant_schemas = []
    
    question_lower = user_question.lower()
    
    # Simple semantic heuristics for database tables mapping
    if any(kw in question_lower for kw in ("user", "auth", "login", "password")):
        relevant_schemas.append(blueprints.get("app_users"))
        
    if any(kw in question_lower for kw in ("customer", "tenant", "join")):
        relevant_schemas.append(blueprints.get("tenant_customers"))
        
    if any(kw in question_lower for kw in ("product", "item", "price", "stock", "category")):
        relevant_schemas.append(blueprints.get("tenant_products"))
        
    if any(kw in question_lower for kw in ("order", "purchase", "sale", "quantity", "transaction")):
        relevant_schemas.append(blueprints.get("tenant_orders"))
        # Orders are heavily linked with customer and product tables
        if blueprints.get("tenant_customers") not in relevant_schemas:
            relevant_schemas.append(blueprints.get("tenant_customers"))
        if blueprints.get("tenant_products") not in relevant_schemas:
            relevant_schemas.append(blueprints.get("tenant_products"))

    # Clean out empty mappings
    relevant_schemas = [s for s in relevant_schemas if s is not None]

    # If nothing matched, return all schema definitions to prevent query failure
    if not relevant_schemas:
        logger.info("No keyword matches found. Returning all schema blueprints.")
        relevant_schemas = list(blueprints.values())

    return "\n\n---\n\n".join(relevant_schemas)
