import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AppFooter } from "@/components/layout/app-footer";

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
      <Topbar
        authState={authState}
        onLogin={onLogin}
        onLogout={onLogout}
        onBackToLanding={onBackToLanding}
        demoMode={demoMode}
      />

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 md:px-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)]">
          <Sidebar
            className="h-full"
            activeView={activeView}
            onNavigate={onNavigate}
          />
        </div>

        <main className="min-w-0">{children}</main>
      </div>

      <AppFooter />
    </div>
  );
}