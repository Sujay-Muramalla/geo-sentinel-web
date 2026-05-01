import { ArrowLeft, LogIn, LogOut, ShieldCheck } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-sm font-bold text-cyan-300 ring-1 ring-cyan-500/30">
            GS
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-100">
                Geo-Sentinel
              </p>
              <Badge variant="cyan">AWS-hosted</Badge>
              <Badge variant="green">
                {demoMode ? "Demo mode" : "Platform access"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Geopolitical intelligence platform
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {authState?.message ? (
            <p className="max-w-xl rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
              {authState.message}
            </p>
          ) : null}

          {onBackToLanding ? (
            <Button variant="outline" onClick={onBackToLanding}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to landing
            </Button>
          ) : null}

          {isConfigured ? (
            <Badge
              className={
                isAuthenticated
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                  : "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
              }
            >
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {isAuthenticated ? "Signed in" : "Login ready"}
            </Badge>
          ) : (
            <Badge variant="amber">Login unavailable</Badge>
          )}

          {isAuthenticated ? (
            <>
              <div className="hidden text-right text-xs text-slate-500 sm:block">
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
      </div>
    </header>
  );
}