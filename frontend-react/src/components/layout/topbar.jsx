import { ArrowLeft, LogIn, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatAuthTime(value) {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString();
}

export function Topbar({
  authState,
  onLogin,
  onLogout,
  onBackToLanding,
  demoMode = false,
}) {
  const isConfigured = Boolean(authState?.configured);
  const isAuthenticated = Boolean(authState?.authenticated);

  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
          Intelligence Console
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
          Monitor geopolitical signals with source-backed analysis
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Generate ranked intelligence signals, review source coverage, and download
          analyst-style reports from live RSS-based geopolitical monitoring.
        </p>

        {authState?.message ? (
          <p className="mt-3 max-w-2xl rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-100">
            {authState.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {onBackToLanding ? (
          <Button variant="outline" onClick={onBackToLanding}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit Demo
          </Button>
        ) : null}

        <Badge variant="green">
          {demoMode ? "Demo mode" : "Public access"}
        </Badge>

        {isConfigured ? (
          <Badge
            className={
              isAuthenticated
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
            }
          >
            {isAuthenticated ? "Signed in" : "Login ready"}
          </Badge>
        ) : (
          <Badge variant="amber">Login unavailable</Badge>
        )}

        {isAuthenticated ? (
          <>
            <div className="text-right text-xs text-slate-500">
              <p className="text-slate-300">Session active</p>
              <p>{formatAuthTime(authState?.storedAt) || "Ready"}</p>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onLogin} disabled={!isConfigured}>
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
            <Button onClick={onLogin} disabled={!isConfigured}>
              Get Started
            </Button>
          </>
        )}
      </div>
    </header>
  );
}