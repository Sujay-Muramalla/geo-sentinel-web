import { ArrowLeft, LogIn, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStoredUserProfile } from "@/lib/auth";

function formatAuthTime(value) {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString();
}

function formatDisplayName(profile) {
  if (profile?.name) return profile.name;
  if (profile?.email) return profile.email.split("@")[0];
  if (profile?.username) return profile.username;

  return "User";
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
  const userProfile = isAuthenticated ? getStoredUserProfile() : null;
  const displayName = formatDisplayName(userProfile);

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

        <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
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

          {isAuthenticated ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/25">
                <UserCircle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="max-w-[180px] truncate text-sm font-semibold text-slate-100">
                  Hello, {displayName}
                </p>
                <p className="max-w-[220px] truncate text-xs text-slate-500">
                  {userProfile?.email || "Account & Settings"}
                </p>
              </div>
            </div>
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
              <div className="hidden text-right text-xs text-slate-500 xl:block">
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