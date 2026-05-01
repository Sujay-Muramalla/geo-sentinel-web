import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({
  children,
  authState,
  onLogin,
  onLogout,
  onBackToLanding,
  demoMode = false,
  activeView,
  onNavigate,
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#030712_100%)] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-6 p-4 md:p-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <Sidebar
            className="h-full"
            activeView={activeView}
            onNavigate={onNavigate}
          />
        </div>

        <main className="flex min-w-0 flex-col gap-6">
          <Topbar
            authState={authState}
            onLogin={onLogin}
            onLogout={onLogout}
            onBackToLanding={onBackToLanding}
            demoMode={demoMode}
          />
          {children}
        </main>
      </div>
    </div>
  );
}