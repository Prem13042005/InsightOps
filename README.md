# InsightOps 📊🤖

InsightOps is an enterprise-grade, multi-tenant autonomous database analytics engine. It leverages advanced LLM orchestration to translate natural language questions into safe, optimized PostgreSQL queries in real-time, executing them securely against tenant-isolated relational data.

Built for scalability and reliability, it features a vector-based database schema router (RAG), an intelligent self-healing SQL compilation loop, strict database firewall guardrails (WAF), and a comprehensive query performance audit ledger.

---

## 🚀 Core Architecture & System Flow

InsightOps combines semantic retrieval, a sandboxed execution context, and safety filters to enable safe natural language interaction with your database:

```mermaid
flowchart TD
    User([User / UI Dashboard]) -->|Natural Language Question| API[FastAPI: /api/v1/analytics/query]
    
    subgraph Schema RAG Routing
        API --> Router[Schema Router]
        Router -->|1. Try Semantic Query| Chroma[(ChromaDB Vector Store)]
        Chroma -.->|Embeddings Match| DDL[Top 2 Table DDLs]
        Router -->|2. Keyword Fallback| Keywords[Keyword Heuristic Matcher]
        Keywords -.->|Regex Match| DDL
    end

    subgraph Self-Healing SQL Generation Loop
        DDL --> Generator[LLM Prompt Compiler]
        Generator -->|Prompt + Context| Gemini[Google Gemini 2.0 Flash]
        Gemini -->|Raw SQL Output| WAF[Database WAF Guardrails]
        
        WAF -->|Clean Comments & Blacklist Check| WAFCheck{Is Query Safe?}
        WAFCheck -->|Unsafe| Generator
        WAFCheck -->|Safe| Executor[DB Executor Engine]
        
        Executor -->|Execute with :user_id parameter| DB[(PostgreSQL Tenant DB)]
        DB -->|Error: Syntax/Schema Fail| Generator
        DB -->|Success: Row Data| Formatter[Response Serializer]
    end
    
    Formatter --> Audit[Query Audit Ledger]
    Audit -->|Log Latency & Status| User
```

---

## ✨ Key Features

### 1. Semantic Schema Routing (RAG)
To prevent model context bloat and minimize token costs, InsightOps does not send your entire database schema to the LLM. 
- During startup, structural database schemas (DDL blueprints) are compiled and indexed into a local **ChromaDB** vector collection using `all-MiniLM-L6-v2` SentenceTransformers.
- Upon receiving a user question, ChromaDB retrieves the top 2 matching tables based on cosine similarity.
- **Graceful Fallback**: If ChromaDB or the embedding transformer fails to load, the system falls back to a regex-based keyword matching router to find relevant tables (e.g. matching `order`, `product`, `customer`, or `user` keywords), and defaults to sending all table blueprints if no keywords match.

### 2. Self-Healing SQL Engine
Translating natural language to SQL can occasionally yield minor syntax discrepancies. InsightOps implements an active execution-feedback loop:
- Translates questions using `gemini-2.0-flash` with conversation history.
- Executes generated queries in a trial run.
- If a database driver raises an exception (syntax error, missing column, join error), the exact exception message is fed back to the model as an automated correction prompt.
- The agent attempts to self-heal the SQL query dynamically up to **3 times** before reporting a failure.

### 3. Database WAF Guardrails
To prevent SQL injection and destructive queries, a custom SQL firewall (WAF) inspects every generated statement before execution:
- **Comment Stripping**: Removes single-line (`--`) and multi-line (`/* ... */`) comments to neutralize comment-based firewall bypass techniques.
- **Destructive Command Blacklist**: Uses regex to block queries containing `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, `CREATE`, or `GRANT` keywords.
- **Read-Only Enforcer**: Guarantees that execution statements must strictly begin with `SELECT` or `WITH`.

### 4. Multi-Tenant Context Isolation
To guarantee tenant privacy:
- The backend forces a multi-tenant constraint filter.
- Every generated query is programmatically bound with `owner_id = :user_id`.
- The `user_id` is never hardcoded directly into the query; it is bound at the driver-level using parameter binds to block SQL injection vectors.

### 5. Compliance Performance Audit Ledger
All queries are tracked in a secure audit log table (`query_audit_ledgers`) for performance tuning and compliance:
- Captures User ID, Raw Question, Generated SQL, execution status (`Success` or `Failed`), and total latency in milliseconds.

---

## 🛠️ Technology Stack

### Backend
- **Core Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous python web framework)
- **Database ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async engine and session managers)
- **Vector DB & NLP:** [ChromaDB](https://www.trychroma.com/), `sentence-transformers` (all-MiniLM-L6-v2)
- **AI Integration:** Google Gemini Core (`gemini-2.0-flash` via HTTPX REST requests)
- **Runtime Server:** [Uvicorn](https://www.uvicorn.org/)

### Frontend
- **Framework:** React 19, [Vite](https://vitejs.dev/)
- **Routing & State:** [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) & [TanStack Router](https://tanstack.com/router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts:** [Recharts](https://recharts.org/) (for rendering orders and inventory trends)
- **Components:** [Radix UI Primitives](https://www.radix-ui.com/), [Lucide React Icons](https://lucide.dev/), [Sonner Toast Notifications](https://sonner.emilkowal.ski/)

---

## 🗄️ Database Models Schema Map

The PostgreSQL schema is structured around isolated tenant data models linked back to authenticated platform users:

| Table Name | Primary Key | Foreign Keys | Indexed Columns | Description |
| :--- | :--- | :--- | :--- | :--- |
| `app_users` | `id` | None | `email` | Registered users, encrypted credentials, and personal Gemini API keys. |
| `tenant_customers` | `id` | `owner_id -> app_users.id` | `owner_id` | Isolated customer directory for each tenant. |
| `tenant_products` | `id` | `owner_id -> app_users.id` | `owner_id` | Isolated products, categorizations, pricing, and stock. |
| `tenant_orders` | `id` | `customer_id`, `product_id`, `owner_id` | `customer_id`, `product_id`, `owner_id` | Order transactions, quantities, and revenue values. |
| `query_audit_ledgers` | `id` | `user_id -> app_users.id` | `user_id` | Audit trails of questions, SQL outputs, and performance latencies. |
| `tenant_credential_vaults` | `id` | `user_id -> app_users.id` | `user_id` | Encrypted connection strings for external database integrations. |

> [!IMPORTANT]
> All relationships enforce database-level cascade deletes (`ondelete="CASCADE"`) to guarantee clean records removal.

---

## 📦 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js (v18+) or [Bun](https://bun.sh/)
- PostgreSQL database instance

---

### Local Installation & Development

#### 1. Setup Database & Configurations
Create a `.env` file inside the `backend/` directory (or copy `backend/.env` to customize):
```env
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/insightops_db
GEMINI_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_jwt_signing_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id (optional)

POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_DB=insightops_db
```

#### 2. Run the Backend API Service
```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install required packages
pip install -r requirements.txt

# Create & verify local database schemas
python -m app.database.init_db

# Run metadata and cascade check verification scripts
python -m app.database.verify_setup

# Start FastAPI server using Uvicorn
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend Swagger documentation will be available at `http://127.0.0.1:8000/docs`.

#### 3. Run the Frontend Development Client
You can use `npm` or `bun` to start the frontend:

```bash
# Navigate to frontend directory
cd ../frontend

# Install node dependencies
npm install  # or: bun install

# Start the dev client
npm run dev  # or: bun dev
```
Open your browser to `http://localhost:5173` to interact with the application.

---

### Containerized Deployment (Docker Compose)

InsightOps includes a multi-container Docker config. Run the entire backend stack and local PostgreSQL database with a single command:

```bash
# Spin up the environment
docker-compose up --build -d

# Check service logs
docker-compose logs -f
```
The compose stack sets up:
- **`insightops-postgres`**: Alpine-based PostgreSQL 15 server mapped to port `5432`.
- **`insightops-backend`**: FastAPI application container running on port `8000` waiting for the database connection health check.

---

## 🔌 API Reference Outline

The FastAPI router exposes routes under `/api/v1` namespace:

### 🔐 Authentication (`/api/v1/auth`)
* `POST /register` - Register a local user account.
* `POST /login` - Login to retrieve a JWT bearer token.
* `POST /google` - Login using Google OAuth identity provider tokens.
* `POST /logout` - Log out and invalidate sessions.

### 📊 Analytics (`/api/v1/analytics`)
* `POST /query` - Input natural language questions, run safety WAF checks, execute generated queries, and return result rows.
* `GET /history` - Fetch the last 20 queries audited for the logged-in user.
* `GET /schemas` - Returns active tables and schemas (excluding sensitive fields like passwords/tokens).
* `GET /guardrails` - Returns list of queries blocked by the WAF or failed executions.
* `GET /chart-metrics` - Provides formatted aggregate charts metrics for dashboards.

### ⛓️ Integrations (`/api/v1/integrations`)
* `POST /connect` - Register and encrypt an external database connection URI.

### ⚙️ User Profile (`/api/v1/user`)
* `GET /settings` - Fetch current user configurations and check if a Gemini API key is configured.
* `POST /settings` - Update name, email, and register a personal, encrypted Gemini API Key.

---

## 🛡️ Development & Code Verification

Ensure to run test validations to verify schema integrity:

```bash
# Compile and assert model metadata configurations
python -m app.database.verify_setup
```

---

## 📝 License
This project is licensed under the MIT License.
