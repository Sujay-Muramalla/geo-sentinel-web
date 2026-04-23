import { Panel } from "@/components/ui/panel";

export function ExampleChips({ items = [], onSelect, disabled = false }) {
  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Quick scenarios
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">
            Launch a query from a preset
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(item)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}