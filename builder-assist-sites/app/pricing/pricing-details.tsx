import { comparisonRows } from "./pricing-data";

export function ComparisonSection() {
  return (
    <section className="border-t border-[#d9e5f7] bg-[#f8fbff] px-5 py-20 sm:px-[6vw] sm:py-24" id="compare">
      <div className="mx-auto max-w-[1268px]">
        <div className="mb-9 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <span className="text-[8px] font-black tracking-[.16em] text-[#0b4fd3]">PLAN COMPARISON</span>
            <h2 className="mt-3 text-[38px] font-black leading-[.96] tracking-[-.055em] text-[#071a36] sm:text-[54px]">Choose by team size and workflow.</h2>
          </div>
          <p className="max-w-lg text-[11px] leading-6 text-[#5e6f89]">Core stays lean, Complete runs the full office, and Scale adds larger-team controls.</p>
        </div>

        <div className="overflow-x-auto rounded-[22px] border border-[#d9e5f7] bg-white shadow-[0_17px_42px_rgba(7,26,54,.06)]">
          <table className="w-full min-w-[850px] table-fixed border-collapse text-left text-[9px] leading-4">
            <thead>
              <tr>
                {["Compare", "Builder Core", "Builder Complete", "Builder Scale"].map((item, index) => <th className={index === 2 ? "border-r border-[#d9e5f7] bg-[#0b4fd3] p-4 text-[8px] font-black tracking-[.09em] text-white uppercase" : "border-r border-[#d9e5f7] bg-[#071a36] p-4 text-[8px] font-black tracking-[.09em] text-white uppercase"} key={item}>{item}</th>)}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label}>
                  <th className="border-r border-b border-[#d9e5f7] bg-[#f5f8fd] p-4 font-black text-[#2a4567]" scope="row">{row.label}</th>
                  <td className="border-r border-b border-[#d9e5f7] p-4 text-[#405675]">{row.core}</td>
                  <td className="border-r border-b border-[#d9e5f7] bg-[#f5f8fd] p-4 font-extrabold text-[#083b9d]">{row.complete}</td>
                  <td className="border-b border-[#d9e5f7] p-4 text-[#405675]">{row.scale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
