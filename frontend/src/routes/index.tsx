import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import {
  Route as RouteIcon,
  Wrench,
  ShieldCheck,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InsightOps — Autonomous Data Agent" },
      {
        name: "description",
        content:
          "Enterprise database analytics command deck with dynamic RAG routing, self-healing SQL, RBAC multi-tenancy, and automated compliance auditing.",
      },
      { property: "og:title", content: "InsightOps — Autonomous Data Agent" },
      {
        property: "og:description",
        content:
          "Ask questions in plain English. Get auditable, compliant SQL answers from your enterprise warehouse.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: RouteIcon,
    title: "Dynamic Table RAG Routing",
    desc: "Schema-aware retrieval routes every question to the right tables across thousands of warehouse objects.",
  },
  {
    icon: Wrench,
    title: "Self-Healing SQL Generation",
    desc: "The agent inspects failures, repairs queries against live schema, and retries — no human in the loop.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Multi-Tenancy",
    desc: "Tenant isolation and per-role row policies enforced at the query layer, not the app layer.",
  },
  {
    icon: ClipboardCheck,
    title: "Automated Compliance Auditing",
    desc: "Every prompt, SQL, and result row logged with cryptographic lineage for SOC 2, HIPAA, and GDPR.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Brand />
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-950 transition-colors">Architecture</a>
            <a href="#stack" className="hover:text-slate-950 transition-colors">Platform</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="rounded-md text-slate-700 hover:text-slate-950 hover:bg-slate-100">
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-md bg-violet-600 text-white hover:bg-violet-700 shadow-sm">
              <Link to="/sign-up">Get started <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section>
          <div className="mx-auto max-w-6xl px-6 pt-24 pb-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
                v1.0 · autonomous data agent
              </div>
              <h1 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-slate-950">
                The command deck<br />
                for your data warehouse.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
                Ask in plain English. InsightOps routes the question through your schema,
                writes self-healing SQL, enforces tenant policies, and audits every row returned.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-md h-11 px-5 bg-violet-600 text-white hover:bg-violet-700 shadow-sm">
                  <Link to="/sign-up">
                    Start free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-md h-11 px-5 border-slate-200 bg-white hover:bg-slate-50 text-slate-800">
                  <Link to="/sign-in">Sign in</Link>
                </Button>
              </div>
            </div>

            {/* Mock terminal */}
            <div className="mt-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-[11px] font-mono text-slate-400">analytics-console.insightops</span>
              </div>
              <div className="p-6 font-mono text-[13px] leading-relaxed">
                <div className="text-slate-400">› Which enterprise customers churned last quarter, grouped by industry?</div>
                <div className="mt-2 text-violet-400">→ Routing: customers, subscriptions, industry_segments</div>
                <pre className="mt-3 whitespace-pre-wrap text-slate-200">
<span className="text-[#bb9af7]">SELECT</span> i.name <span className="text-[#bb9af7]">AS</span> industry, <span className="text-[#7aa2f7]">COUNT</span>(*) <span className="text-[#bb9af7]">AS</span> churned
<span className="text-[#bb9af7]">FROM</span> subscriptions s
<span className="text-[#bb9af7]">JOIN</span> customers c <span className="text-[#bb9af7]">ON</span> c.id = s.customer_id
<span className="text-[#bb9af7]">JOIN</span> industry_segments i <span className="text-[#bb9af7]">ON</span> i.id = c.industry_id
<span className="text-[#bb9af7]">WHERE</span> s.churned_at &gt;= <span className="text-[#7aa2f7]">DATE_TRUNC</span>(<span className="text-[#9ece6a]">'quarter'</span>, <span className="text-[#7aa2f7]">NOW</span>() - <span className="text-[#bb9af7]">INTERVAL</span> <span className="text-[#9ece6a]">'3 months'</span>)
  <span className="text-[#bb9af7]">AND</span> c.tier = <span className="text-[#9ece6a]">'enterprise'</span>
<span className="text-[#bb9af7]">GROUP BY</span> i.name
<span className="text-[#bb9af7]">ORDER BY</span> churned <span className="text-[#bb9af7]">DESC</span>;
                </pre>
                <div className="mt-3 text-[11px] text-emerald-400">✓ Executed in 142ms · 12 rows · audit_id: aud_8f2c…</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-slate-200/70 bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-2xl">
              <div className="font-mono text-xs uppercase tracking-widest text-violet-600">Core architecture</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-slate-950">
                Built for warehouses that audit every query.
              </h2>
              <p className="mt-4 text-slate-600">
                Four primitives compose the agent. Each is independently observable, replaceable,
                and certified for enterprise deployment.
              </p>
            </div>
            <div className="mt-12 grid gap-px bg-slate-200/70 md:grid-cols-2 rounded-lg overflow-hidden border border-slate-200/70">
              {features.map((f) => (
                <div key={f.title} className="bg-white p-6 transition-colors hover:bg-slate-50/60">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-50 text-violet-600 border border-violet-100">
                    <f.icon className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-slate-950">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="stack" className="border-t border-slate-200/70">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-950">
              Deploy the command deck this week.
            </h2>
            <p className="mt-4 text-slate-600">
              Connect your warehouse, define your roles, and start querying in natural language
              with a full compliance trail behind every answer.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button asChild size="lg" className="rounded-md h-11 px-5 bg-violet-600 text-white hover:bg-violet-700 shadow-sm">
                <Link to="/sign-up">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-md h-11 px-5 border-slate-200 bg-white hover:bg-slate-50 text-slate-800">
                <Link to="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7 text-sm text-slate-500">
          <Brand />
          <span className="font-mono text-xs">© 2026 InsightOps</span>
        </div>
      </footer>
    </div>
  );
}
