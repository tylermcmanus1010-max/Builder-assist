import { CheckIcon } from "./pricing-icons";
import { comparisonRows, detailedScope } from "./pricing-data";

export function ComparisonSection() {
  return (
    <section className="border-t border-[#d9e5f7] bg-[#f8fbff] px-5 py-24 sm:px-[6vw] sm:py-28" id="compare">
      <div className="mx-auto max-w-[1268px]">
        <div className="mb-12 grid items-end gap-6 lg:grid-cols-[1.15fr_.85fr] lg:gap-16"><div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#0b4fd3]">PLAN COMPARISON</span><h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] text-[#071a36] uppercase sm:text-[54px]">See where each plan expands.</h2></div><p className="m-0 text-[15px] leading-7 text-[#5e6f89]">External collaborators are clients, vendors, subcontractors and limited-access field participants. Internal users are the people operating the platform for your company.</p></div>
        <div className="overflow-x-auto border border-[#d9e5f7] bg-white shadow-[0_18px_45px_rgba(7,26,54,.06)]"><table className="w-full min-w-[900px] table-fixed border-collapse text-left text-[10px] leading-4"><thead><tr>{["Capability", "Core", "Complete", "Scale", "Enterprise"].map((item, index) => <th key={item} className={index === 2 ? "border-r border-[#d9e5f7] bg-[#0b4fd3] p-4 text-[9px] font-black tracking-[.1em] text-white uppercase" : "border-r border-[#d9e5f7] bg-[#071a36] p-4 text-[9px] font-black tracking-[.1em] text-white uppercase"}>{item}</th>)}</tr></thead><tbody>{comparisonRows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={cell} scope="row" className="border-r border-b border-[#d9e5f7] bg-[#f2f7ff] p-4 font-black text-[#2a4567]">{cell}</th> : <td key={`${row[0]}-${cell}`} className={index === 2 ? "border-r border-b border-[#d9e5f7] bg-[#f2f7ff] p-4 font-extrabold text-[#083b9d]" : "border-r border-b border-[#d9e5f7] p-4 text-[#405675]"}>{cell}</td>)}</tr>)}</tbody></table></div>
      </div>
    </section>
  );
}

export function ScopeSection() {
  return (
    <section className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-5 py-24 sm:px-[6vw] sm:py-28" id="full-scope">
      <div className="mb-12 grid items-end gap-6 lg:grid-cols-[1.15fr_.85fr] lg:gap-16"><div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#0b4fd3]">COMPLETE SCOPE</span><h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] text-[#071a36] uppercase sm:text-[54px]">Review the commercial plan architecture.</h2></div><p className="m-0 text-[15px] leading-7 text-[#5e6f89]">Open each plan to see the fuller feature grouping used to structure Builder Assist pricing.</p></div>
      <div className="border-t border-[#d9e5f7]">{detailedScope.map((plan, index) => <details key={plan.name} open={index === 1} className="border-b border-[#d9e5f7]"><summary className="grid min-h-24 cursor-pointer list-none grid-cols-[46px_1fr_28px] items-center gap-4 py-4 sm:grid-cols-[56px_1fr_40px] sm:gap-5"><span className="grid h-11 w-11 place-items-center bg-[#f2f7ff] text-[11px] font-black text-[#0b4fd3] sm:h-12 sm:w-12">0{index + 1}</span><div className="grid gap-1"><strong className="text-xl font-black tracking-[-.03em] text-[#071a36]">{plan.name}</strong><small className="text-[11px] leading-5 text-[#5e6f89]">{plan.intro}</small></div><i className="text-2xl not-italic">+</i></summary><div className="grid gap-4 pb-8 sm:pl-[76px] lg:grid-cols-3">{plan.groups.map((group) => <div key={group.title} className="border border-[#d9e5f7] bg-[#f2f7ff] p-6"><h3 className="mb-4 text-xs font-black tracking-[.08em] text-[#0b4fd3] uppercase">{group.title}</h3><ul className="grid gap-2.5 text-[10px] leading-4 text-[#405675]">{group.items.map((item) => <li key={item} className="flex items-start gap-2"><CheckIcon className="h-4 w-4 shrink-0 text-[#0b4fd3]" />{item}</li>)}</ul></div>)}</div></details>)}</div>
    </section>
  );
}
