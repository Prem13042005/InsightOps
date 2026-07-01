import logging
import re
from typing import Optional
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
import openai
from app.core.config import settings
from app.core.guardrails import validate_sql_query
from app.core.schema_router import route_relevant_schemas

# Setup query agent logger
logger = logging.getLogger("app.core.query_agent")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s [QueryAgent]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Initialize OpenAI API key
openai.api_key = settings.OPENAI_API_KEY


async def call_gemini_api(messages: list, api_key: Optional[str] = None) -> str:
    """
    Calls the Google Gemini API using standard REST requests with conversation history.
    """
    key_to_use = api_key or settings.GEMINI_API_KEY
    if not key_to_use:
        raise ValueError("GEMINI_API_KEY settings configuration is missing.")

    system_text = ""
    contents = []

    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")

        if role == "system":
            system_text = content
        elif role == "user":
            contents.append({
                "role": "user",
                "parts": [{"text": content}]
            })
        elif role == "assistant":
            contents.append({
                "role": "model",
                "parts": [{"text": content}]
            })

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.0
        }
    }
    if system_text:
        payload["systemInstruction"] = {
            "parts": [{"text": system_text}]
        }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key_to_use}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        if response.status_code != 200:
            logger.error(f"Gemini API request failed: {response.status_code} - {response.text}")
            raise RuntimeError(f"Gemini API request failed: {response.text}")
        
        res_json = response.json()
        try:
            return res_json["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse Gemini response: {res_json}")
            raise RuntimeError("Malformed Gemini API response payload.") from e


def extract_sql_query(text_content: str) -> str:
    """
    Extracts the SQL query string from markdown blocks or falls back to raw text.
    """
    # Check for ```sql ... ```
    match = re.search(r"```sql\s+(.*?)\s+```", text_content, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    # Check for ``` ... ```
    match = re.search(r"```\s+(.*?)\s+```", text_content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text_content.strip()


async def process_analytics_query(question: str, user_id: int, db_session: AsyncSession) -> dict:
    """
    Asynchronously processes a plain text analytics query.
    1. Fetches matching schema DDL configurations using semantic table metadata routing.
    2. Uses an LLM to translate natural language to a clean SQL SELECT string.
    3. Enforces strict multi-tenancy by requiring 'owner_id = :user_id' filter logic.
    4. Sanitizes SQL queries using security WAF guardrails.
    5. Executes the query, catching any syntax errors and feeding them back to the LLM
       to self-correct up to 3 times.
    """
    # Fetch user specific settings if they exist to extract personal Gemini API key
    user_gemini_key = None
    try:
        from app.database.models import AppUser
        from sqlalchemy import select
        stmt = select(AppUser.encrypted_gemini_key).where(AppUser.id == user_id)
        result = await db_session.execute(stmt)
        user_gemini_key = result.scalar()
    except Exception as e:
        logger.warning(f"Failed to fetch user-specific Gemini key: {e}")

    # 1. Retrieve the schema descriptions
    schema_context = await route_relevant_schemas(question)

    # 2. Build the strict system instruction
    system_prompt = (
        "You are an advanced data analytics query converter.\n"
        "Your task is to translate a user's natural language question into a valid PostgreSQL SQL query.\n\n"
        "DATABASE SCHEMA METADATA:\n"
        f"{schema_context}\n\n"
        "STRICT SYSTEM INSTRUCTIONS & CONSTRAINTS:\n"
        "1. You must ONLY output read-only SELECT or WITH queries. Strictly block any WRITE statements (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, etc.).\n"
        "2. MULTI-TENANCY COMPLIANCE: The database stores records for multiple tenants. You MUST strictly filter every query, join, and lookup condition with the constraint `owner_id = :user_id`. Do NOT hardcode the user's ID value; always use the bind parameter `:user_id`.\n"
        "3. Output Format: Write ONLY the SQL query code inside a markdown block. Do not include any chat commentary or conversational text. Example:\n"
        "```sql\n"
        "SELECT * FROM tenant_products WHERE owner_id = :user_id;\n"
        "```\n"
        "4. SQL Dialect: Use standard PostgreSQL syntax."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Translate this question into PostgreSQL SQL: '{question}'"}
    ]

    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        logger.info(f"SQL Generation attempt {attempt} of {max_attempts}...")

        try:
            # Asynchronous chat completion using the Google Gemini REST API
            llm_response = await call_gemini_api(messages, api_key=user_gemini_key)
            logger.info(f"LLM Response received on attempt {attempt}: {llm_response!r}")
        except Exception as e:
            logger.error(f"OpenAI API request failed on attempt {attempt}: {e}")
            raise RuntimeError(f"OpenAI API call failed: {e}") from e

        # Extract SQL query
        sql_query = extract_sql_query(llm_response)
        logger.info(f"Extracted SQL: {sql_query!r}")

        # 3. Check query safety using the WAF guardrails
        is_safe = validate_sql_query(sql_query)
        if not is_safe:
            waf_warning = (
                "Your generated SQL query was blocked by the safety WAF guardrails! "
                "The query must only contain read-only statements (SELECT or WITH) and "
                "must not contain destructive keywords (DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE, CREATE, GRANT).\n"
                "Please correct the query."
            )
            logger.warning(f"Attempt {attempt} failed WAF checks. Querying LLM for correction...")
            
            # Feed security alert back to LLM to self-heal
            messages.append({"role": "assistant", "content": llm_response})
            messages.append({"role": "user", "content": waf_warning})
            continue

        # 4. Attempt SQL execution
        try:
            # Run the query using standard parameter binding
            result = await db_session.execute(text(sql_query), {"user_id": user_id})
            rows = result.mappings().all()

            # Format rows to be JSON serializable
            serializable_rows = []
            for row in rows:
                row_dict = {}
                for col_name, val in row.items():
                    if hasattr(val, "isoformat"):  # datetime/date values
                        row_dict[col_name] = val.isoformat()
                    elif hasattr(val, "to_eng_string") or type(val).__name__ == "Decimal":  # decimals
                        row_dict[col_name] = float(val)
                    else:
                        row_dict[col_name] = val
                serializable_rows.append(row_dict)

            logger.info("Database execution query completed successfully.")
            return {
                "sql": sql_query,
                "results": serializable_rows,
                "attempts": attempt
            }

        except (SQLAlchemyError, Exception) as db_err:
            error_msg = str(db_err)
            logger.error(f"SQL execution failed on attempt {attempt} with error: {error_msg}")
            
            # Construct self-correction feedback loop
            correction_feedback = (
                f"Your query failed with exception: {error_msg}.\n"
                "Please correct the syntax and return a valid executable SELECT SQL query. "
                "Remember to apply the `owner_id = :user_id` multi-tenant constraint."
            )
            
            # Feed syntax/execution error back to LLM to self-heal
            messages.append({"role": "assistant", "content": llm_response})
            messages.append({"role": "user", "content": correction_feedback})

    # Raise exception if we exhausted all retries
    raise RuntimeError(
        f"Query agent self-correcting loop failed to produce a valid, executable SQL query "
        f"after {max_attempts} attempts."
    )
