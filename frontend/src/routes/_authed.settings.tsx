import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Settings, Shield, KeyRound, Sliders, CheckCircle2, AlertCircle, Loader2, Download, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authed/settings")({
  head: () => ({ meta: [{ title: "Workspace Settings · InsightOps" }] }),
  component: WorkspaceSettings,
});

function WorkspaceSettings() {
  // Card 1 Profile details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState("Administrator");

  // Card 2 API Key
  const [geminiKey, setGeminiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Card 3 Preferences
  const [rowLimit, setRowLimit] = useState("100");

  // Status indicators
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await api.getUserSettings();
        setName(data.name);
        setEmail(data.email);
        setAccessLevel(data.access_level || "Administrator");
        if (data.has_gemini_key) {
          setGeminiKey("••••••••••••••••");
        }
        
        // Restore row limit from localStorage if set
        const savedLimit = localStorage.getItem("insightops_row_limit");
        if (savedLimit) {
          setRowLimit(savedLimit);
        }
        setError(null);
      } catch (err) {
        console.warn("Failed to load user settings, showing mock session values.", err);
        // Fallback to active local user if backend settings is unreachable
        setName("Bob Martin");
        setEmail("bobmartin@example.com");
        setAccessLevel("Administrator");
        setGeminiKey("");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and Email details cannot be empty.");
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.updateUserSettings(name, email, geminiKey);
      setSuccess(res.message || "Profile settings saved successfully.");
      if (geminiKey && geminiKey !== "••••••••••••••••") {
        setGeminiKey("••••••••••••••••");
      }
      // Save row limit locally
      localStorage.setItem("insightops_row_limit", rowLimit);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const historyItems = await api.getHistory();
      if (!historyItems || historyItems.length === 0) {
        alert("No audit logs found to export.");
        return;
      }
      
      const csvHeaders = ["ID", "User Question", "Generated SQL", "Status", "Execution Time (ms)", "Timestamp"];
      const csvRows = historyItems.map(item => [
        item.id,
        `"${item.question.replace(/"/g, '""')}"`,
        `"${item.sql.replace(/"/g, '""')}"`,
        item.status,
        item.execution_time_ms,
        item.timestamp
      ]);
      
      const csvContent = [csvHeaders.join(","), ...csvRows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `insightops_query_audit_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export history logs to CSV:", err);
      alert("Failed to export logs. Please check network logs.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-auto">
        <header className="border-b border-slate-200/60 px-8 py-5 bg-white shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Settings</h1>
        </header>
        <div className="p-8 space-y-6 max-w-3xl">
          <div className="h-40 bg-slate-100 rounded-md animate-pulse" />
          <div className="h-40 bg-slate-100 rounded-md animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-auto">
      <header className="border-b border-slate-200/60 px-8 py-5 bg-white shrink-0">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Workspace / Settings</div>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Workspace Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Configure profile identity details, credentials vault routing, and client deck preferences.</p>
      </header>

      <div className="flex-1 p-8 space-y-6 max-w-3xl">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {error && (
            <div className="flex items-center gap-2.5 rounded-lg border border-rose-200/60 bg-rose-50/50 px-4 py-3 text-xs text-rose-800 font-mono">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 text-xs text-emerald-800 font-mono">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              {success}
            </div>
          )}

          {/* Card 1: Profile Information */}
          <div className="rounded-lg border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4.5 w-4.5 text-violet-600" />
                <h2 className="text-sm font-semibold text-slate-950">Profile Information</h2>
              </div>
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-700/10">
                {accessLevel}
              </span>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name" className="text-xs font-semibold text-slate-700">Display Name</Label>
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-md bg-white border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-md bg-white border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:border-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: API Credentials Vault */}
          <div className="rounded-lg border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 pb-3">
              <KeyRound className="h-4.5 w-4.5 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-950">API Credentials Vault</h2>
            </div>

            <div className="space-y-3">
              <Label htmlFor="gemini-key" className="text-xs font-semibold text-slate-700">Google Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="gemini-key"
                  type={showKey ? "text" : "password"}
                  placeholder="AIzaSy... (Enter your personal key to bypass global rate limits)"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="h-10 pr-10 rounded-md bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:border-violet-500 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Your key is stored securely in the database and is used solely to execute translations for your own session query workflows.
              </p>
            </div>
          </div>

          {/* Card 3: Preferences Deck */}
          <div className="rounded-lg border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 pb-3">
              <Sliders className="h-4.5 w-4.5 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-950">Preferences Deck</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="row-limit" className="text-xs font-semibold text-slate-700">Default Query Row Limit</Label>
                <select
                  id="row-limit"
                  value={rowLimit}
                  onChange={(e) => setRowLimit(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition"
                >
                  <option value="50">50 rows</option>
                  <option value="100">100 rows</option>
                  <option value="200">200 rows</option>
                  <option value="500">500 rows</option>
                </select>
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Audit Log Data Portability</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Export all query audit histories belonging to your session as CSV.</p>
                </div>
                <Button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={exporting}
                  variant="outline"
                  className="h-10 text-xs font-semibold text-slate-700 hover:text-slate-950 border-slate-200/80 bg-white shadow-sm flex items-center justify-center shrink-0"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Export Audit Logs (CSV)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="h-11 w-full bg-violet-600 text-white hover:bg-violet-700 font-semibold shadow-sm transition flex items-center justify-center rounded-md"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving settings changes...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Credentials and Preferences
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
