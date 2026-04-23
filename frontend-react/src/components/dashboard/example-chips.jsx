const examples = [
    "Taiwan semiconductor disruption",
    "South China Sea escalation",
    "Germany energy security shift",
    "India border tension monitoring",
    "Red Sea shipping instability",
    "US election foreign policy signals",
  ];
  
  export function ExampleChips() {
    return (
      <div className="flex flex-wrap gap-2">
        {examples.map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300"
          >
            {item}
          </button>
        ))}
      </div>
    );
  }