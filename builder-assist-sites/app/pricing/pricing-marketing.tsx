/* eslint-disable @next/next/no-html-link-for-pages -- legacy marketing shell uses hash routes */
import { ArrowIcon, BrandMark, CheckIcon } from "./pricing-icons";

export function ModuleSection() {
  const modules = [
    {
      title: "Growify",
      subtitle: "Front desk + CRM",
      copy: "Leads, calls, appointments, follow-up, pipeline, client communication and QuickBooks integration.",
      points: ["Replace disconnected front-desk tools", "Automate follow-up and track opportunities", "Keep customer activity in one place"],
    },
    {
      title: "Assistify",
      subtitle: "Project coordination",
      copy: "Schedules, tasks, daily logs, photos, inspections, approvals, updates and closeout.",
      points: ["Replace separate progress trackers", "Coordinate office and field teams", "Keep a complete project history"],
    },
    {
      title: "Buildify + Quotify",
      subtitle: "Plans + instant pricing",
      copy: "Plan reading, faster estimates, scope review, margin control and supplier price comparison.",
      points: ["Build quotes from uploaded plans", "Compare material and supplier pricing", "Convert approved quotes into projects"],
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#071a36] px-5 py-20 text-white sm:px-[6vw] sm:py-24" id="solution">
      <div className="relative mx-auto max-w-[1268px]">
        <div className="mb-9 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <span className="text-[8px] font-black tracking-[.16em] text-[#68d4ff]">AVAILABLE TODAY</span>
            <h2 className="mt-3 text-[38px] font-black leading-[.96] tracking-[-.055em] sm:text-[56px]">One system for the whole job.</h2>
          </div>
          <p className="max-w-lg text-[11px] leading-6 text-[#b9c9df]">Growify, Assistify, Buildify and Quotify share the same customer and project record.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {modules.map((module, index) => (
            <article className={index === 1 ? "rounded-[24px] border border-[#68d4ff]/35 bg-gradient-to-br from-[#0b4fd3]/55 to-[#68d4ff]/5 p-7" : "rounded-[24px] border border-white/15 bg-white/[.06] p-7"} key={module.title}>
              <span className="inline-flex rounded-full bg-[#48d289]/15 px-3 py-1.5 text-[7px] font-black tracking-[.11em] text-[#83efb5]">AVAILABLE NOW</span>
              <h3 className="mt-6 text-[28px] font-black tracking-[-.045em]">{module.title}</h3>
              <strong className="mt-2 block text-[10px] font-black text-[#89dcff]">{module.subtitle}</strong>
              <p className="mt-4 text-[10px] leading-5 text-[#c1d0e4]">{module.copy}</p>
              <ul className="mt-5 grid gap-2 text-[8px] leading-4 text-[#d8e4f2]">
                {module.points.map((point) => <li className="flex items-start gap-2" key={point}><CheckIcon className="h-4 w-4 shrink-0 text-[#68d4ff]" />{point}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RoiSection() {
  const metrics = [
    ["20-40", "hours returned monthly", "Less duplicate entry, status searching, estimate setup and manual follow-up."],
    ["$850+", "overlapping software value", "Modeled value of replacing separate front-desk CRM and project coordination tools."],
    ["$1.5k-$3k", "modeled labor capacity", "Twenty to forty hours valued at $75 per internal hour."],
    ["1", "connected job record", "Lead, plan, quote, schedule, approvals and closeout stay together."],
  ];

  return (
    <section className="bg-gradient-to-b from-white to-[#eef5ff] px-5 py-20 sm:px-[6vw] sm:py-24">
      <div className="mx-auto grid max-w-[1268px] items-center gap-12 lg:grid-cols-[.78fr_1.22fr] lg:gap-14">
        <div>
          <span className="text-[8px] font-black tracking-[.16em] text-[#0b4fd3]">TIME AND SOFTWARE SAVINGS</span>
          <h2 className="mt-3 text-[38px] font-black leading-[.96] tracking-[-.055em] text-[#071a36] sm:text-[54px]">Less double entry. More productive work.</h2>
          <div className="mt-6 rounded-2xl border border-[#bcd4f5] bg-white p-5 shadow-[0_14px_36px_rgba(11,79,211,.07)]">
            <small className="text-[7px] font-black tracking-[.13em] text-[#0b4fd3]">MODELED MONTHLY VALUE</small>
            <strong className="mt-2 block text-[40px] font-black tracking-[-.06em] text-[#071a36]">$2,350-$3,850+</strong>
            <p className="mt-2 text-[8px] leading-4 text-[#6a7d96]">Illustrative software and labor-capacity value. Actual savings vary by company.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map(([value, title, copy], index) => (
            <article className={index === 0 ? "min-h-[190px] rounded-[22px] bg-[#0b4fd3] p-6 text-white shadow-[0_20px_48px_rgba(11,79,211,.18)]" : "min-h-[190px] rounded-[22px] border border-[#d9e5f7] bg-white p-6 shadow-[0_15px_38px_rgba(7,26,54,.06)]"} key={title}>
              <strong className={index === 0 ? "block text-[42px] font-black tracking-[-.06em] text-[#89dcff]" : "block text-[42px] font-black tracking-[-.06em] text-[#0b4fd3]"}>{value}</strong>
              <b className="mt-2 block text-[11px]">{title}</b>
              <p className={index === 0 ? "mt-3 text-[8px] leading-4 text-[#d4e3f6]" : "mt-3 text-[8px] leading-4 text-[#5e6f89]"}>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-[#0b4fd3] px-5 py-16 text-white sm:px-[6vw]">
      <div className="mx-auto flex max-w-[1268px] flex-col justify-between gap-8 lg:flex-row lg:items-center">
        <h2 className="text-[38px] font-black leading-[.96] tracking-[-.055em] sm:text-[58px]">Choose a plan.<br />Set your monthly volume.</h2>
        <div className="max-w-lg">
          <p className="text-[11px] leading-6 text-[#d6e3f6]">Start with Core, Complete or Scale, use Pay by the Plan, or request a specialized enterprise quote system.</p>
          <a className="mt-5 inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-5 text-[11px] font-black text-[#0b4fd3]" href="/index.html#/get-pricing">Request a pricing walkthrough <ArrowIcon className="h-4 w-4" /></a>
        </div>
      </div>
    </section>
  );
}

export function PricingFooter() {
  return (
    <footer className="grid items-center gap-5 bg-[#041027] px-5 py-7 text-white sm:px-[6vw] lg:grid-cols-[1fr_1fr_auto]">
      <a className="inline-flex w-fit items-center gap-3" href="#plans" aria-label="Builder Assist pricing"><BrandMark className="h-9 w-9 text-[#68d4ff]" /><span className="flex items-baseline gap-2 tracking-[-.035em]"><strong className="text-sm font-black">BUILDER ASSIST</strong><small className="text-[8px] font-black tracking-[.12em] text-[#68d4ff]">LLC</small></span></a>
      <p className="m-0 text-[9px] text-[#8fa5c5] lg:text-center">Connected contractor workflow and build-plan pricing.</p>
      <div className="flex flex-wrap gap-4 text-[8px] text-[#9db1ce]"><a href="#plans">Plans</a><a href="#compare">Compare</a><a href="#faq">FAQ</a><span>© 2026 Builder Assist LLC</span></div>
    </footer>
  );
}
