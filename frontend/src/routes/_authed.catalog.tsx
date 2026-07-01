import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { Database, ChevronDown, ChevronRight, Table2, Info } from "lucide-react";

export const Route = createFileRoute("/_authed/catalog")({
  head: () => ({ meta: [{ title: "Data Schema Catalog · InsightOps" }] }),
  component: SchemaCatalog,
});

interface ColumnInfo {
  name: string;
  type: string;
}

interface TableSchema {
  table_name: string;
  columns: ColumnInfo[];
}

const demoSchemas: TableSchema[] = [
  {
    table_name: "tenant_customers",
    columns: [
      { name: "id", type: "INTEGER" },
      { name: "name", type: "VARCHAR(255)" },
      { name: "email", type: "VARCHAR(255)" },
      { name: "join_date", type: "DATETIME" },
      { name: "status", type: "VARCHAR(50)" },
      { name: "owner_id", type: "INTEGER" }
    ]
  },
  {
    table_name: "tenant_products",
    columns: [
      { name: "id", type: "INTEGER" },
      { name: "product_name", type: "VARCHAR(255)" },
      { name: "category", type: "VARCHAR(255)" },
      { name: "price", type: "NUMERIC(10,2)" },
      { name: "stock", type: "INTEGER" },
      { name: "owner_id", type: "INTEGER" }
    ]
  },
  {
    table_name: "tenant_orders",
    columns: [
      { name: "id", type: "INTEGER" },
      { name: "customer_id", type: "INTEGER" },
      { name: "product_id", type: "INTEGER" },
      { name: "owner_id", type: "INTEGER" },
      { name: "order_date", type: "DATETIME" },
      { name: "quantity", type: "INTEGER" },
      { name: "total_amount", type: "NUMERIC(10,2)" },
      { name: "status", type: "VARCHAR(50)" }
    ]
  }
];

function SchemaCatalog() {
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    tenant_customers: true,
    tenant_products: true,
    tenant_orders: true,
  });

  useEffect(() => {
    async function loadSchemas() {
      try {
        setLoading(true);
        const data = await api.getSchemas();
        setSchemas(data);
        setError(null);
      } catch (err) {
        console.warn("Failed to fetch backend schemas, falling back to demo metadata.", err);
        setSchemas(demoSchemas);
        setError("Backend unreachable — showing demo schemas.");
      } finally {
        setLoading(false);
      }
    }
    loadSchemas();
  }, []);

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-auto">
      <header className="border-b border-slate-200/60 px-8 py-5 bg-white shrink-0">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Workspace / Catalog</div>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Data Schema Catalog</h1>
        <p className="mt-1 text-sm text-slate-600">Explore warehouse database structures, columns, and data types.</p>
      </header>

      <div className="flex-1 p-8 space-y-6 max-w-4xl">
        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-xs text-amber-800">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="font-mono">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-20 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-20 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-20 bg-slate-100 rounded-md animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            {schemas.map((table) => {
              const isExpanded = expandedTables[table.table_name];
              return (
                <div
                  key={table.table_name}
                  className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleTable(table.table_name)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <Table2 className="h-4 w-4 text-violet-600" />
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {table.table_name}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                        {table.columns.length} columns
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-slate-100 font-mono text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 px-6 py-2 bg-slate-50/30 text-[10px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100">
                        <div>Column Name</div>
                        <div>Data Type</div>
                      </div>
                      {table.columns.map((col) => (
                        <div
                          key={col.name}
                          className="grid grid-cols-1 sm:grid-cols-2 px-6 py-3 hover:bg-slate-50/40 transition-colors text-slate-700"
                        >
                          <div className="font-semibold text-slate-900">{col.name}</div>
                          <div className="text-violet-600">{col.type}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
