import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Link2, AlertCircle, CheckCircle2, Loader2, Database } from "lucide-react";

export const Route = createFileRoute("/_authed/integrations")({
  head: () => ({ meta: [{ title: "Data Integrations · InsightOps" }] }),
  component: DataIntegrations,
});

function DataIntegrations() {
  const [engineType, setEngineType] = useState("PostgreSQL");
  const [profileLabel, setProfileLabel] = useState("");
  const [dbUri, setDbUri] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileLabel.trim() || !dbUri.trim()) {
      setError("Please complete all form fields.");
      setSuccess(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.connectIntegration(profileLabel, dbUri);
      setSuccess(res.message || "Connection details saved successfully in credential vault.");
      setProfileLabel("");
      setDbUri("");
    } catch (err) {
      setError("Failed to register database connection credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-auto">
      <header className="border-b border-slate-200/60 px-8 py-5 bg-white shrink-0">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Workspace / Integrations</div>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Data Integrations Deck</h1>
        <p className="mt-1 text-sm text-slate-600">Register and securely vault target warehouse credentials for autonomous parsing.</p>
      </header>

      <div className="flex-1 p-8 space-y-6 max-w-2xl">
        <div className="rounded-lg border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Link2 className="h-4.5 w-4.5 text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-950">Credential Connection Vault</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="engine-type" className="text-xs font-semibold text-slate-700">Database Engine Type</Label>
              <select
                id="engine-type"
                value={engineType}
                onChange={(e) => setEngineType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition"
              >
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="MySQL">MySQL</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-label" className="text-xs font-semibold text-slate-700">Connection Profile Label</Label>
              <Input
                id="profile-label"
                type="text"
                placeholder="e.g. Sales Warehouse Staging"
                value={profileLabel}
                onChange={(e) => setProfileLabel(e.target.value)}
                className="h-10 rounded-md bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:border-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="db-uri" className="text-xs font-semibold text-slate-700">Database URI String</Label>
              <Input
                id="db-uri"
                type="text"
                placeholder="postgresql://user:password@host:port/database"
                value={dbUri}
                onChange={(e) => setDbUri(e.target.value)}
                className="h-10 rounded-md bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:border-violet-500 font-mono text-xs"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-rose-200/60 bg-rose-50/50 px-3 py-2.5 text-xs text-rose-800 font-mono">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200/60 bg-emerald-50/50 px-3 py-2.5 text-xs text-emerald-800 font-mono">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-md bg-violet-600 text-white hover:bg-violet-700 shadow-sm transition"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vaulting Connection Profile...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Securely Connect and Vault Credentials
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
