/* eslint-disable @next/next/no-html-link-for-pages -- legacy marketing shell uses hash routes */
import { ArrowIcon, BrandMark, CheckIcon } from "./pricing-icons";

export function ModuleSection() {
  const modules = [
    {
      eyebrow: "FRONT DESK + GROWTH",
      title: "Growify",
      value: "$350/mo estimated replacement value",
      copy: "Replace disconnected front-desk tools and standalone CRMs with lead intake, contact history, calls, appointments, pipeline stages, automated follow-up, attribution and an easy QuickBooks integration workflow.",
      points: ["Lead capture and contact history", "Appointments and follow-up", "Pipeline and revenue visibility", "QuickBooks workflow connection"],
    },
    {
      eyebrow: "PROJECT COORDINATION",
      title: "Assistify",
      value: "$500/mo estimated replacement value",
      copy: "Replace separate progress trackers and job-coordination platforms with schedules, tasks, daily records, field photos, inspections, approvals, client updates and closeout records in the same project workspace.",
      points: ["Progress and schedule tracking", "Daily logs and field evidence", "Approvals and client updates", "One searchable project record"],
    },
    {
      eyebrow: "PLANS + PRICING",
      title: "Buildify & Quotify",
      value: "A differentiated quoting engine",
      copy: "Upload a build plan, generate a faster quote, review scope, control margin and compare supplier pricing without rebuilding the same estimate across multiple systems.",
      points: ["Plan-assisted instant quoting", "Scope and estimate review", "Supplier price comparison", "Quote-to-project conversion"],
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#071a36] px-5 py-24 text-white sm:px-[6vw] sm:py-28">
      <div className="pointer-events-none absolute right-[-120px] top-[-160px] h-[420px] w-[420px] rounded-full bg-[#1674ff]/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-180px] left-[-80px] h-[360px] w-[360px] rounded-full bg-[#68d4ff]/10 blur-3xl" />
      <div className="relative mx-auto max-w-[1268px]">
        <div className="mb-12 grid items-end gap-6 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
          <div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#68d4ff]">THREE SYSTEMS. ONE LOGIN. ONE RECORD.</span><h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] uppercase sm:text-[54px] lg:text-[67px]">Our all-in-one solution.</h2></div>
          <p className="m-0 text-[15px] leading-7 text-[#b9c9df]">Instead of paying for and maintaining a front-desk CRM, a project-management platform and a separate estimating workflow, Builder Assist connects all three around the same customer and job.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {modules.map((module, index) => (
            <article key={module.title} className={index === 1 ? "relative overflow-hidden rounded-[26px] border border-[#68d4ff]/35 bg-gradient-to-br from-[#0b4fd3]/55 to-[#68d4ff]/5 p-7 shadow-[0_26px_65px_rgba(0,0,0,.2)]" : "relative overflow-hidden rounded-[26px] border border-white/15 bg-white/[.06] p-7 shadow-[0_20px_55px_rgba(0,0,0,.14)]"}>
              <span className="text-[8px] font-black tracking-[.16em] text-[#68d4ff]">{module.eyebrow}</span>
              <h3 className="mt-8 text-[30px] font-black tracking-[-.045em]">{module.title}</h3>
              <strong className="mt-3 block text-[11px] font-black text-[#89dcff]">{module.value}</strong>
              <p className="mt-5 text-[11px] leading-5 text-[#c1d0e4]">{module.copy}</p>
              <ul className="mt-6 grid gap-2.5 text-[9px] leading-4 text-[#d8e4f2]">{module.points.map((point) => <li className="flex items-start gap-2" key={point}><CheckIcon className="h-4 w-4 shrink-0 text-[#68d4ff]" />{point}</li>)}</ul>
            </article>
          ))}
        </div>

        <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 text-center text-[9px] font-black tracking-[.1em] text-[#d4e2f3] sm:grid-cols-5">{["ONE CONTACT", "ONE PROPERTY", "ONE QUOTE", "ONE PROJECT", "ONE HISTORY"].map((item) => <span className="bg-[#04122a]/90 px-4 py-4" key={item}>{item}</span>)}</div>
        <p className="mt-5 text-[9px] leading-4 text-[#839ab9]">Replacement-value figures are Builder Assist planning estimates for comparable categories of software, not guaranteed customer savings or a statement that every competitor charges the same amount.</p>
      </div>
    </section>
  );
}

export function RoiSection() {
  const metrics = [
    ["20-40", "hours returned each month", "Modeled reduction in duplicate entry, follow-up, estimate setup, project-status searching and manual coordination."],
    ["$850+", "monthly software overlap removed", "Growify and Assistify alone are modeled against approximately $350 and $500 per month in separate-tool value."],
    ["$1.5k-$3k", "modeled monthly labor value", "Twenty to forty hours valued at $75 per internal hour. Your actual labor value may differ."],
    ["1", "connected source of truth", "The lead, plan, quote, approval, schedule, field record and closeout stay attached to one job."],
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#eef5ff] px-5 py-24 sm:px-[6vw] sm:py-28">
      <div className="mx-auto grid max-w-[1268px] items-center gap-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <div>
          <span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#0b4fd3]">TIME BACK + TOOLS ELIMINATED</span>
          <h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] text-[#071a36] uppercase sm:text-[54px]">More work completed. Less software managed.</h2>
          <p className="my-6 text-sm leading-7 text-[#5e6f89]">The real savings come from combining front-desk work, estimating and field coordination. Teams stop entering the same customer and job repeatedly, stop hunting through separate systems and move from lead to quote to production faster.</p>
          <div className="rounded-2xl border border-[#bcd4f5] bg-white p-5 shadow-[0_16px_40px_rgba(11,79,211,.08)]">
            <small className="text-[8px] font-black tracking-[.14em] text-[#0b4fd3]">MODELED MONTHLY VALUE RANGE</small>
            <strong className="mt-2 block text-[42px] font-black tracking-[-.06em] text-[#071a36]">$2,350-$3,850+</strong>
            <p className="mt-2 text-[9px] leading-4 text-[#6a7d96]">Illustrative combination of $850+ in overlapping software value and $1,500-$3,000 in recovered labor capacity. Buildify and Quotify revenue impact is not included.</p>
          </div>
          <a className="mt-6 inline-flex items-center gap-3 border-b-2 border-[#0b4fd3] pb-2 text-xs font-black text-[#0b4fd3]" href="/index.html#/get-pricing">Model your team's savings <ArrowIcon className="h-4 w-4" /></a>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map(([value, title, copy], index) => <article key={title} className={index === 0 ? "min-h-[230px] rounded-[24px] bg-[#0b4fd3] p-7 text-white shadow-[0_24px_58px_rgba(11,79,211,.2)]" : "min-h-[230px] rounded-[24px] border border-[#d9e5f7] bg-white p-7 shadow-[0_18px_45px_rgba(7,26,54,.07)]"}><strong className={index === 0 ? "block text-[46px] font-black tracking-[-.06em] text-[#89dcff]" : "block text-[46px] font-black tracking-[-.06em] text-[#0b4fd3]"}>{value}</strong><span className={index === 0 ? "mt-2 block text-[13px] font-black text-white" : "mt-2 block text-[13px] font-black text-[#071a36]"}>{title}</span><p className={index === 0 ? "mt-3 text-[10px] leading-5 text-[#d4e3f6]" : "mt-3 text-[10px] leading-5 text-[#5e6f89]"}>{copy}</p></article>)}
        </div>
        <p className="text-[9px] leading-4 text-[#75859a] lg:col-span-2">These figures are modeled planning assumptions, not guaranteed results. Actual time and cost savings depend on team size, current tools, project volume, adoption, labor cost and workflow complexity. Builder Assist should replace these estimates with measured customer data as it becomes available.</p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-[#0b4fd3] px-5 py-24 text-white sm:px-[6vw]">
      <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#68d4ff]/25 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1268px] items-center gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-16"><div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#68d4ff]">BUILD YOUR MONTHLY CONFIGURATION</span><h2 className="text-[42px] font-black leading-[.94] tracking-[-.06em] uppercase sm:text-[60px] lg:text-[72px]">One platform.<br />The project volume<br /><em className="not-italic text-[#68d4ff]">you actually need.</em></h2></div><div className="grid gap-5"><p className="m-0 text-[15px] leading-7 text-[#d6e3f6]">Select a platform, choose your 50-page and 100-page plan volume, or request a custom industry-specific quote system.</p><a className="flex min-h-14 w-fit items-center gap-3 rounded-xl bg-white px-6 text-xs font-black text-[#0b4fd3] transition hover:-translate-y-0.5" href="/index.html#/get-pricing">Request a pricing walkthrough <ArrowIcon className="h-4 w-4" /></a><small className="text-[9px] leading-4 text-[#a8c3ec]">Final pricing, features, volume rules and integration scope are confirmed in the written order form.</small></div></div>
    </section>
  );
}

export function PricingFooter() {
  return (
    <footer className="grid items-center gap-5 bg-[#041027] px-5 py-8 text-white sm:px-[6vw] lg:grid-cols-[1fr_1fr_auto]"><a className="inline-flex w-fit items-center gap-3" href="/index.html" aria-label="Builder Assist home"><BrandMark className="h-10 w-10 text-[#68d4ff]" /><span className="flex items-baseline gap-2 tracking-[-.035em]"><strong className="text-sm font-black">BUILDER ASSIST</strong><small className="text-[8px] font-black tracking-[.12em] text-[#68d4ff]">LLC</small></span></a><p className="m-0 text-[10px] text-[#8fa5c5] lg:text-center">Connected contractor workflow, plan reading and project operations.</p><div className="flex flex-wrap gap-4 text-[9px] text-[#9db1ce]"><a href="/index.html">Home</a><a href="/index.html#products">Products</a><a href="/index.html#/get-pricing">Contact</a><span>© 2026 Builder Assist LLC</span></div></footer>
  );
}
