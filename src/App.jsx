
import React, { useMemo, useState } from "react";

const regionsDE = [
  "Bundesweit","Berlin","Bayern","Baden-WÃ¼rttemberg","Hamburg","Hessen",
  "Nordrhein-Westfalen","Sachsen","Niedersachsen","Rheinland-Pfalz",
  "Schleswig-Holstein","ThÃ¼ringen","Sachsen-Anhalt","Brandenburg",
  "Saarland","Mecklenburg-Vorpommern","Bremen",
];

function classNames(...xs) { return xs.filter(Boolean).join(" "); }

function downloadCSV(filename, rows) {
  const csv = [
    ["id","score","org","title","signalType","location","snippet","url","date","confidence","matchedKeywords"].join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.score,
        quote(r.org),
        quote(r.title),
        r.signalType,
        quote(r.location),
        quote((r.snippet || "").slice(0, 300)),
        r.url,
        r.date,
        r.confidence,
        quote((r.matchedKeywords || []).join("|")),
      ].join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function quote(s) {
  if (s == null) return "";
  const t = String(s).replace(/"/g, '""');
  return `"${t}"`;
}

const initialLeads = [
  {
    id: "L-001",
    org: "Stealth EV Systems GmbH",
    title: "EU Market Entry Program (Confidential)",
    signalType: "Stealth hiring pattern",
    location: "Berlin, Germany",
    snippet:
      "Multiple senior advisors engaged; new GmbH registered Q3; PR agency retained; office lease talks near SÃ¼dkreuz.",
    url: "https://example.com/lead/stealth-ev",
    date: "2025-10-20",
    confidence: 0.78,
    signals: {
      fundingPR: true,
      tradeRegister: true,
      leadershipJoin: true,
      careersPage404: true,
      meetupsHosted: false,
      customerHiringPull: true,
    },
    matchedKeywords: ["market entry", "go-to-market", "product launch", "automotive"],
    orgSize: "50-200",
    sector: "Automotive/E-Mobility",
  },
  {
    id: "L-002",
    org: "Helix Bio Diagnostics Europe UG (haftungsbeschrÃ¤nkt)",
    title: "German pilot labs & BD ramp-up",
    signalType: "Lab permits + grants + exec hire",
    location: "MÃ¼nchen, Bayern",
    snippet:
      "BMBF grant short-list; two lab permits; new VP Strategy (ex-BCG) in Munich; stealth careers page scanning bots found ./jobs.json",
    url: "https://example.com/lead/helix-bio",
    date: "2025-10-19",
    confidence: 0.72,
    signals: {
      fundingPR: false,
      tradeRegister: true,
      leadershipJoin: true,
      careersPage404: false,
      meetupsHosted: true,
      customerHiringPull: false,
    },
    matchedKeywords: ["strategy", "market development", "lab", "diagnostics"],
    orgSize: "10-50",
    sector: "HealthTech / Diagnostics",
  },
  {
    id: "L-003",
    org: "CloudRetail AG",
    title: "DACH Retail Expansion Program",
    signalType: "Partnership PR + spike in BD roles (non-public)",
    location: "KÃ¶ln, NRW",
    snippet:
      "Retailer partnership MoU filed; 6 agency RFPs; procurement bots detected increased vendor onboarding; exec offsite in DÃ¼sseldorf.",
    url: "https://example.com/lead/cloudretail",
    date: "2025-10-18",
    confidence: 0.66,
    signals: {
      fundingPR: false,
      tradeRegister: false,
      leadershipJoin: true,
      careersPage404: false,
      meetupsHosted: true,
      customerHiringPull: true,
    },
    matchedKeywords: ["partnerships", "BD", "category expansion"],
    orgSize: "200-1000",
    sector: "SaaS / RetailTech",
  },
];

const defaultWeights = {
  fundingPR: 2.0,
  tradeRegister: 1.6,
  leadershipJoin: 2.2,
  careersPage404: 1.1,
  meetupsHosted: 0.9,
  customerHiringPull: 1.7,
  keywordFit: 1.8,
  germanyBias: 1.3,
  recencyBoost: 1.3,
};

const defaultKeywords = {
  themes: [
    { label: "Market Entry", terms: ["market entry","go-to-market","GTM","launch","expansion","EU entry"] },
    { label: "Strategy", terms: ["strategy","corporate development","BD","partnerships","category expansion"] },
    { label: "Marketing", terms: ["brand","growth marketing","performance","demand gen","positioning"] },
    { label: "Entrepreneurial", terms: ["generalist","0â†’1","founding team","builder","operator"] },
  ],
};

export default function App() {
  const [leads] = useState(initialLeads);
  const [region, setRegion] = useState("Bundesweit");
  const [query, setQuery] = useState("");
  const [weights, setWeights] = useState(defaultWeights);
  const [keywords, setKeywords] = useState(defaultKeywords);
  const [minScore, setMinScore] = useState(60);
  const [onlyHighConfidence, setOnlyHighConfidence] = useState(false);
  const [sources, setSources] = useState(defaultSources());

  const scored = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date("2025-10-24");

    return leads
      .map((lead) => {
        const matched = matchKeywords(lead, keywords);
        const days = daysSince(lead.date, now);
        const recencyFactor = days <= 14 ? weights.recencyBoost : 1.0;
        const germanyFactor = /germany|deutschland|berlin|munich|mÃ¼nchen|kÃ¶ln|nrw|hamburg|frankfurt|stuttgart|dÃ¼sseldorf/i.test(
          lead.location || ""
        )
          ? weights.germanyBias
          : 1.0;

        const base =
          (lead.signals.fundingPR ? weights.fundingPR : 0) +
          (lead.signals.tradeRegister ? weights.tradeRegister : 0) +
          (lead.signals.leadershipJoin ? weights.leadershipJoin : 0) +
          (lead.signals.careersPage404 ? weights.careersPage404 : 0) +
          (lead.signals.meetupsHosted ? weights.meetupsHosted : 0) +
          (lead.signals.customerHiringPull ? weights.customerHiringPull : 0) +
          (matched > 0 ? weights.keywordFit : 0);

        const score = Math.round((base * recencyFactor * germanyFactor + lead.confidence * 2) * 10);

        const passesQuery = q
          ? [lead.org, lead.title, lead.snippet, lead.sector]
              .filter(Boolean)
              .some((s) => s.toLowerCase().includes(q))
          : true;

        const passesRegion = region === "Bundesweit" || (lead.location || "").includes(region);
        const highConf = !onlyHighConfidence || lead.confidence >= 0.7;

        return { ...lead, score, matchedCount: matched, passes: passesQuery && passesRegion && highConf };
      })
      .filter((x) => x.passes)
      .sort((a, b) => b.score - a.score);
  }, [leads, query, region, onlyHighConfidence, keywords, weights]);

  const deduped = useMemo(() => {
    const seen = new Set();
    return scored.filter((l) => {
      const k = `${l.org}::${l.title}`.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [scored]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-3">
          <Logo />
          <div className="flex-1" />
          <HeaderActions leads={deduped} onExport={() => downloadCSV("early_vacancy_signals.csv", deduped)} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
          <FiltersPanel
            query={query}
            setQuery={setQuery}
            region={region}
            setRegion={setRegion}
            minScore={minScore}
            setMinScore={setMinScore}
            onlyHighConfidence={onlyHighConfidence}
            setOnlyHighConfidence={setOnlyHighConfidence}
          />
          <WeightsPanel weights={weights} setWeights={setWeights} />
          <KeywordsPanel keywords={keywords} setKeywords={setKeywords} />
          <SourcesPanel sources={sources} setSources={setSources} />
        </aside>
        <section className="lg:col-span-8 xl:col-span-9">
          <ResultsSummary total={deduped.length} />
          <LeadsTable leads={deduped.filter((l) => l.score >= minScore)} />
          <RoadmapCard />
        </section>
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-9 w-9 rounded-2xl bg-black text-white grid place-items-center text-sm font-bold">EV</div>
      <div>
        <div className="text-sm uppercase tracking-wider text-slate-500">Early Signals</div>
        <div className="text-lg font-semibold">Vacancy Radar â€” Germany</div>
      </div>
    </div>
  );
}

function HeaderActions({ leads, onExport }) {
  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 shadow-sm"
        onClick={() => alert('MVP: Trigger a crawl job via API (POST /api/run-discovery)')}
      >
        Run discovery
      </button>
      <button
        className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 shadow-sm"
        onClick={onExport}
      >
        Export CSV ({leads.length})
      </button>
    </div>
  );
}

function FiltersPanel({ query, setQuery, region, setRegion, minScore, setMinScore, onlyHighConfidence, setOnlyHighConfidence }) {
  return (
    <Card title="Filters">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="org, sector, snippetâ€¦"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Region (Germany)</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {regionsDE.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Min. Score: {minScore}</label>
          <input
            type="range"
            min={0}
            max={120}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="highconf"
            type="checkbox"
            checked={onlyHighConfidence}
            onChange={(e) => setOnlyHighConfidence(e.target.checked)}
          />
          <label htmlFor="highconf" className="text-sm text-slate-700">Only high-confidence (â‰¥ 0.70)</label>
        </div>
      </div>
    </Card>
  );
}

function WeightsPanel({ weights, setWeights }) {
  const keys = Object.keys(weights);
  return (
    <Card title="Signal Weights">
      <div className="space-y-3">
        {keys.map((k) => (
          <div key={k} className="grid grid-cols-5 items-center gap-2">
            <div className="col-span-2 text-sm font-medium text-slate-700">{labelize(k)}</div>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={weights[k]}
              onChange={(e) => setWeights({ ...weights, [k]: parseFloat(e.target.value) })}
              className="col-span-2"
            />
            <div className="text-xs text-slate-500">{weights[k].toFixed(1)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function KeywordsPanel({ keywords, setKeywords }) {
  const [newTheme, setNewTheme] = useState("");
  const [newTerms, setNewTerms] = useState("");

  const addTheme = () => {
    if (!newTheme.trim()) return;
    const terms = newTerms.split(",").map((t) => t.trim()).filter(Boolean);
    setKeywords({ themes: [...keywords.themes, { label: newTheme.trim(), terms }] });
    setNewTheme("");
    setNewTerms("");
  };

  const removeTheme = (i) => setKeywords({ themes: keywords.themes.filter((_, idx) => idx !== i) });

  return (
    <Card title="Keyword Graph">
      <div className="space-y-3">
        {keywords.themes.map((t, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-3 bg-white">
            <div className="flex items-start gap-2">
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-slate-500">{t.terms.length} terms</div>
              <div className="flex-1" />
              <button className="text-xs text-slate-600 hover:underline" onClick={() => removeTheme(i)}>remove</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {t.terms.map((term, j) => (
                <span key={j} className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">{term}</span>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-slate-300 p-3">
          <div className="text-sm font-medium mb-2">Add theme</div>
          <input
            value={newTheme}
            onChange={(e) => setNewTheme(e.target.value)}
            placeholder="Theme label (e.g., Category Expansion)"
            className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
          <input
            value={newTerms}
            onChange={(e) => setNewTerms(e.target.value)}
            placeholder="Comma-separated terms"
            className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
          />
          <button className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 shadow-sm" onClick={addTheme}>
            Add theme
          </button>
        </div>
      </div>
    </Card>
  );
}

function SourcesPanel({ sources, setSources }) {
  const [form, setForm] = useState({ kind: "RSS", url: "", label: "" });

  const add = () => {
    if (!form.url.trim()) return;
    setSources([...sources, { ...form, id: `S-${Date.now()}` }]);
    setForm({ kind: "RSS", url: "", label: "" });
  };

  const remove = (id) => setSources(sources.filter((s) => s.id !== id));

  return (
    <Card title="Source Connectors">
      <div className="space-y-3">
        {sources.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs rounded-full bg-slate-800 text-white px-2 py-0.5">{s.kind}</span>
              <div className="font-medium truncate" title={s.url}>{s.label || s.url}</div>
              <div className="flex-1" />
              <button className="text-xs text-red-600 hover:underline" onClick={() => remove(s.id)}>remove</button>
            </div>
            <div className="text-xs text-slate-600 mt-1 truncate" title={s.url}>{s.url}</div>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-slate-300 p-3">
          <div className="grid grid-cols-4 gap-2">
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              className="col-span-1 rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              {["RSS","Sitemap","HTML","API","LinkedIn","X","Meetup","Crunchbase","EU Filings","Handelsregister"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Label (optional)"
              className="col-span-1 rounded-xl border border-slate-300 bg-white px-3 py-2"
            />
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://â€¦"
              className="col-span-2 rounded-xl border border-slate-300 bg-white px-3 py-2"
            />
          </div>
          <div className="mt-2">
            <button className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 shadow-sm" onClick={add}>
              Add source
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ResultsSummary({ total }) {
  return (
    <div className="mb-3">
      <div className="text-sm text-slate-600">Results</div>
      <div className="text-2xl font-semibold">{total} early-signal leads</div>
    </div>
  );
}

function LeadsTable({ leads }) {
  if (!leads.length) return <Empty />;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-left">
            <Th>Score</Th>
            <Th>Organisation</Th>
            <Th>Signal</Th>
            <Th>Location</Th>
            <Th>When</Th>
            <Th>Confidence</Th>
            <Th>Keywords</Th>
            <Th>Open</Th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/50">
              <Td><ScoreBadge score={l.score} /></Td>
              <Td>
                <div className="font-medium">{l.org}</div>
                <div className="text-slate-500 text-xs">{l.title}</div>
                <div className="text-slate-500 text-xs line-clamp-2 max-w-[42ch]">{l.snippet}</div>
              </Td>
              <Td><span className="text-xs rounded-full bg-slate-100 px-2 py-0.5">{l.signalType}</span></Td>
              <Td>{l.location}</Td>
              <Td>{formatDate(l.date)}</Td>
              <Td><ConfidenceBar v={l.confidence} /></Td>
              <Td>
                <div className="flex flex-wrap gap-1 max-w-[24ch]">
                  {(l.matchedKeywords || []).slice(0, 6).map((k, i) => (
                    <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{k}</span>
                  ))}
                </div>
              </Td>
              <Td>
                <a className="text-blue-600 hover:underline" href={l.url} target="_blank" rel="noreferrer">link â†—</a>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoadmapCard() {
  return (
    <Card title="Roadmap & Implementation Plan">
      <ol className="list-decimal pl-5 space-y-3 text-sm text-slate-700">
        <li><b>Crawling & Ingestion (Week 1â€“2)</b>: RSS + Sitemaps (PRs, blogs), Handelsregister & Bundesanzeiger parsing, EU funding/grants APIs, Meetup/Tech events, X/LinkedIn org signals, sitemap jobs endpoints (hidden jobs.json), PRNewswire/BusinessWire (DACH filter), Crunchbase triggers. Respect robots.txt; store raw docs in S3.</li>
        <li><b>Signal Extraction</b>: Rule-based + LLM tagging (market entry, leadership join, stealth careers page, filings, RFPs). Add German NER (spaCy de_core_news_lg) for orgs/locations.</li>
        <li><b>Scoring v1</b>: Use this UI's weights; add learning loop from your feedback; train logistic regression/XGBoost on confirmed hits.</li>
        <li><b>Dedup/Clustering</b>: pgvector similarity across org + snippet + URL host.</li>
        <li><b>Delivery</b>: Daily digest email + Slack/Teams webhook; one-click create outreach brief.</li>
        <li><b>Compliance & Ethics</b>: Obey robots.txt, rate limits; avoid paywalled/private data; honour takedown.</li>
      </ol>
      <div className="mt-4 text-xs text-slate-500">
        API stubs to implement: <code>POST /api/run-discovery</code>, <code>GET /api/leads</code>, <code>POST /api/sources</code>, <code>POST /api/confirm</code>. Suggested stack: Next.js + Postgres (Supabase) + BullMQ + Playwright + Node crawlers; enrich with OpenAI/Azure for tagging.
      </div>
    </Card>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
      No leads yet. Click <span className="font-medium">Run discovery</span> to start, or add sources on the left.
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 font-semibold">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Th({ children }) { return <th className="px-3 py-2 text-xs font-semibold text-slate-600">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-3 align-top">{children}</td>; }

function ScoreBadge({ score }) {
  const tone = score >= 100 ? "bg-emerald-600" : score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className={classNames("inline-flex items-center justify-center rounded-xl px-2 py-1 text-white text-xs font-semibold", tone)}>
      {score}
    </div>
  );
}

function ConfidenceBar({ v }) {
  const pct = Math.round(v * 100);
  return (
    <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden" title={`${pct}%`}>
      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Helpers
function daysSince(dStr, now = new Date()) {
  const d = new Date(dStr);
  return Math.max(0, Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDate(dStr) {
  const d = new Date(dStr);
  return d.toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "2-digit" });
}

function labelize(k) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace("Pr", " PR")
    .replace("Eu", "EU");
}

function matchKeywords(lead, keywords) {
  const blob = [lead.title, lead.snippet, lead.org, lead.sector].join(" \\n ").toLowerCase();
  let count = 0;
  for (const theme of keywords.themes) {
    for (const term of theme.terms) {
      if (term && blob.includes(term.toLowerCase())) count++;
    }
  }
  return count;
}

function defaultSources() {
  return [
    { id: "S-1", kind: "RSS", label: "Pressemitteilungen (DACH)", url: "https://example.com/rss/pr-dach.xml" },
    { id: "S-2", kind: "Handelsregister", label: "Neue GmbH/UG (Germany)", url: "https://handelsregister.de/" },
    { id: "S-3", kind: "Meetup", label: "Berlin Tech Meetups", url: "https://www.meetup.com/find/tech/berlin" },
    { id: "S-4", kind: "API", label: "Bundesanzeiger (Announcements)", url: "https://www.bundesanzeiger.de/" },
    { id: "S-5", kind: "Crunchbase", label: "New funding (DACH)", url: "https://www.crunchbase.com/" },
  ];
}

