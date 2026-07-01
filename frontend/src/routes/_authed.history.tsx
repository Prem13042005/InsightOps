import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api, demoHistory, type HistoryItem } from "@/lib/api";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authed/history")({
  head: () => ({ meta: [{ title: "Audit history · InsightOps" }] }),
  component: HistoryView,
});

function HistoryView() {
  const [rows, setRows] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.getHistory();
        if (!cancelled) setRows(r);
      } catch {
        if (!cancelled) {
          setRows(demoHistory);
          setError("Backend unavailable — showing demo audit log.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      <header className="border-b border-slate-200/60 px-8 py-5 bg-white">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Workspace / Audit</div>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Query Audit Ledger History</h1>
        <p className="mt-1 text-sm text-slate-600">Full lineage of executed intelligence queries across the workspace.</p>
      </header>

      <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
        <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-2.5">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-sm font-semibold tracking-tight text-slate-950">Audit ledger</h2>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                full lineage
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              {rows ? `${rows.length} entries` : "loading…"}
            </div>
          </div>

          {!rows ? (
            <div className="flex items-center justify-center py-20 font-mono text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> fetching audit history…
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Question</Th>
                    <Th>Executed SQL</Th>
                    <Th>Status</Th>
                    <Th>Execution</Th>
                    <Th>Timestamp</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-slate-950 truncate">{r.question}</div>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <code className="font-mono text-[12px] text-slate-500 truncate block">{r.sql}</code>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-slate-700">
                        {r.execution_time_ms}ms
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] text-slate-500 whitespace-nowrap">
                        {new Date(r.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 font-mono text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 rounded-md px-2.5 py-1.5 inline-block">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left font-mono font-medium text-[10px] uppercase tracking-wider text-slate-400 px-4 py-2.5 border-b border-slate-200">
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: "success" | "failed" }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Success
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-medium text-rose-700">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      Failed
    </span>
  );
}
