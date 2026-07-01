import { useEffect, useState } from "react";
import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { clearAuth, getToken, getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { LayoutDashboard, History, LogOut, BarChart3, Link2, ShieldAlert, Settings, Menu, X } from "lucide-react";

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
});

const nav = [
  { to: "/dashboard", label: "Analytics Console", icon: LayoutDashboard },
  { to: "/metrics", label: "Visual Metrics Deck", icon: BarChart3 },
  { to: "/integrations", label: "Data Integrations Deck", icon: Link2 },
  { to: "/guardrails", label: "Security Guardrails Log", icon: ShieldAlert },
  { to: "/history", label: "Query Audit History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthedLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!getToken()) {
      navigate({ to: "/sign-in", replace: true });
      return;
    }
    setReady(true);
  }, [navigate]);

  if (!ready) return null;

  const user = getUser();

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn("Logout request failed:", e);
    } finally {
      clearAuth();
      navigate({ to: "/sign-in", replace: true });
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 z-30 flex-col border-r border-slate-200/60 bg-white">
        <div className="px-5 py-4 border-b border-slate-200/60">
          <Link to="/dashboard"><Brand /></Link>
        </div>

        <div className="px-3 pt-5 pb-2">
          <div className="px-2 font-mono text-[10px] uppercase tracking-widest text-slate-400">
            Workspace
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-violet-50 text-violet-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-violet-600" : ""}`} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>


        <div className="border-t border-slate-200/70 p-3 space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-600 text-white text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-950">{user.name}</div>
                <div className="truncate text-[11px] text-slate-500 font-mono">{user.email}</div>
              </div>
            </div>
          )}
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 rounded-md text-slate-600 hover:bg-white hover:text-slate-950"
          >
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </aside>

      {/* Main Content Area Container */}
      <div className="flex flex-col flex-1 w-full md:pl-64">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sticky top-0 z-20">
          <Link to="/dashboard">
            <Brand />
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-md text-violet-600 hover:bg-violet-50 focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Main Outlet */}
        <main className="flex-1 min-w-0 bg-slate-50/50">
          <Outlet />
        </main>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col bg-white border-r border-slate-200/60 transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-5 border-b border-slate-200/60">
          <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
            <Brand />
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pt-5 pb-2">
          <div className="px-2 font-mono text-[10px] uppercase tracking-widest text-slate-400">
            Workspace
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-violet-50 text-violet-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-violet-600" : ""}`} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200/70 p-3 space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-600 text-white text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-950">{user.name}</div>
                <div className="truncate text-[11px] text-slate-500 font-mono">{user.email}</div>
              </div>
            </div>
          )}
          <Button
            onClick={() => {
              setIsMobileMenuOpen(false);
              logout();
            }}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 rounded-md text-slate-600 hover:bg-white hover:text-slate-950"
          >
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </aside>
    </div>
  );
}
