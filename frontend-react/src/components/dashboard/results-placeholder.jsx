import { Panel } from "@/components/ui/panel";

export function ResultsPlaceholder({ loading, errorMessage }) {
  return (
    <Panel className="p-8">
      <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
        {loading ? (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-300" />
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              Request in progress
            </h3>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              The React frontend is waiting for the backend intelligence response.
            </p>
          </>
        ) : errorMessage ? (
          <>
            <div className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200">
              API unavailable
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              No live results to show yet
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">{errorMessage}</p>
          </>
        ) : (
          <>
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
              Ready for live integration
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              Submit a scenario to generate intelligence cards
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              This panel will render real API results once the backend is turned on and reachable.
              Until then, the frontend remains fully usable and gracefully handles downtime.
            </p>
          </>
        )}
      </div>
    </Panel>
  );
}