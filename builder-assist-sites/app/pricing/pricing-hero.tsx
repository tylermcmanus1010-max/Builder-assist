import { ArrowIcon, CheckIcon } from "./pricing-icons";

export function PricingHero() {
  const workflow = [
    ["01", "Lead", "Growify CRM and follow-up"],
    ["02", "Plans", "Uploads and project record"],
    ["03", "Price", "Takeoff, estimate and margin"],
    ["04", "Visualize", "Selections and 3D decisions"],
    ["05", "Purchase", "Compare, order and deliver"],
    ["06", "Build", "Schedule, field and approvals"],
    ["07", "Grow", "Closeout, referral and next job"],
  ];

  return (
    <section className="relative overflow-hidden bg-[#071a36] text-white before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_82%_5%,rgba(22,116,255,.34),transparent_29%),radial-gradient(circle_at_6%_92%,rgba(104,212,255,.14),transparent_28%)] before:content-['']">
      <div className="relative z-10 mx-auto grid min-h-[720px] w-full max-w-[1440px] items-center gap-12 px-5 py-20 sm:px-[6vw] lg:grid-cols-[1.08fr_.92fr] lg:gap-[6vw] lg:py-24">
        <div>
          <p className="mb-6 flex items-center gap-3 text-[10px] font-black tracking-[.19em] text-[#68d4ff]"><span className="h-[3px] w-8 bg-[#68d4ff]" /> CONTRACTOR OPERATING SYSTEM</p>
          <h1 className="m-0 text-[42px] font-black leading-[.92] tracking-[-.065em] uppercase sm:text-[60px] xl:text-[86px]">One system.<br /><em className="not-italic text-[#68d4ff]">One project record.</em><br />More profitable work.</h1>
          <p className="mt-8 max-w-[670px] text-[15px] leading-7 text-[#cad9ee] sm:text-[17px]">Connect the lead, plans, estimate, approval, purchasing, production, closeout and next sale without rebuilding the same job in disconnected software.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="flex min-h-14 items-center justify-center gap-3 bg-[#1674ff] px-6 text-[13px] font-black shadow-[0_16px_40px_rgba(0,77,203,.35)] transition hover:-translate-y-0.5" href="#plans">Compare plans <ArrowIcon className="h-5 w-5" /></a>
            <a className="flex min-h-14 items-center justify-center border border-white/30 bg-white/5 px-6 text-[13px] font-black transition hover:-translate-y-0.5 hover:border-[#68d4ff] hover:bg-white/10" href="/index.html#/get-pricing">Request a founding demo</a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-[11px] font-bold text-[#aebfd7]">
            {["Founding rates stay month-to-month for 12 months", "Unlimited external collaborators on Core and Complete", "Clear usage allowances by plan"].map((item) => <span key={item} className="flex items-start gap-2"><CheckIcon className="h-4 w-4 shrink-0 text-[#68d4ff]" />{item}</span>)}
          </div>
        </div>
        <div className="relative overflow-hidden border border-white/20 bg-white/[.07] shadow-[0_28px_70px_rgba(0,0,0,.27)] backdrop-blur-xl">
          <div className="flex items-end justify-between gap-7 border-b border-white/15 p-7"><span className="text-[9px] font-black tracking-[.18em] text-[#68d4ff]">ONE CONNECTED WORKFLOW</span><strong className="text-[22px] tracking-[-.04em]">Lead to profit</strong></div>
          <ol className="m-0 grid list-none px-6 py-3">
            {workflow.map(([number, title, description]) => <li key={number} className="grid min-h-[66px] grid-cols-[46px_1fr] items-center gap-4 border-b border-white/10 last:border-0"><span className="grid h-10 w-10 place-items-center border border-[#68d4ff]/40 text-[10px] font-black text-[#68d4ff]">{number}</span><div className="grid gap-1"><strong className="text-[13px]">{title}</strong><small className="text-[10px] text-[#9fb3d0]">{description}</small></div></li>)}
          </ol>
          <div className="grid grid-cols-3 gap-px bg-white/15 text-center text-[8px] font-black tracking-[.11em] text-[#bcd2ed]"><span className="bg-[#04122a]/80 px-2 py-3">BUILDIFY & QUOTIFY</span><span className="bg-[#04122a]/80 px-2 py-3">ASSISTIFY</span><span className="bg-[#04122a]/80 px-2 py-3">GROWIFY</span></div>
        </div>
      </div>
    </section>
  );
}
