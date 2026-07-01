# InsightOps 📊🤖

An autonomous, multi-tenant enterprise data analytics engine that translates natural language questions into safe, optimized relational SQL queries in real-time.

---

## 🚀 Core Architecture

InsightOps integrates advanced agentic AI, vector semantic mapping, and strict firewall guardrails:

1. **Semantic Table RAG Routing**
   - Utilizes ChromaDB vector embedding discovery to map natural language prompts to matching schema definitions. This narrows down the database structure sent to the LLM to minimize token context usage and speed up translation.

2. **Self-Healing SQL Agent Engine**
   - Integrates Google Gemini (`gemini-2.0-flash`) via REST APIs. Features an automated 3-tier syntax exception-handling retry loop that feeds database errors back to the model to dynamically self-heal queries on the fly.

3. **Enterprise Security Firewall**
   - Employs a custom database firewall (WAF) to intercept and block destructive operations. Strictly prevents `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, and `CREATE` keywords to enforce read-only SELECT database compliance.

4. **Multi-Tenant Credentials Vault**
   - Features secure administrative mounting of external database connection profiles (PostgreSQL / MySQL) and complete API key isolation. Allows tenants to route and execute translations under personal key environments.

5. **Compliance Query Performance Audit Ledger**
   - Registers asynchronous audit ledgers tracking all user questions, generated SQL, execution metrics, and latency performance in milliseconds.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Recharts
- **Backend:** FastAPI, Asynchronous SQLAlchemy, Pydantic
- **Vector Core & DB:** ChromaDB, PostgreSQL
- **AI Orchestration:** Google GenAI SDK (Gemini Core)

---

## 📦 Getting Started

### 1. Installation

Clone the repository and install backend and frontend dependencies:

```bash
# Setup backend virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install frontend modules
cd ../frontend
npm install
```

### 2. Database Migration

Configure the `.env` parameters and run database creation scripts:

```bash
cd ../backend
python -m app.database.init_db
```

### 3. Running Servers

```bash
# Run backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Run frontend dev client
cd ../frontend
npm run dev
```
