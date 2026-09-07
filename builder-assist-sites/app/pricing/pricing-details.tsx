import { CheckIcon } from "./pricing-icons";
import { comparisonRows, detailedScope } from "./pricing-data";

export function ComparisonSection() {
  return (
    <section className="border-t border-[#d9e5f7] bg-[#f8fbff] px-5 py-24 sm:px-[6vw] sm:py-28" id="compare">
      <div className="mx-auto max-w-[1268px]">
        <div className="mb-12 grid items-end gap-6 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
          <div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#0b4fd3]">PLAIN-LANGUAGE PLAN COMPARISON</span><h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] text-[#071a36] uppercase sm:text-[54px]">Pick by team size, workflow and volume.</h2></div>
          <p className="m-0 text-[15px] leading-7 text-[#5e6f89]">All three plans connect the same core workflow. Complete unlocks the full operating system. Scale adds volume discounts, multi-team controls and implementation support.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-[24px] border border-[#d9e5f7] bg-white p-6 shadow-[0_16px_40px_rgba(7,26,54,.06)]"><span className="text-[8px] font-black tracking-[.15em] text-[#0b4fd3]">CORE</span><h3 className="mt-3 text-2xl font-black text-[#071a36]">Start connected.</h3><p className="mt-3 text-[10px] leading-5 text-[#5e6f89]">Best when a small team needs the main workflow and wants to keep platform and plan-reader costs lean.</p></article>
          <article className="rounded-[24px] bg-[#0b4fd3] p-6 text-white shadow-[0_22px_54px_rgba(11,79,211,.2)]"><span className="text-[8px] font-black tracking-[.15em] text-[#89dcff]">COMPLETE</span><h3 className="mt-3 text-2xl font-black">Run the whole company.</h3><p className="mt-3 text-[10px] leading-5 text-[#d5e3f5]">Best when sales, estimating, purchasing and project delivery all need to operate from the same record.</p></article>
          <article className="rounded-[24px] border border-[#bcd4f5] bg-gradient-to-br from-white to-[#eaf3ff] p-6 shadow-[0_16px_40px_rgba(7,26,54,.07)]"><span className="text-[8px] font-black tracking-[.15em] text-[#0b4fd3]">SCALE</span><h3 className="mt-3 text-2xl font-black text-[#071a36]">Control more volume.</h3><p className="mt-3 text-[10px] leading-5 text-[#5e6f89]">Best when multiple crews, locations or divisions require discounted plan volume, approvals and advanced controls.</p></article>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[24px] border border-[#d9e5f7] bg-white shadow-[0_18px_45px_rgba(7,26,54,.06)]">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-[10px] leading-4">
            <thead><tr>{["What changes", "Builder Core", "Builder Complete", "Builder Scale"].map((item, index) => <th key={item} className={index === 2 ? "border-r border-[#d9e5f7] bg-[#0b4fd3] p-5 text-[9px] font-black tracking-[.1em] text-white uppercase" : "border-r border-[#d9e5f7] bg-[#071a36] p-5 text-[9px] font-black tracking-[.1em] text-white uppercase"}>{item}</th>)}</tr></thead>
            <tbody>{comparisonRows.map((row) => <tr key={row.label}><th className="border-r border-b border-[#d9e5f7] bg-[#f2f7ff] p-5 font-black text-[#2a4567]" scope="row">{row.label}</th><td className="border-r border-b border-[#d9e5f7] p-5 text-[#405675]">{row.core}</td><td className="border-r border-b border-[#d9e5f7] bg-[#f2f7ff] p-5 font-extrabold text-[#083b9d]">{row.complete}</td><td className="border-b border-[#d9e5f7] p-5 text-[#405675]">{row.scale}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 rounded-2xl border border-[#cfe0f5] bg-white p-5 text-[10px] leading-5 text-[#526780] sm:grid-cols-3"><span><b className="text-[#071a36]">Need one-off processing?</b><br />Use Pay by the Plan.</span><span><b className="text-[#071a36]">Need a vertical-specific system?</b><br />Choose Custom Enterprise.</span><span><b className="text-[#071a36]">Need help deciding?</b><br />Builder Complete is the default full-system choice.</span></div>
      </div>
    </section>
  );
}

export function ScopeSection() {
  return (
    <section className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-5 py-24 sm:px-[6vw] sm:py-28" id="full-scope">
      <div className="mb-12 grid items-end gap-6 lg:grid-cols-[1.15fr_.85fr] lg:gap-16"><div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#0b4fd3]">COMPLETE SCOPE</span><h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] text-[#071a36] uppercase sm:text-[54px]">See what each platform level includes.</h2></div><p className="m-0 text-[15px] leading-7 text-[#5e6f89]">Plan-reader volume is adjustable. The platform level determines the workflow, team controls, reporting and implementation support around those uploads.</p></div>
      <div className="overflow-hidden rounded-[24px] border border-[#d9e5f7] bg-white shadow-[0_18px_45px_rgba(7,26,54,.06)]">{detailedScope.map((plan, index) => <details key={plan.name} open={index === 1} className="border-b border-[#d9e5f7] last:border-0"><summary className="grid min-h-24 cursor-pointer list-none grid-cols-[46px_1fr_28px] items-center gap-4 px-5 py-4 sm:grid-cols-[56px_1fr_40px] sm:gap-5"><span className={index === 1 ? "grid h-11 w-11 place-items-center rounded-xl bg-[#0b4fd3] text-[11px] font-black text-white sm:h-12 sm:w-12" : "grid h-11 w-11 place-items-center rounded-xl bg-[#f2f7ff] text-[11px] font-black text-[#0b4fd3] sm:h-12 sm:w-12"}>0{index + 1}</span><div className="grid gap-1"><strong className="text-xl font-black tracking-[-.03em] text-[#071a36]">{plan.name}</strong><small className="text-[11px] leading-5 text-[#5e6f89]">{plan.intro}</small></div><i className="text-2xl not-italic text-[#0b4fd3]">+</i></summary><div className="grid gap-4 px-5 pb-8 sm:pl-[96px] lg:grid-cols-3">{plan.groups.map((group) => <div key={group.title} className="rounded-2xl border border-[#d9e5f7] bg-[#f7faff] p-6"><h3 className="mb-4 text-xs font-black tracking-[.08em] text-[#0b4fd3] uppercase">{group.title}</h3><ul className="grid gap-2.5 text-[10px] leading-4 text-[#405675]">{group.items.map((item) => <li key={item} className="flex items-start gap-2"><CheckIcon className="h-4 w-4 shrink-0 text-[#0b4fd3]" />{item}</li>)}</ul></div>)}</div></details>)}</div>
    </section>
  );
}
