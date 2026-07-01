import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { api, demoQueryResponse, type QueryResponse } from "@/lib/api";
import { Loader2, Play, Clock } from "lucide-react";

export const Route = createFileRoute("/_authed/dashboard")({
  head: () => ({ meta: [{ title: "Console · InsightOps" }] }),
  component: Dashboard,
});

const samples = [
  "Top 10 regions by revenue last 30 days",
  "Customers with > $50k LTV who haven't ordered in 60 days",
  "Average basket size by product category this quarter",
];

function Dashboard() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.runQuery(question);
      setResult(r);
    } catch {
      setResult(demoQueryResponse);
      setError("Backend unavailable — showing demo response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      <header className="border-b border-slate-200/60 px-8 py-5 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Workspace / Console</div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Live Business Metrics Exploration</h1>
            <p className="mt-1 text-sm text-slate-600">Real-time Natural Language to Relational SQL Execution Engine.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-500 pt-1">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            agent online · 14 sources indexed
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 p-8 overflow-auto bg-slate-50/50">
        {/* Control Console */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          <Panel
            title="Natural Language Input Prompt"
            tag="prompt"
          >
            <div className="rounded-md border border-slate-200 bg-white focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 transition">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
                <span className="font-mono text-[10px] text-slate-400">prompt.txt</span>
                <span className="font-mono text-[10px] text-slate-400">{question.length} chars</span>
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={"// describe the question…\n// e.g. revenue by region, last 30 days"}
                className="w-full min-h-[220px] resize-none bg-transparent px-3 py-3 font-mono text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none"
                spellCheck={false}
              />
            </div>

            <div className="mt-4">
              <Button
                onClick={run}
                disabled={loading || !question.trim()}
                className="h-10 w-full rounded-md bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 shadow-sm"
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Executing…</>
                ) : (
                  <><Play className="h-3.5 w-3.5 mr-2" /> Execute Intelligence Query</>
                )}
              </Button>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-200/70">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-3">
                Suggested prompts
              </div>
              <div className="space-y-1.5">
                {samples.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuestion(s)}
                    className="block w-full text-left rounded-md border border-slate-200/70 bg-white px-3 py-2 text-xs text-slate-700 hover:border-violet-300 hover:text-slate-950 transition-colors"
                  >
                    <span className="font-mono text-violet-600 mr-2">›</span>{s}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        {/* Output Workspace */}
        <section className="lg:col-span-3 flex flex-col gap-6 min-w-0">
          <Panel
            title="Generated SQL"
            tag="postgres dialect"
          >
            {loading ? (
              <Skeleton lines={6} />
            ) : result ? (
              <Terminal sql={result.sql} />
            ) : (
              <Empty message="// SQL will appear here after your first query" />
            )}
          </Panel>

          <Panel
            title="Results"
            tag="query output"
            meta={
              result && !loading ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  {result.execution_time_ms}ms · {result.rows.length} rows
                </span>
              ) : null
            }
          >
            {loading ? (
              <Skeleton lines={5} />
            ) : result ? (
              <ResultsTable rows={result.rows} />
            ) : (
              <Empty message="// results table will populate here" />
            )}
            {error && (
              <div className="mt-3 font-mono text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 rounded-md px-2.5 py-1.5">
                {error}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Panel({
  title, tag, meta, children,
}: {
  title: string;
  tag?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-2.5">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-sm font-semibold tracking-tight text-slate-950">{title}</h3>
          {tag && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {tag}
            </span>
          )}
        </div>
        {meta}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Terminal({ sql }: { sql: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-900 bg-[#1a1b26] shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-slate-800/70 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-[10px] text-slate-400">query.sql</span>
      </div>
      <pre className="overflow-auto p-4 font-mono text-[13px] leading-relaxed max-h-[300px]">
        <code className="text-slate-200">{highlightSql(sql)}</code>
      </pre>
    </div>
  );
}

const KEYWORDS = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|LIMIT|HAVING|AS|AND|OR|NOT|IN|IS|NULL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|ROUND|DATE_TRUNC|INTERVAL|NOW|DESC|ASC)\b/g;
const STRINGS = /'[^']*'/g;
const NUMBERS = /\b\d+\b/g;

function highlightSql(sql: string): React.ReactNode {
  // Tokenize: keywords purple, strings green, numbers orange
  type Tok = { start: number; end: number; cls: string };
  const toks: Tok[] = [];
  sql.replace(KEYWORDS, (m, _g, idx: number) => {
    toks.push({ start: idx, end: idx + m.length, cls: "text-[#bb9af7] font-medium" });
    return m;
  });
  sql.replace(STRINGS, (m, idx: number) => {
    toks.push({ start: idx, end: idx + m.length, cls: "text-[#9ece6a]" });
    return m;
  });
  sql.replace(NUMBERS, (m, idx: number) => {
    toks.push({ start: idx, end: idx + m.length, cls: "text-[#ff9e64]" });
    return m;
  });
  toks.sort((a, b) => a.start - b.start);
  // Drop overlaps
  const filtered: Tok[] = [];
  let prevEnd = -1;
  for (const t of toks) {
    if (t.start >= prevEnd) {
      filtered.push(t);
      prevEnd = t.end;
    }
  }
  const parts: React.ReactNode[] = [];
  let last = 0;
  filtered.forEach((t, i) => {
    if (t.start > last) parts.push(sql.slice(last, t.start));
    parts.push(<span key={i} className={t.cls}>{sql.slice(t.start, t.end)}</span>);
    last = t.end;
  });
  if (last < sql.length) parts.push(sql.slice(last));
  return parts;
}

function ResultsTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <Empty message="// query returned 0 rows" />;
  const columns = Object.keys(rows[0]);
  return (
    <div className="overflow-auto max-h-[340px]">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="text-left font-mono font-medium text-[10px] uppercase tracking-wider text-slate-400 px-3 py-2 border-b border-slate-200"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/70 transition-colors">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2.5 font-mono text-[12.5px] text-slate-800 whitespace-nowrap">
                  {String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center font-mono text-xs text-slate-400">
      {message}
    </div>
  );
}

function Skeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-slate-100 animate-pulse"
          style={{ width: `${60 + ((i * 13) % 35)}%` }}
        />
      ))}
    </div>
  );
}
