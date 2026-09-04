import { ArrowIcon, BrandMark } from "./pricing-icons";

export function ModuleSection() {
  const modules = [
    ["01 / PRECONSTRUCTION", "Buildify & Quotify", "Plans, takeoffs, estimating, proposals, materials, purchasing comparisons and finish decisions."],
    ["02 / EXECUTION", "Assistify", "Project sequencing, schedules, field evidence, coordination, inspections, approvals and closeout."],
    ["03 / GROWTH", "Growify", "Lead management, follow-up, appointments, attribution, client communication and the next sale."],
  ];
  return (
    <section className="bg-[#071a36] px-5 py-24 text-white sm:px-[6vw] sm:py-28">
      <div className="mx-auto max-w-[1268px]">
        <div className="mb-12 grid items-end gap-6 lg:grid-cols-[1.15fr_.85fr] lg:gap-16"><div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#68d4ff]">THREE MODULES. ONE RECORD.</span><h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] uppercase sm:text-[54px] lg:text-[67px]">The value is the connection.</h2></div><p className="m-0 text-[15px] leading-7 text-[#b9c9df]">The same contact, property, estimate, project, budget and activity history move through the entire contractor lifecycle.</p></div>
        <div className="grid gap-4 lg:grid-cols-3">{modules.map(([eyebrow, title, copy], index) => <article key={title} className={index === 1 ? "min-h-[280px] border border-white/15 bg-gradient-to-br from-[#0b4fd3]/35 to-[#68d4ff]/5 p-8" : "min-h-[280px] border border-white/15 bg-white/5 p-8"}><span className="text-[8px] font-black tracking-[.16em] text-[#68d4ff]">{eyebrow}</span><h3 className="mt-16 text-[28px] font-black tracking-[-.045em]">{title}</h3><p className="mt-3 text-xs leading-6 text-[#b8c8de]">{copy}</p></article>)}</div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4 border border-white/15 p-5 text-[9px] font-black tracking-[.12em] text-[#d4e2f3]">{["ONE CONTACT", "ONE PROPERTY", "ONE ESTIMATE", "ONE PROJECT", "ONE HISTORY"].map((item, index) => <span key={item} className="flex items-center gap-4"><b>{item}</b>{index < 4 && <i className="h-px w-7 bg-[#68d4ff]" />}</span>)}</div>
      </div>
    </section>
  );
}

export function RoiSection() {
  const examples = [["$525", "7 hours saved", "Seven hours at an internal value of $75 per hour."], ["1", "Missed line item avoided", "A single material or scope omission can exceed months of fees."], ["1", "Better material order", "A stronger supplier comparison can offset the subscription."], ["1", "Additional won estimate", "Incremental contribution from one job can pay for the system."]];
  return (
    <section className="mx-auto grid w-full max-w-[1440px] items-center gap-14 px-5 py-24 sm:px-[6vw] sm:py-28 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
      <div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#0b4fd3]">WHY $499 IS DEFENSIBLE</span><h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] text-[#071a36] uppercase sm:text-[54px]">One modest operating win can cover Builder Complete.</h2><p className="my-6 text-sm leading-7 text-[#5e6f89]">The subscription is priced against business outcomes: faster estimates, fewer missed scope items, better purchasing decisions, less duplicate entry and more closed work.</p><a className="inline-flex items-center gap-3 border-b-2 border-[#0b4fd3] pb-2 text-xs font-black text-[#0b4fd3]" href="/index.html#/get-pricing">Walk through the ROI <ArrowIcon className="h-4 w-4" /></a></div>
      <div className="grid gap-px border border-[#d9e5f7] bg-[#d9e5f7] sm:grid-cols-2">{examples.map(([value, title, copy]) => <article key={title} className="min-h-[210px] bg-[#f2f7ff] p-7"><strong className="block text-[44px] font-black tracking-[-.06em] text-[#0b4fd3]">{value}</strong><span className="mt-2 block text-[13px] font-black text-[#071a36]">{title}</span><p className="mt-3 text-[11px] leading-5 text-[#5e6f89]">{copy}</p></article>)}</div>
      <p className="text-[9px] leading-4 text-[#75859a] lg:col-span-2">These examples are illustrative, not guaranteed. Builder Assist should measure and publish actual customer outcomes as the founding cohort completes real projects.</p>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="grid items-center gap-10 bg-[#0b4fd3] px-5 py-24 text-white sm:px-[6vw] lg:grid-cols-[1.15fr_.85fr] lg:gap-16"><div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#68d4ff]">FOUNDING CUSTOMER ACCESS</span><h2 className="text-[42px] font-black leading-[.94] tracking-[-.06em] uppercase sm:text-[60px] lg:text-[72px]">Price the value.<br />Discount the risk.<br /><em className="not-italic text-[#68d4ff]">Build the proof.</em></h2></div><div className="grid gap-5"><p className="m-0 text-[15px] leading-7 text-[#d6e3f6]">Start with the plan that matches your team, then run a real project through the connected Builder Assist workflow.</p><a className="flex min-h-14 w-fit items-center gap-3 bg-white px-6 text-xs font-black text-[#0b4fd3] transition hover:-translate-y-0.5" href="/index.html#/get-pricing">Request a pricing walkthrough <ArrowIcon className="h-4 w-4" /></a><small className="text-[9px] leading-4 text-[#a8c3ec]">No feature promise should replace a written scope, implementation plan and production-readiness review.</small></div></section>
  );
}

export function PricingFooter() {
  return (
    <footer className="grid items-center gap-5 bg-[#041027] px-5 py-8 text-white sm:px-[6vw] lg:grid-cols-[1fr_1fr_auto]"><a className="inline-flex w-fit items-center gap-3" href="/index.html" aria-label="Builder Assist home"><BrandMark className="h-10 w-10 text-[#68d4ff]" /><span className="flex items-baseline gap-2 tracking-[-.035em]"><strong className="text-sm font-black">BUILDER ASSIST</strong><small className="text-[8px] font-black tracking-[.12em] text-[#68d4ff]">LLC</small></span></a><p className="m-0 text-[10px] text-[#8fa5c5] lg:text-center">Construction procurement and connected contractor workflow software.</p><div className="flex flex-wrap gap-4 text-[9px] text-[#9db1ce]"><a href="/index.html">Home</a><a href="/index.html#products">Products</a><a href="/index.html#/get-pricing">Contact</a><span>© 2026 Builder Assist LLC</span></div></footer>
  );
}
