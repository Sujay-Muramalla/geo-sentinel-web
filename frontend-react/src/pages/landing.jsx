import { useRef } from "react";
import {
  ArrowRight,
  FileText,
  Globe2,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
  Sparkles,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function LandingPage({ authConfigured, onLogin, onViewDemo }) {
  const heroRef = useRef(null);
  const signalScoringRef = useRef(null);
  const regionalIntelligenceRef = useRef(null);
  const analystReportsRef = useRef(null);

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToHero() {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.18),transparent_24%),linear-gradient(180deg,#020617_0%,#030712_100%)]" />

        <div className="absolute inset-x-[-8%] top-[-10%] h-[72vh] opacity-45">
          <div className="absolute inset-0 rounded-b-[45%] border-b border-cyan-300/20 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.18),transparent_58%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_72%)]" />
          <div className="absolute inset-0 animate-[geoPulse_7s_ease-in-out_infinite] bg-[radial-gradient(circle_at_18%_48%,rgba(34,211,238,0.7)_0_2px,transparent_3px),radial-gradient(circle_at_32%_40%,rgba(34,211,238,0.7)_0_2px,transparent_3px),radial-gradient(circle_at_48%_47%,rgba(34,211,238,0.65)_0_2px,transparent_3px),radial-gradient(circle_at_61%_35%,rgba(34,211,238,0.75)_0_2px,transparent_3px),radial-gradient(circle_at_75%_44%,rgba(34,211,238,0.6)_0_2px,transparent_3px),radial-gradient(circle_at_88%_52%,rgba(34,211,238,0.7)_0_2px,transparent_3px)]" />
        </div>

        <div className="absolute left-[6%] top-[13%] h-24 w-24 rounded-full border border-cyan-300/20 opacity-60 animate-[radarPing_5s_ease-in-out_infinite]" />
        <div className="absolute left-[31%] top-[31%] h-32 w-32 rounded-full border border-cyan-300/20 opacity-50 animate-[radarPing_6s_ease-in-out_infinite]" />
        <div className="absolute right-[20%] top-[22%] h-28 w-28 rounded-full border border-cyan-300/20 opacity-60 animate-[radarPing_5.5s_ease-in-out_infinite]" />
        <div className="absolute right-[8%] top-[49%] h-20 w-20 rounded-full border border-cyan-300/20 opacity-50 animate-[radarPing_6.5s_ease-in-out_infinite]" />

        <svg
          className="absolute inset-0 h-full w-full opacity-35"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M80 330 C 320 170, 520 190, 760 300 S 1120 470, 1360 250"
            fill="none"
            stroke="rgba(34,211,238,0.35)"
            strokeWidth="1"
            strokeDasharray="8 12"
          />
          <path
            d="M120 560 C 370 430, 580 460, 820 520 S 1150 630, 1340 480"
            fill="none"
            stroke="rgba(14,165,233,0.28)"
            strokeWidth="1"
            strokeDasharray="5 13"
          />
          <path
            d="M250 230 C 470 350, 620 320, 840 210 S 1160 130, 1320 210"
            fill="none"
            stroke="rgba(125,211,252,0.22)"
            strokeWidth="1"
            strokeDasharray="7 15"
          />
        </svg>
      </div>

      <div
        ref={heroRef}
        className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 md:px-8"
      >
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/10 shadow-lg shadow-cyan-950/40 backdrop-blur">
              <ShieldCheck className="h-6 w-6 text-cyan-300" />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
                Geo-Sentinel
              </p>
              <p className="text-xs text-slate-400">
                Intelligence Operations Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onLogin} disabled={!authConfigured}>
              Login
            </Button>
            <Button onClick={onLogin} disabled={!authConfigured}>
              Get Started
            </Button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <Badge className="mb-6 border-cyan-400/30 bg-cyan-400/10 text-cyan-200 backdrop-blur">
              <RadioTower className="mr-2 h-3.5 w-3.5" />
              Real-time geopolitical signal monitoring
            </Badge>

            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Geopolitical Intelligence.
              <span className="block bg-gradient-to-r from-cyan-300 via-sky-300 to-cyan-500 bg-clip-text text-transparent">
                In Real Time.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Geo-Sentinel turns live global news into ranked intelligence signals,
              regional context, source transparency, and downloadable analyst-style
              reports.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={onLogin}
                disabled={!authConfigured}
                className="gap-2 shadow-lg shadow-cyan-950/40"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={onViewDemo}
                className="bg-slate-950/45 backdrop-blur"
              >
                View Public Demo
              </Button>
            </div>

            <p className="mt-5 flex max-w-xl items-center gap-2 text-sm text-slate-400">
              <LockKeyhole className="h-4 w-4" />
              Public demo remains available. Authenticated mode is ready for the
              upcoming user and premium layers.
            </p>

            {!authConfigured ? (
              <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 backdrop-blur">
                Cognito environment variables are not configured for this frontend
                session. Public demo is still available.
              </p>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/45 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-slate-700/70 bg-slate-950/55 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">
                    Live Signal Console
                  </p>
                  <p className="text-sm text-slate-400">
                    Preview intelligence workflow
                  </p>
                </div>

                <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                  <span className="mr-2 h-2 w-2 rounded-full bg-emerald-300" />
                  Online
                </Badge>
              </div>

              <div className="space-y-4">
                <PreviewMetric
                  icon={<RadioTower className="h-5 w-5" />}
                  label="Signal Score"
                  value="92"
                  detail="Regional escalation detected"
                />
                <PreviewMetric
                  icon={<ShieldCheck className="h-5 w-5" />}
                  label="Source Quality"
                  value="High"
                  detail="Credible international coverage"
                />
                <PreviewMetric
                  icon={<FileText className="h-5 w-5" />}
                  label="Report Status"
                  value="Ready"
                  detail="PDF and JSON intelligence export"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-6 md:grid-cols-3">
          <FeatureCard
            icon={<RadioTower className="h-5 w-5" />}
            title="Signal Scoring"
            text="Rank scenarios using relevance, recency, sentiment, source quality, and regional alignment."
            onClick={() => scrollTo(signalScoringRef)}
          />
          <FeatureCard
            icon={<Globe2 className="h-5 w-5" />}
            title="Regional Intelligence"
            text="Monitor country and region-specific risks through transparent filtering and source selection."
            onClick={() => scrollTo(regionalIntelligenceRef)}
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="Analyst Reports"
            text="Generate structured intelligence reports for individual signal cards and full scenario snapshots."
            onClick={() => scrollTo(analystReportsRef)}
          />
        </section>

        <section className="mb-8 rounded-[2rem] border border-cyan-300/20 bg-slate-950/45 p-6 text-center shadow-xl shadow-cyan-950/10 backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold text-white">
            Built for fast geopolitical awareness.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Start with the public demo, then move into authenticated workflows as
            Geo-Sentinel evolves into a premium intelligence platform.
          </p>
        </section>

        <section className="space-y-5 pb-10">
          <ExplanationBlock
            refProp={signalScoringRef}
            eyebrow="Signal Scoring"
            title="How Geo-Sentinel ranks geopolitical signals"
            text="Signal scoring helps users quickly identify which events deserve attention first. Instead of showing raw headlines equally, Geo-Sentinel evaluates each result using transparent scoring signals."
            points={[
              "Measures scenario relevance against the user’s query.",
              "Factors in recency so newer developments rise higher.",
              "Uses source quality and regional alignment to improve ranking.",
              "Prepares the foundation for premium alerting and trend detection.",
            ]}
            onBack={scrollToHero}
          />

          <ExplanationBlock
            refProp={regionalIntelligenceRef}
            eyebrow="Regional Intelligence"
            title="How regional intelligence narrows global noise"
            text="Regional intelligence helps users focus on the countries, regions, and geopolitical relationships that matter for a scenario instead of drowning in unrelated global news."
            points={[
              "Supports region and country-aware source selection.",
              "Filters weak or incidental geographic mentions.",
              "Surfaces source coverage and transparency metadata.",
              "Improves scenario monitoring for conflict, supply chain, and policy risk.",
            ]}
            onBack={scrollToHero}
          />

          <ExplanationBlock
            refProp={analystReportsRef}
            eyebrow="Analyst Reports"
            title="How analyst reports turn signals into usable briefings"
            text="Analyst reports transform individual intelligence cards into structured briefings that can be reviewed, downloaded, and shared."
            points={[
              "Creates per-card intelligence summaries.",
              "Explains relevance, geo alignment, source quality, and signal score.",
              "Supports PDF and JSON report workflows.",
              "Builds toward premium report vault and subscription features.",
            ]}
            onBack={scrollToHero}
          />
        </section>

        <footer className="border-t border-slate-800/80 py-5 text-center text-xs text-slate-500">
          Geo-Sentinel Web · Public demo · Cognito-ready authenticated entry
        </footer>
      </div>

      <style>{`
        @keyframes geoPulse {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1);
            filter: drop-shadow(0 0 0 rgba(34, 211, 238, 0));
          }
          50% {
            opacity: 0.8;
            transform: scale(1.015);
            filter: drop-shadow(0 0 12px rgba(34, 211, 238, 0.45));
          }
        }

        @keyframes radarPing {
          0%, 100% {
            transform: scale(0.85);
            opacity: 0.18;
          }
          50% {
            transform: scale(1.18);
            opacity: 0.55;
          }
        }
      `}</style>
    </main>
  );
}

function PreviewMetric({ icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">{label}</p>
            <p className="mt-1 text-sm text-slate-400">{detail}</p>
          </div>
        </div>

        <p className="text-2xl font-semibold text-cyan-200">{value}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-3xl border border-slate-700/80 bg-slate-950/45 p-6 text-left shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-slate-900/55 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 transition group-hover:scale-105">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
      <div className="mt-5 h-px w-20 bg-gradient-to-r from-cyan-300/70 to-transparent" />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
        Learn more
      </p>
    </button>
  );
}

function ExplanationBlock({ refProp, eyebrow, title, text, points, onBack }) {
  return (
    <article
      ref={refProp}
      className="scroll-mt-8 rounded-[2rem] border border-slate-700/80 bg-slate-950/55 p-6 shadow-xl shadow-black/20 backdrop-blur-xl md:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
        {title}
      </h3>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
        {text}
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {points.map((point) => (
          <div
            key={point}
            className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4"
          >
            <p className="text-sm leading-6 text-slate-300">{point}</p>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={onBack} className="mt-6">
        <ArrowUp className="mr-2 h-4 w-4" />
        Back to overview
      </Button>
    </article>
  );
}