// Music Publishing — public landing page. Sits at /publishing.
// Sibling routes under /publishing/app/* are auth-gated by middleware.

import Link from 'next/link';

export const metadata = {
  title: 'LevelUp Publishing — Register music the right way, every time',
  description:
    'A guided workflow for registering songs with BMI, the MLC, Songtrust, SoundExchange, the US Copyright Office, and your distributor — without losing track of who owns what.',
};

export default function PublishingLanding() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Nav />
      <Hero />
      <Pillars />
      <Outputs />
      <Workflow />
      <CTA />
      <FooterStrip />
    </main>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-black/40 border-b border-white/10">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/publishing" className="font-heading text-lg font-semibold tracking-tight">
          LevelUp Publishing
        </Link>
        <nav className="flex items-center gap-6 text-sm text-white/70">
          <a href="#pillars" className="hover:text-white">What it does</a>
          <a href="#outputs" className="hover:text-white">Outputs</a>
          <a href="#workflow" className="hover:text-white">Workflow</a>
          <Link
            href="/publishing/app"
            className="rounded-full bg-white text-black px-4 py-2 font-medium hover:bg-white/90"
          >
            Open app
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200 mb-6">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Built for indie writers, publishers, and small labels
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            Register your music the right way — <span className="text-emerald-300">every</span> time.
          </h1>
          <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-xl">
            Enter your catalog once. Generate platform-ready packets for BMI, the MLC, Songtrust,
            SoundExchange, the US Copyright Office, and your distributor. Track filing status. Keep
            a permanent, auditable archive of every workbook you ever submit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/publishing/app" className="rounded-full bg-emerald-400 text-black px-6 py-3 font-medium hover:bg-emerald-300">
              Start a release
            </Link>
            <a href="#workflow" className="rounded-full border border-white/20 px-6 py-3 font-medium hover:bg-white/10">
              See the workflow
            </a>
          </div>
          <p className="mt-6 text-xs text-white/50 max-w-md">
            We don't store platform passwords. We don't automate submissions. We build the data and
            paperwork so you can review and file with confidence.
          </p>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 space-y-4">
          <div className="text-xs uppercase tracking-wider text-white/50">What you actually get</div>
          <ul className="space-y-3 text-sm">
            {[
              ['BMI Registration Packet', 'PDF + plain-text dossier'],
              ['MLC Work Workbook', '.xlsx + .json (coming soon)'],
              ['Songtrust Catalog Upload', '.csv + .xlsx (coming soon)'],
              ['SoundExchange Repertoire', '.csv + .xlsx (coming soon)'],
              ['Copyright eCO Packet', '.pdf + .txt (coming soon)'],
              ['Distributor Metadata', '.csv + .xlsx (coming soon)'],
              ['Master Workbook', '.xlsx with 10 tabs (coming soon)'],
            ].map(([title, sub]) => (
              <li key={title} className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-0">
                <span className="font-medium text-white">{title}</span>
                <span className="text-xs text-white/55 whitespace-nowrap pt-0.5">{sub}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

function Pillars() {
  const items = [
    {
      title: 'Education at every step',
      body: 'Every form explains what the field is, why it matters, who gets paid because of it, and the most common mistake writers make.',
    },
    {
      title: 'Splits that have to add up',
      body: 'Writer shares must sum to exactly 100%. Same for publisher shares. The system blocks exports until your math is right.',
    },
    {
      title: 'A locked order of operations',
      body: 'Fourteen steps, gated in order — so you can\'t accidentally generate filings before splits are approved or ISRCs are assigned.',
    },
    {
      title: 'Permanent workbook archive',
      body: 'Every file the system generates is versioned, timestamped, and downloadable forever. Nothing about a past filing ever gets overwritten.',
    },
    {
      title: 'Audit log for every change',
      body: 'Who created the org, who changed a writer\'s share, who marked a step "completed outside system" — all recorded.',
    },
    {
      title: 'You stay in control',
      body: 'We never store your BMI, MLC, or Copyright Office password. We never auto-submit. You file the packets on the official sites yourself.',
    },
  ];
  return (
    <section id="pillars" className="border-t border-white/10 bg-black/40">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-heading text-3xl md:text-4xl font-bold mb-12 max-w-2xl">
          Built around the things indie writers actually get wrong.
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p) => (
            <div key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="font-heading text-lg font-semibold mb-2">{p.title}</div>
              <p className="text-sm text-white/70 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Outputs() {
  return (
    <section id="outputs" className="border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Seven outputs. One catalog of truth.
            </h2>
            <p className="text-white/70 leading-relaxed max-w-lg">
              You enter your songs, writers, splits, and ISRCs <em>once</em>. The system fans out
              into the seven deliverables you need to file at every major royalty-collection body.
            </p>
            <p className="text-white/55 text-sm mt-6">
              We're shipping BMI first. MLC, Songtrust, SoundExchange, eCO, and Distributor follow
              as adapters; each shares the same catalog, validation, and archive layer.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-white/50 text-xs uppercase tracking-wider">
              <tr><th className="py-2">Body</th><th className="py-2">What we generate</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <Row body="BMI"            file="Registration packet — PDF + .txt" />
              <Row body="The MLC"        file="Work Registration Workbook — .xlsx + .json" />
              <Row body="Songtrust"      file="Catalog Upload — .csv + .xlsx" />
              <Row body="SoundExchange"  file="Repertoire — .csv + .xlsx" />
              <Row body="Copyright (eCO)" file="Form PA / SR Packet — PDF + .txt" />
              <Row body="Distributor"    file="Metadata — .csv + .xlsx" />
              <Row body="Master Workbook" file=".xlsx with 10 tabs covering the whole catalog" />
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Row({ body, file }: { body: string; file: string }) {
  return (
    <tr>
      <td className="py-3 pr-4 font-medium text-white">{body}</td>
      <td className="py-3 text-white/70">{file}</td>
    </tr>
  );
}

function Workflow() {
  const steps = [
    'Create your organization and invite collaborators',
    'Add artist, writer, and publisher profiles (with IPI numbers)',
    'Create a release; upload artwork',
    'Add tracks; assign ISRCs',
    'Set writer splits (must sum to 100%); request approvals',
    'Set publisher splits',
    'Validate per platform; fix blockers',
    'Generate packets; download from the archive',
    'File on each platform; log confirmation numbers',
  ];
  return (
    <section id="workflow" className="border-t border-white/10 bg-black/40">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-heading text-3xl md:text-4xl font-bold mb-10">
          The fourteen-step workflow, in order.
        </h2>
        <ol className="grid md:grid-cols-2 gap-3">
          {steps.map((s, i) => (
            <li key={s} className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <span className="font-mono text-xs text-emerald-300 mt-1">{(i + 1).toString().padStart(2, '0')}</span>
              <span className="text-sm text-white/85">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-t border-white/10">
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
          Stop losing royalties to paperwork.
        </h2>
        <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
          Set up your first release in under an hour. Generate the BMI packet, file it, and let the
          archive prove you did it right.
        </p>
        <Link href="/publishing/app" className="inline-block rounded-full bg-emerald-400 text-black px-7 py-3 font-medium hover:bg-emerald-300">
          Open the app →
        </Link>
      </div>
    </section>
  );
}

function FooterStrip() {
  return (
    <footer className="border-t border-white/10 text-xs text-white/40">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4">
        <span>LevelUp Publishing — part of the LevelUp family.</span>
        <Link href="/" className="hover:text-white/70">Wrestling app →</Link>
      </div>
    </footer>
  );
}
