import { getToken } from "./auth";

export const API_BASE = "http://127.0.0.1:8000/api/v1";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export type QueryResponse = {
  sql: string;
  rows: Array<Record<string, unknown>>;
  execution_time_ms: number;
};

export type HistoryItem = {
  id: string;
  question: string;
  sql: string;
  status: "success" | "failed";
  execution_time_ms: number;
  timestamp: string;
};

export const api = {
  register: (name: string, email: string, password: string) =>
    request<{ status: string; message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  googleLogin: (idToken: string) =>
    request<{ access_token: string; token_type: string }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    }),
  logout: () =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
    }),
  runQuery: (question: string) =>
    request<QueryResponse>("/analytics/query", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
  getHistory: async () => {
    interface BackendHistoryItem {
      id: number;
      user_question: string;
      generated_sql: string | null;
      execution_status: string;
      execution_time_ms: number;
      created_at: string;
    }
    const items = await request<BackendHistoryItem[]>("/analytics/history");
    return items.map((item) => ({
      id: String(item.id),
      question: item.user_question,
      sql: item.generated_sql || "",
      status: (item.execution_status.toLowerCase() === "success" ? "success" : "failed") as "success" | "failed",
      execution_time_ms: item.execution_time_ms,
      timestamp: item.created_at,
    }));
  },
  getSchemas: () =>
    request<Array<{ table_name: string; columns: Array<{ name: string; type: string }> }>>("/analytics/schemas"),
  connectIntegration: (connectionName: string, dbUri: string) =>
    request<{ status: string; message: string }>("/integrations/connect", {
      method: "POST",
      body: JSON.stringify({ connection_name: connectionName, db_uri: dbUri }),
    }),
  getGuardrails: () =>
    request<Array<{
      id: number;
      user_question: string;
      generated_sql: string | null;
      execution_status: string;
      execution_time_ms: number;
      created_at: string;
    }>>("/analytics/guardrails"),
  getUserSettings: () =>
    request<{ name: string; email: string; has_gemini_key: boolean; access_level: string }>("/user/settings"),
  updateUserSettings: (name: string, email: string, geminiKey: string) =>
    request<{ status: string; message: string }>("/user/settings", {
      method: "POST",
      body: JSON.stringify({ name, email, gemini_key: geminiKey }),
    }),
  getChartMetrics: () =>
    request<{
      order_metrics: Array<{
        id: number;
        order_date: string | null;
        day: string;
        quantity: number;
        total_amount: number;
        status: string;
      }>;
      inventory_metrics: Array<{
        id: number;
        product_name: string;
        category: string;
        price: number;
        stock: number;
      }>;
    }>("/analytics/chart-metrics"),
};

/** Demo fallback data used when backend is unreachable so the UI is always inspectable. */
export const demoQueryResponse: QueryResponse = {
  sql: `SELECT
  c.region,
  COUNT(DISTINCT o.id) AS orders,
  ROUND(SUM(o.total)::numeric, 2) AS revenue
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.region
ORDER BY revenue DESC
LIMIT 10;`,
  rows: [
    { region: "North America", orders: 12480, revenue: 1842300.55 },
    { region: "Europe", orders: 9320, revenue: 1320480.12 },
    { region: "APAC", orders: 7104, revenue: 988220.4 },
    { region: "LATAM", orders: 2810, revenue: 312044.9 },
    { region: "MEA", orders: 1640, revenue: 198320.05 },
  ],
  execution_time_ms: 142,
};

export const demoHistory: HistoryItem[] = [
  {
    id: "q_01",
    question: "Top 10 regions by revenue last 30 days",
    sql: "SELECT region, SUM(total) FROM orders ...",
    status: "success",
    execution_time_ms: 142,
    timestamp: "2026-06-28T10:42:11Z",
  },
  {
    id: "q_02",
    question: "Churned enterprise customers this quarter",
    sql: "SELECT id, name FROM customers WHERE ...",
    status: "success",
    execution_time_ms: 89,
    timestamp: "2026-06-28T10:31:02Z",
  },
  {
    id: "q_03",
    question: "Average order value by SKU category",
    sql: "SELECT category, AVG(total) FROM ...",
    status: "failed",
    execution_time_ms: 31,
    timestamp: "2026-06-28T09:58:44Z",
  },
  {
    id: "q_04",
    question: "Daily active users for product line X",
    sql: "SELECT DATE(event_at), COUNT(DISTINCT user_id) ...",
    status: "success",
    execution_time_ms: 215,
    timestamp: "2026-06-27T22:14:00Z",
  },
  {
    id: "q_05",
    question: "Inventory below reorder threshold",
    sql: "SELECT sku, stock FROM inventory WHERE stock < reorder_at",
    status: "success",
    execution_time_ms: 45,
    timestamp: "2026-06-27T18:02:21Z",
  },
];
