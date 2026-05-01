const PAGE_COPY = {
  "intelligence-console": {
    kicker: "Geo-Sentinel Platform",
    headline: "Monitor, find, and validate your source of truth",
    intro:
      "Track geopolitical developments, verify signals across trusted sources, and turn global events into structured, actionable intelligence.",
  },
  "signals-feed": {
    kicker: "Signal monitoring",
    headline: "Track emerging geopolitical signals",
    intro:
      "Follow high-value developments, recurring topics, and priority intelligence signals across regions and sources.",
  },
  "reports-vault": {
    kicker: "Saved intelligence",
    headline: "Access structured reports and snapshots",
    intro:
      "Review generated PDF and JSON intelligence outputs from previous analysis runs once report listing is connected.",
  },
  "regional-monitor": {
    kicker: "Geographic overview",
    headline: "Understand regional intensity at a glance",
    intro:
      "Compare country and region-level signal pressure using sentiment, source volume, and intelligence quality.",
  },
  "source-registry": {
    kicker: "Coverage intelligence",
    headline: "Review source coverage and reliability",
    intro:
      "Explore registered outlets by region, country, reliability, publication focus, and intelligence readiness.",
  },
  "system-status": {
    kicker: "Platform readiness",
    headline: "Check the application and intelligence pipeline",
    intro:
      "View product-facing readiness for frontend delivery, backend availability, authentication, reports, and intelligence generation.",
  },
};

export function PageHero({ activeView }) {
  const copy = PAGE_COPY[activeView] || PAGE_COPY["intelligence-console"];

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow-2xl shadow-slate-950/20 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
        {copy.kicker}
      </p>

      <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl">
        {copy.headline}
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
        {copy.intro}
      </p>
    </section>
  );
}