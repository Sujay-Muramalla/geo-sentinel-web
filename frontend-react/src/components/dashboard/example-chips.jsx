import { Panel } from "@/components/ui/panel";

function normalizeItem(item) {
  if (typeof item === "string") {
    return {
      label: item,
      meta: "Preset",
    };
  }

  return {
    label: item?.label || "",
    meta: item?.meta || "Signal",
  };
}

export function ExampleChips({ items = [], onSelect, disabled = false }) {
  const normalizedItems = items.map(normalizeItem).filter((item) => item.label);

  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Dynamic quick scenarios
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">
            Launch from live context or curated presets
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            After a query, this row blends your latest scenario with live matched signals.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {normalizedItems.map((item) => (
            <button
              key={`${item.label}-${item.meta}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(item)}
              className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm font-medium text-slate-200 group-hover:text-cyan-100">
                {item.label}
              </span>
              <span className="mt-1 block text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">
                {item.meta}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}