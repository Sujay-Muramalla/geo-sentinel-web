import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function QueryPanel({ form, onChange, onSubmit, loading }) {
  return (
    <Panel className="p-6 md:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            Intelligence Query
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
            Generate geopolitical intelligence
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Submit a scenario and query the existing Geo-Sentinel backend contract.
            The frontend is ready now, even while the backend stays switched off for cost control.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="scenario">
            Scenario
          </label>
          <Textarea
            id="scenario"
            value={form.scenario}
            onChange={(event) => onChange("scenario", event.target.value)}
            placeholder="Example: Taiwan semiconductor disruption after a major naval escalation in the Taiwan Strait"
            rows={4}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="geographicScope">
              Geographic scope
            </label>
            <select
              id="geographicScope"
              value={form.geographicScope}
              onChange={(event) => onChange("geographicScope", event.target.value)}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            >
              <option value="world">World</option>
              <option value="asia">Asia</option>
              <option value="europe">Europe</option>
              <option value="middle-east">Middle East</option>
              <option value="north-america">North America</option>
              <option value="india">India</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="countries">
              Countries / focus area
            </label>
            <Input
              id="countries"
              value={form.countries}
              onChange={(event) => onChange("countries", event.target.value)}
              placeholder="India, Taiwan, China, Red Sea..."
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="mediaType">
              Media type
            </label>
            <select
              id="mediaType"
              value={form.mediaType}
              onChange={(event) => onChange("mediaType", event.target.value)}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            >
              <option value="all">All</option>
              <option value="news">News</option>
              <option value="analysis">Analysis</option>
              <option value="rss">RSS</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="publicationFocus">
              Publication focus
            </label>
            <select
              id="publicationFocus"
              value={form.publicationFocus}
              onChange={(event) => onChange("publicationFocus", event.target.value)}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            >
              <option value="all">All</option>
              <option value="top-tier">Top tier</option>
              <option value="regional">Regional</option>
              <option value="independent">Independent</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="sentiment">
              Sentiment filter
            </label>
            <select
              id="sentiment"
              value={form.sentiment}
              onChange={(event) => onChange("sentiment", event.target.value)}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            >
              <option value="all">All</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="sortBy">
              Sort
            </label>
            <select
              id="sortBy"
              value={form.sortBy}
              onChange={(event) => onChange("sortBy", event.target.value)}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
            >
              <option value="final-desc">Final score ↓</option>
              <option value="signal-desc">Signal ↓</option>
              <option value="signal-asc">Signal ↑</option>
              <option value="sentiment-desc">Sentiment ↓</option>
              <option value="sentiment-asc">Sentiment ↑</option>
              <option value="published-desc">Published ↓</option>
              <option value="published-asc">Published ↑</option>
              <option value="source-asc">Source A-Z</option>
              <option value="title-asc">Title A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Existing backend contract remains the source of truth. No backend redesign in this story.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating intelligence..." : "Generate intelligence"}
          </button>
        </div>
      </form>
    </Panel>
  );
}