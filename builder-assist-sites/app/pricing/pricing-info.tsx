export function FaqSection() {
  const questions = [
    ["How do the sliders affect the monthly price?", "The selected platform rate is combined with the number and size of build-plan uploads chosen for that month."],
    ["Why does Builder Core only offer 50-page uploads?", "Core is the lean entry plan. Customers that need 100-page uploads can select Builder Complete, Builder Scale or Pay by the Plan."],
    ["Are the listed capabilities available today?", "Yes. Everything listed as included is available today. The only exceptions are items explicitly marked in red as Coming soon."],
    ["What is included in the enterprise build price?", "The $1,500-$2,500 range covers the one-time design and configuration of a specialized company quote system. Ongoing reader volume, hosting and support receive a custom monthly quote."],
  ];

  return (
    <section className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-20 sm:px-[6vw] sm:py-24 lg:grid-cols-[.72fr_1.28fr] lg:gap-14" id="faq">
      <div>
        <span className="text-[8px] font-black tracking-[.16em] text-[#0b4fd3]">PRICING QUESTIONS</span>
        <h2 className="mt-3 text-[38px] font-black leading-[.96] tracking-[-.055em] text-[#071a36] sm:text-[54px]">Simple answers.</h2>
      </div>
      <div className="overflow-hidden rounded-[22px] border border-[#d9e5f7] bg-white shadow-[0_17px_42px_rgba(7,26,54,.06)]">
        {questions.map(([question, answer], index) => (
          <details className="border-b border-[#d9e5f7] last:border-0" key={question} open={index === 0}>
            <summary className="grid min-h-17 cursor-pointer list-none grid-cols-[1fr_28px] items-center gap-4 px-5 py-4 text-[11px] font-black leading-5 text-[#071a36]"><span>{question}</span><i className="text-xl not-italic text-[#0b4fd3]">+</i></summary>
            <p className="-mt-1 mr-10 px-5 pb-5 text-[9px] leading-5 text-[#5e6f89]">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
