import re
import logging

# Configure database guardrails logger
logger = logging.getLogger("app.core.guardrails")
if not logger.handlers:
    # Ensure warnings and errors are printed clearly to stderr/console
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s [DB_WAF]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.WARNING)

# Case-insensitive regex pattern for destructive SQL keywords
DESTRUCTIVE_SQL_PATTERN = re.compile(
    r"\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|GRANT)\b",
    re.IGNORECASE
)


def clean_comments(sql_str: str) -> str:
    """
    Remove standard SQL comments from the query string to prevent comment-based WAF bypasses.
    Supports single-line comments starting with '--' and multi-line comments '/* ... */'.
    """
    # Remove single-line comments
    cleaned = re.sub(r"--.*$", "", sql_str, flags=re.MULTILINE)
    # Remove multi-line comments
    cleaned = re.sub(r"/\*.*?\*/", "", cleaned, flags=re.DOTALL)
    return cleaned.strip()


def validate_sql_query(sql_str: str) -> bool:
    """
    Web Application Firewall (WAF) rule to protect the database against malicious queries.
    Strictly checks that the query contains ONLY read-only statements (SELECT or WITH)
    and contains no destructive SQL keywords.
    
    Returns True if the query is safe, otherwise False.
    """
    if not sql_str:
        logger.warning("DB_WAF ALERT [HIGH SEVERITY]: Intercepted empty query string.")
        return False

    # 1. Clean out comments to expose potential hidden keywords (e.g. SELECT /* comment */ DROP ...)
    cleaned_query = clean_comments(sql_str)
    
    if not cleaned_query:
        logger.warning("DB_WAF ALERT [HIGH SEVERITY]: Intercepted query containing only comments.")
        return False

    # 2. Check for destructive SQL keywords
    match = DESTRUCTIVE_SQL_PATTERN.search(cleaned_query)
    if match:
        forbidden_keyword = match.group(1).upper()
        logger.error(
            f"DB_WAF SECURITY ALERT [HIGH SEVERITY]: Destructive SQL keyword '{forbidden_keyword}' intercepted! "
            f"Blocked query execution. Intercepted Query: '{sql_str}'"
        )
        return False

    # 3. Enforce read-only semantics (must begin with SELECT or WITH)
    first_keyword_match = re.match(r"^([a-zA-Z]+)", cleaned_query)
    if not first_keyword_match:
        logger.warning(
            f"DB_WAF ALERT [HIGH SEVERITY]: Intercepted query without valid leading word characters. "
            f"Query: '{sql_str}'"
        )
        return False
        
    first_keyword = first_keyword_match.group(1).upper()
    if first_keyword not in ("SELECT", "WITH"):
        logger.error(
            f"DB_WAF SECURITY ALERT [HIGH SEVERITY]: Non-read-only statement '{first_keyword}' intercepted! "
            f"Blocked query execution. Intercepted Query: '{sql_str}'"
        )
        return False

    return True
