/* eslint-disable @next/next/no-html-link-for-pages -- legacy marketing shell uses hash routes */
import { ArrowIcon, CheckIcon } from "./pricing-icons";

export function PricingHero() {
  const workflow = [
    ["01", "Lead", "Growify captures, organizes and follows up"],
    ["02", "Plans", "Choose 50-page or 100-page uploads"],
    ["03", "Quote", "Buildify and Quotify create the pricing path"],
    ["04", "Approve", "Scope, selections and decisions stay attached"],
    ["05", "Purchase", "Compare suppliers and organize orders"],
    ["06", "Build", "Assistify coordinates schedule and field progress"],
    ["07", "Grow", "Closeout feeds the next opportunity"],
  ];

  return (
    <section className="relative overflow-hidden bg-[#071a36] text-white before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_82%_5%,rgba(22,116,255,.38),transparent_31%),radial-gradient(circle_at_6%_92%,rgba(104,212,255,.16),transparent_30%)] before:content-['']">
      <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[540px] w-[540px] -translate-x-1/2 rounded-full border border-white/10" />
      <div className="relative z-10 mx-auto grid min-h-[760px] w-full max-w-[1440px] items-center gap-12 px-5 py-20 sm:px-[6vw] lg:grid-cols-[1.05fr_.95fr] lg:gap-[6vw] lg:py-24">
        <div>
          <p className="mb-6 flex items-center gap-3 text-[10px] font-black tracking-[.19em] text-[#68d4ff]"><span className="h-[3px] w-8 bg-[#68d4ff]" /> ALL-IN-ONE CONTRACTOR OPERATING SYSTEM</p>
          <h1 className="m-0 text-[42px] font-black leading-[.92] tracking-[-.065em] uppercase sm:text-[60px] xl:text-[82px]">One platform.<br /><em className="not-italic text-[#68d4ff]">Flexible project pricing.</em><br />No disconnected work.</h1>
          <p className="mt-8 max-w-[680px] text-[15px] leading-7 text-[#cad9ee] sm:text-[17px]">Run the front desk, CRM, plan reading, quoting, supplier comparison, project coordination and closeout from one connected record. Select only the monthly plan volume your team needs.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#1674ff] px-6 text-[13px] font-black shadow-[0_16px_40px_rgba(0,77,203,.35)] transition hover:-translate-y-0.5" href="#plans">Build your monthly price <ArrowIcon className="h-5 w-5" /></a>
            <a className="flex min-h-14 items-center justify-center rounded-xl border border-white/30 bg-white/5 px-6 text-[13px] font-black transition hover:-translate-y-0.5 hover:border-[#68d4ff] hover:bg-white/10" href="/index.html#/get-pricing">Request a walkthrough</a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-[11px] font-bold text-[#aebfd7]">
            {["50-page and 100-page upload options", "Adjustable monthly project volume", "Pay-as-you-go and custom enterprise paths"].map((item) => <span key={item} className="flex items-start gap-2"><CheckIcon className="h-4 w-4 shrink-0 text-[#68d4ff]" />{item}</span>)}
          </div>
          <div className="mt-8 grid max-w-[720px] gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/[.06] p-4"><small className="text-[8px] font-black tracking-[.12em] text-[#68d4ff]">GROWIFY</small><strong className="mt-2 block text-lg font-black">Front desk + CRM</strong></div>
            <div className="rounded-2xl border border-white/15 bg-white/[.06] p-4"><small className="text-[8px] font-black tracking-[.12em] text-[#68d4ff]">ASSISTIFY</small><strong className="mt-2 block text-lg font-black">Project coordination</strong></div>
            <div className="rounded-2xl border border-white/15 bg-white/[.06] p-4"><small className="text-[8px] font-black tracking-[.12em] text-[#68d4ff]">BUILDIFY + QUOTIFY</small><strong className="mt-2 block text-lg font-black">Plans + pricing</strong></div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-white/[.07] shadow-[0_32px_85px_rgba(0,0,0,.3)] backdrop-blur-xl">
          <div className="flex items-end justify-between gap-7 border-b border-white/15 p-7"><span className="text-[9px] font-black tracking-[.18em] text-[#68d4ff]">ONE CONNECTED WORKFLOW</span><strong className="text-[22px] tracking-[-.04em]">Lead to closeout</strong></div>
          <ol className="m-0 grid list-none px-6 py-3">
            {workflow.map(([number, title, description]) => <li key={number} className="grid min-h-[70px] grid-cols-[46px_1fr] items-center gap-4 border-b border-white/10 last:border-0"><span className="grid h-10 w-10 place-items-center rounded-xl border border-[#68d4ff]/40 bg-[#68d4ff]/5 text-[10px] font-black text-[#68d4ff]">{number}</span><div className="grid gap-1"><strong className="text-[13px]">{title}</strong><small className="text-[10px] leading-4 text-[#9fb3d0]">{description}</small></div></li>)}
          </ol>
          <div className="grid grid-cols-3 gap-px bg-white/15 text-center text-[8px] font-black tracking-[.09em] text-[#bcd2ed]"><span className="bg-[#04122a]/80 px-2 py-4">BUILDIFY & QUOTIFY</span><span className="bg-[#04122a]/80 px-2 py-4">ASSISTIFY</span><span className="bg-[#04122a]/80 px-2 py-4">GROWIFY</span></div>
        </div>
      </div>
    </section>
  );
}
