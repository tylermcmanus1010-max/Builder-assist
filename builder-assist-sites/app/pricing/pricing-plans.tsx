import { ArrowIcon, CheckIcon } from "./pricing-icons";
import { billingOptions, plans, type BillingMode, type SoftwarePlan } from "./pricing-data";

function priceCopy(plan: SoftwarePlan, billing: BillingMode) {
  if (billing === "founding") return { amount: plan.founding, label: "per month for the first 12 months", secondary: `$${plan.monthly} standard monthly rate`, badge: "Month-to-month founding rate" };
  if (billing === "annual") return { amount: plan.annual, label: "per month, billed annually", secondary: `$${plan.monthly}/month paid monthly`, badge: plan.annualSavings };
  return { amount: plan.monthly, label: "per month", secondary: "Standard month-to-month rate", badge: "Standard monthly rate" };
}

function PlanCard({ plan, billing }: { plan: SoftwarePlan; billing: BillingMode }) {
  const price = priceCopy(plan, billing);
  const cta = billing === "founding" ? "Apply for founding access" : `Choose ${plan.name.replace("Builder ", "")}`;
  const card = plan.featured
    ? "relative flex flex-col border-2 border-[#0b4fd3] bg-white p-7 shadow-[0_24px_58px_rgba(11,79,211,.18)] sm:p-8"
    : "relative flex flex-col border border-[#d9e5f7] bg-white p-7 shadow-[0_18px_46px_rgba(7,26,54,.07)] sm:p-8";

  return (
    <article className={card}>
      {plan.featured && <div className="absolute -top-3 right-6 bg-[#0b4fd3] px-3 py-2 text-[8px] font-black tracking-[.15em] text-white">MOST POPULAR</div>}
      <div className="flex items-center justify-between gap-4 text-[8px] font-black tracking-[.14em] text-[#0b4fd3]">
        <span>{plan.eyebrow}</span><span className="text-right tracking-[.04em] text-[#6b7d94]">{plan.users}</span>
      </div>
      <h3 className="mt-5 text-[34px] font-black leading-none tracking-[-.05em] text-[#071a36]">{plan.name}</h3>
      <p className="mt-3 min-h-16 text-xs leading-6 text-[#5e6f89]">{plan.audience}</p>
      <div className="mt-6 border-y border-[#d9e5f7] py-5" aria-live="polite">
        <div className="flex items-start text-[#071a36]">
          <span className="mt-2 text-lg font-black text-[#0b4fd3]">$</span>
          <strong className="text-[58px] font-black leading-[.9] tracking-[-.065em]">{price.amount}</strong>
          <small className="mb-1 ml-2 self-end text-[11px] font-extrabold text-[#75869c]">/mo</small>
        </div>
        <p className="mt-2 text-[11px] text-[#5e7088]">{price.label}</p>
        <div className="mt-3 grid gap-1">
          <span className="w-fit bg-[#e8f3ff] px-2 py-1.5 text-[8px] font-black tracking-[.09em] text-[#0b4fd3] uppercase">{price.badge}</span>
          <small className="text-[9px] text-[#8291a4]">{price.secondary}</small>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-px border border-[#d9e5f7] bg-[#d9e5f7]">
        {[plan.pages, plan.models].map((item, index) => (
          <div key={item} className="min-w-0 bg-[#f2f7ff] p-3.5">
            <small className="mb-1.5 block text-[7px] font-black tracking-[.13em] text-[#71849c]">{index ? "VISUALIZATION" : "PLAN PROCESSING"}</small>
            <strong className="block text-[10px] leading-4 text-[#071a36]">{item}</strong>
          </div>
        ))}
      </div>
      <ul className="my-6 grid gap-3 text-[11px] leading-4 text-[#3f536f]">
        {plan.highlights.map((feature) => <li key={feature} className="flex items-start gap-2"><CheckIcon className="h-4 w-4 shrink-0 text-[#0b4fd3]" /><span>{feature}</span></li>)}
      </ul>
      <a className={plan.featured ? "mt-auto flex min-h-12 items-center justify-center gap-3 bg-[#0b4fd3] px-4 text-xs font-black text-white shadow-[0_12px_30px_rgba(11,79,211,.2)] transition hover:-translate-y-0.5" : "mt-auto flex min-h-12 items-center justify-center gap-3 border border-[#b9cae1] px-4 text-xs font-black text-[#0b4fd3] transition hover:-translate-y-0.5 hover:border-[#0b4fd3] hover:bg-[#f2f7ff]"} href="/index.html#/get-pricing">
        {cta}<ArrowIcon className="h-4 w-4" />
      </a>
      <a className="mt-3 text-center text-[9px] font-extrabold text-[#60748f] underline underline-offset-4" href="#full-scope">Review complete plan scope</a>
    </article>
  );
}

export function PricingPlans({ billing, setBilling }: { billing: BillingMode; setBilling: (mode: BillingMode) => void }) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 py-24 sm:px-[6vw] sm:py-28" id="plans">
      <div className="mb-12 grid items-end gap-6 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
        <div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#0b4fd3]">SOFTWARE PLANS</span><h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] text-[#071a36] uppercase sm:text-[52px] lg:text-[67px]">Start at the right level.<br />Keep the whole job connected.</h2></div>
        <p className="m-0 text-[15px] leading-7 text-[#5e6f89]">Builder Complete is the full operating system. Core gives smaller contractors a complete starting workflow. Scale adds the controls required by larger organizations.</p>
      </div>
      <div className="mb-5 flex flex-col justify-between gap-5 border border-[#d9e5f7] bg-[#f2f7ff] p-5 lg:flex-row lg:items-center">
        <div><span className="block text-[8px] font-black tracking-[.16em] text-[#0b4fd3]">CHOOSE A PRICING VIEW</span><strong className="mt-1 block text-[15px] text-[#071a36]">{billing === "founding" ? "Founding-customer pricing" : billing === "annual" ? "Annual commitment pricing" : "Standard monthly pricing"}</strong></div>
        <div className="grid gap-1 bg-[#dbe7f8] p-1 sm:grid-cols-3" role="tablist" aria-label="Billing option">
          {billingOptions.map((option) => <button key={option.id} type="button" role="tab" aria-selected={billing === option.id} className={billing === option.id ? "min-h-14 bg-white px-5 text-left text-[#0b4fd3] shadow-[0_5px_18px_rgba(7,26,54,.11)]" : "min-h-14 bg-transparent px-5 text-left text-[#48617f]"} onClick={() => setBilling(option.id)}><strong className="block text-[11px]">{option.label}</strong><small className="mt-1 block text-[8px]">{option.note}</small></button>)}
        </div>
      </div>
      {billing === "founding" && <div className="mb-5 grid gap-3 border-l-4 border-[#68d4ff] bg-gradient-to-r from-[#071a36] to-[#0b3d8c] p-5 text-white lg:grid-cols-[.7fr_1.3fr] lg:items-center lg:gap-8"><div><span className="block text-[8px] font-black tracking-[.16em] text-[#68d4ff]">FOUNDING CUSTOMER PROGRAM</span><strong className="mt-1 block text-base">The discount is temporary. The value is not.</strong></div><p className="m-0 text-xs leading-5 text-[#cad9ee]">Founding customers receive the lower month-to-month rate for their first 12 months. After that period, they select standard monthly or annual pricing.</p></div>}
      <div className="grid items-stretch gap-6 xl:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} billing={billing} />)}</div>
      <article className="mt-5 grid items-center gap-8 bg-gradient-to-r from-[#071a36] to-[#0b3b88] p-7 text-white lg:grid-cols-[1.2fr_.65fr_1fr] lg:p-10">
        <div><span className="text-[8px] font-black tracking-[.17em] text-[#68d4ff]">ENTERPRISE & SUPPLIER NETWORK</span><h3 className="my-3 text-3xl font-black leading-tight tracking-[-.045em]">Configured for manufacturers, distributors, franchises and large builders.</h3><p className="m-0 text-[11px] leading-5 text-[#b9cce6]">Enterprise pricing is scoped around implementation, integrations, catalogs, processing volume, security, support and service-level requirements.</p></div>
        <div className="border border-white/20 bg-white/5 p-6"><small className="mb-2 block text-[7px] font-black tracking-[.13em] text-[#68d4ff]">INDICATIVE MONTHLY STARTING RANGE</small><strong className="block text-3xl font-black tracking-[-.05em]">$1,500-$2,500+</strong><span className="mt-2 block text-[9px] text-[#aac0dd]">Final price configured through sales</span></div>
        <div className="grid gap-2 text-[10px] leading-4 text-[#d5e1f2]">{["Implementation and migration", "Private product catalogs and dealer networks", "White-label customer experience", "Custom integrations and governance", "High-volume AI and 3D processing", "Configured security, support and service levels"].map((feature) => <span key={feature} className="flex gap-2"><CheckIcon className="h-4 w-4 shrink-0 text-[#68d4ff]" />{feature}</span>)}</div>
        <a className="flex min-h-12 items-center justify-center gap-3 bg-[#68d4ff] px-5 text-xs font-black text-[#071a36] transition hover:-translate-y-0.5 lg:col-start-3 lg:w-fit" href="/index.html#/get-pricing">Design an enterprise plan <ArrowIcon className="h-4 w-4" /></a>
      </article>
      <p className="mt-5 text-[9px] leading-4 text-[#75859a]">Founding rates apply for the first 12 months and are not lifetime prices. Annual figures are effective monthly rates billed annually. All software prices are in U.S. dollars and exclude applicable taxes, custom services and usage beyond the stated allowance.</p>
    </section>
  );
}
