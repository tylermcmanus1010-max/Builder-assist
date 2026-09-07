"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- legacy marketing shell uses hash routes */
import { useState } from "react";
import { ArrowIcon, CheckIcon } from "./pricing-icons";
import { billingOptions, plans, type BillingMode, type PlanId, type SoftwarePlan } from "./pricing-data";

type CapacityState = Record<PlanId, { fifty: number; hundred: number }>;

const initialCapacity: CapacityState = {
  core: { fifty: 2, hundred: 0 },
  complete: { fifty: 6, hundred: 0 },
  scale: { fifty: 5, hundred: 10 },
};

function platformPrice(plan: SoftwarePlan, billing: BillingMode) {
  if (billing === "founding") {
    return {
      amount: plan.founding,
      label: "platform access for the first 12 months",
      secondary: `$${plan.monthly} standard platform rate after month 12`,
      badge: "Founding platform rate",
    };
  }
  if (billing === "annual") {
    return {
      amount: plan.annual,
      label: "effective platform rate, billed annually",
      secondary: `$${plan.monthly}/month paid monthly`,
      badge: plan.annualSavings,
    };
  }
  return {
    amount: plan.monthly,
    label: "standard month-to-month platform access",
    secondary: "Plan-reader capacity is added below",
    badge: "Standard platform rate",
  };
}

function progressiveCost(quantity: number, tiers: Array<{ upTo: number; rate: number }>) {
  let remaining = quantity;
  let previousLimit = 0;
  let cost = 0;

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const tierCapacity = tier.upTo === Number.POSITIVE_INFINITY ? remaining : tier.upTo - previousLimit;
    const units = Math.min(remaining, tierCapacity);
    cost += units * tier.rate;
    remaining -= units;
    previousLimit = tier.upTo;
  }

  return cost;
}

function fiftyPageCost(planId: PlanId, quantity: number) {
  if (planId !== "scale") return quantity * 10;
  return progressiveCost(quantity, [
    { upTo: 10, rate: 10 },
    { upTo: 20, rate: 8 },
    { upTo: 35, rate: 7.5 },
    { upTo: Number.POSITIVE_INFINITY, rate: 7 },
  ]);
}

function hundredPageCost(quantity: number) {
  return progressiveCost(quantity, [
    { upTo: 15, rate: 15 },
    { upTo: 25, rate: 12 },
    { upTo: Number.POSITIVE_INFINITY, rate: 10 },
  ]);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function CapacitySlider({
  id,
  label,
  helper,
  value,
  min,
  max,
  cost,
  onChange,
}: {
  id: string;
  label: string;
  helper: string;
  value: number;
  min: number;
  max: number;
  cost: number;
  onChange: (value: number) => void;
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));

  return (
    <div className="rounded-2xl border border-[#d9e5f7] bg-[#f7faff] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label className="block text-[11px] font-black leading-4 text-[#071a36]" htmlFor={id}>{label}</label>
          <small className="mt-1 block text-[8px] leading-4 text-[#6a7d96]">{helper}</small>
        </div>
        <div className="text-right">
          <strong className="block text-xl font-black text-[#0b4fd3]">{value}</strong>
          <small className="block text-[8px] font-extrabold text-[#6a7d96]">{money(cost)}/mo</small>
        </div>
      </div>
      <input
        aria-label={label}
        className="mt-4 h-2 w-full cursor-pointer accent-[#0b4fd3]"
        id={id}
        max={max}
        min={min}
        onChange={(event) => set(Number(event.target.value))}
        step="1"
        type="range"
        value={value}
      />
      <div className="mt-3 grid grid-cols-[38px_1fr_38px] items-center gap-3">
        <button aria-label={`Remove one ${label}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#c8d7eb] bg-white text-lg font-black text-[#0b4fd3] transition hover:border-[#0b4fd3]" onClick={() => set(value - 1)} type="button">-</button>
        <div className="text-center text-[8px] font-bold text-[#7a8ba0]">Choose {min}-{max} uploads per month</div>
        <button aria-label={`Add one ${label}`} className="grid h-9 w-9 place-items-center rounded-full bg-[#0b4fd3] text-lg font-black text-white shadow-[0_8px_20px_rgba(11,79,211,.2)] transition hover:-translate-y-0.5" onClick={() => set(value + 1)} type="button">+</button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  billing,
  capacity,
  onCapacityChange,
}: {
  plan: SoftwarePlan;
  billing: BillingMode;
  capacity: { fifty: number; hundred: number };
  onCapacityChange: (next: { fifty: number; hundred: number }) => void;
}) {
  const platform = platformPrice(plan, billing);
  const fiftyCost = fiftyPageCost(plan.id, capacity.fifty);
  const hundredCost = hundredPageCost(capacity.hundred);
  const readerCost = fiftyCost + hundredCost;
  const total = platform.amount + readerCost;
  const cardClass = plan.featured
    ? "relative flex flex-col rounded-[28px] border-2 border-[#0b4fd3] bg-white p-6 shadow-[0_30px_80px_rgba(11,79,211,.19)] sm:p-7"
    : "relative flex flex-col rounded-[28px] border border-[#d9e5f7] bg-white p-6 shadow-[0_22px_58px_rgba(7,26,54,.09)] sm:p-7";

  return (
    <article className={cardClass}>
      {plan.featured && <div className="absolute -top-3 right-6 rounded-full bg-[#0b4fd3] px-4 py-2 text-[8px] font-black tracking-[.15em] text-white shadow-lg">MOST POPULAR</div>}
      <div className="flex items-center justify-between gap-4 text-[8px] font-black tracking-[.14em] text-[#0b4fd3]">
        <span>{plan.eyebrow}</span>
        <span className="text-right tracking-[.04em] text-[#6b7d94]">{plan.users}</span>
      </div>
      <h3 className="mt-5 text-[32px] font-black leading-none tracking-[-.05em] text-[#071a36]">{plan.name}</h3>
      <p className="mt-3 min-h-[74px] text-[11px] leading-5 text-[#5e6f89]">{plan.audience}</p>

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#071a36] to-[#0b4fd3] p-5 text-white shadow-[0_18px_45px_rgba(7,26,54,.22)]" aria-live="polite">
        <div className="flex items-end justify-between gap-4">
          <div>
            <small className="block text-[8px] font-black tracking-[.14em] text-[#89dcff]">ESTIMATED MONTHLY TOTAL</small>
            <strong className="mt-2 block text-[48px] font-black leading-none tracking-[-.065em]">{money(total)}</strong>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-2 text-[8px] font-black">{capacity.fifty + capacity.hundred} uploads</span>
        </div>
        <div className="mt-4 grid gap-1 border-t border-white/15 pt-4 text-[9px] text-[#c7d8ef]">
          <span className="flex justify-between gap-4"><b>Platform access</b><strong className="text-white">{money(platform.amount)}</strong></span>
          <span className="flex justify-between gap-4"><b>Selected plan-reader capacity</b><strong className="text-white">{money(readerCost)}</strong></span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#d9e5f7] bg-white p-4">
        <span className="inline-flex rounded-full bg-[#e8f3ff] px-3 py-1.5 text-[8px] font-black tracking-[.08em] text-[#0b4fd3] uppercase">{platform.badge}</span>
        <p className="mt-2 text-[9px] leading-4 text-[#5e7088]">{money(platform.amount)} {platform.label}. {platform.secondary}.</p>
      </div>

      <div className="mt-4 grid gap-3">
        <CapacitySlider
          cost={fiftyCost}
          helper={plan.id === "scale" ? "Progressive tiers: $10, $8, $7.50, then $7 per project" : "$10 per selected project"}
          id={`${plan.id}-fifty`}
          label="50 Build Plan Pages per upload"
          max={plan.fiftyMax}
          min={plan.fiftyMin}
          onChange={(fifty) => onCapacityChange({ ...capacity, fifty })}
          value={capacity.fifty}
        />
        <CapacitySlider
          cost={hundredCost}
          helper="Progressive tiers: $15, then $12 after 15 and $10 after 25"
          id={`${plan.id}-hundred`}
          label="100 Build Plan Pages per upload"
          max={plan.hundredMax}
          min={plan.hundredMin}
          onChange={(hundred) => onCapacityChange({ ...capacity, hundred })}
          value={capacity.hundred}
        />
      </div>

      {plan.id === "scale" && <p className="mt-3 rounded-xl border border-[#b9d5ff] bg-[#eef6ff] px-4 py-3 text-[9px] leading-4 text-[#31577f]">Builder Scale begins with a high-volume configuration of at least 5 fifty-page uploads and 10 one-hundred-page uploads per month.</p>}

      <ul className="my-6 grid gap-3 text-[10px] leading-4 text-[#3f536f]">
        {plan.highlights.map((feature) => <li key={feature} className="flex items-start gap-2"><CheckIcon className="h-4 w-4 shrink-0 text-[#0b4fd3]" /><span>{feature}</span></li>)}
      </ul>
      <a className={plan.featured ? "mt-auto flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#0b4fd3] px-4 text-xs font-black text-white shadow-[0_12px_30px_rgba(11,79,211,.2)] transition hover:-translate-y-0.5" : "mt-auto flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#b9cae1] px-4 text-xs font-black text-[#0b4fd3] transition hover:-translate-y-0.5 hover:border-[#0b4fd3] hover:bg-[#f2f7ff]"} href="/index.html#/get-pricing">
        Choose {plan.name.replace("Builder ", "")} at {money(total)}/mo <ArrowIcon className="h-4 w-4" />
      </a>
      <a className="mt-3 text-center text-[9px] font-extrabold text-[#60748f] underline underline-offset-4" href="#full-scope">Review complete plan scope</a>
    </article>
  );
}

function SpecializedPlans() {
  return (
    <div className="mt-10">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <span className="text-[9px] font-black tracking-[.18em] text-[#0b4fd3]">SPECIALIZED OPTIONS</span>
          <h3 className="mt-3 text-[34px] font-black leading-none tracking-[-.05em] text-[#071a36] sm:text-[44px]">Built for the smallest jobs and the largest operations.</h3>
        </div>
        <p className="max-w-xl text-[12px] leading-6 text-[#5e6f89]">Pay only when you upload a plan, or commission a specialized quoting system for your company and industry.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-[28px] border border-[#d9e5f7] bg-[#f7faff] p-7 shadow-[0_22px_58px_rgba(7,26,54,.08)] sm:p-9">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#68d4ff]/20 blur-3xl" />
          <div className="relative">
            <span className="text-[9px] font-black tracking-[.17em] text-[#0b4fd3]">PAY BY THE PLAN</span>
            <h4 className="mt-4 text-[32px] font-black tracking-[-.05em] text-[#071a36]">No monthly platform commitment.</h4>
            <p className="mt-3 text-[11px] leading-5 text-[#5e6f89]">For occasional estimates, specialty contractors and small operations that only need plan-reading output when a new opportunity arrives.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm"><small className="text-[8px] font-black tracking-[.13em] text-[#6a7d96]">50 BUILD PLAN PAGES</small><strong className="mt-2 block text-[36px] font-black tracking-[-.05em] text-[#0b4fd3]">$75</strong><span className="text-[9px] text-[#6a7d96]">per uploaded plan</span></div>
              <div className="rounded-2xl bg-[#071a36] p-5 text-white shadow-lg"><small className="text-[8px] font-black tracking-[.13em] text-[#89dcff]">100 BUILD PLAN PAGES</small><strong className="mt-2 block text-[36px] font-black tracking-[-.05em]">$135</strong><span className="text-[9px] text-[#b8cae1]">per uploaded plan</span></div>
            </div>
            <a className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-xl border border-[#0b4fd3] px-5 text-xs font-black text-[#0b4fd3]" href="/index.html#/get-pricing">Open a pay-as-you-go account <ArrowIcon className="h-4 w-4" /></a>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071a36] via-[#0a2c67] to-[#0b4fd3] p-7 text-white shadow-[0_28px_75px_rgba(7,26,54,.28)] sm:p-9">
          <div className="absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-[#68d4ff]/20 blur-3xl" />
          <div className="relative">
            <span className="text-[9px] font-black tracking-[.17em] text-[#68d4ff]">CUSTOM ENTERPRISE SYSTEM</span>
            <h4 className="mt-4 text-[32px] font-black tracking-[-.05em]">Your quoting workflow, built around your business.</h4>
            <p className="mt-3 text-[11px] leading-5 text-[#c7d7ed]">Designed for window companies, flooring companies, fencing suppliers, cabinet dealers, manufacturers, distributors and other specialized operations.</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5"><small className="text-[8px] font-black tracking-[.13em] text-[#68d4ff]">ONE-TIME SYSTEM BUILD</small><strong className="mt-2 block text-[34px] font-black tracking-[-.05em]">$1,500-$2,500</strong><span className="text-[9px] text-[#b8cae1]">based on scope and configuration</span></div>
              <ul className="grid gap-2 rounded-2xl border border-white/15 bg-[#04122a]/45 p-5 text-[10px] leading-4 text-[#dbe7f5]">
                {["Industry-specific quote logic and forms", "Growify front desk, CRM and follow-up", "Assistify project coordination options", "Catalog, price-book and workflow configuration", "Custom monthly plan-reader volume and support"].map((feature) => <li className="flex items-start gap-2" key={feature}><CheckIcon className="h-4 w-4 shrink-0 text-[#68d4ff]" />{feature}</li>)}
              </ul>
            </div>
            <a className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#68d4ff] px-5 text-xs font-black text-[#071a36]" href="/index.html#/get-pricing">Design a custom company system <ArrowIcon className="h-4 w-4" /></a>
          </div>
        </article>
      </div>
    </div>
  );
}

export function PricingPlans({ billing, setBilling }: { billing: BillingMode; setBilling: (mode: BillingMode) => void }) {
  const [capacity, setCapacity] = useState<CapacityState>(initialCapacity);
  const totalUploads = plans.reduce((sum, plan) => sum + capacity[plan.id].fifty + capacity[plan.id].hundred, 0);

  return (
    <section className="relative mx-auto w-full max-w-[1440px] overflow-hidden px-5 py-24 sm:px-[6vw] sm:py-28" id="plans">
      <div className="pointer-events-none absolute left-[-160px] top-[220px] h-[420px] w-[420px] rounded-full bg-[#68d4ff]/10 blur-3xl" />
      <div className="relative">
        <div className="mb-12 grid items-end gap-6 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
          <div><span className="mb-4 block text-[10px] font-black tracking-[.19em] text-[#0b4fd3]">FLEXIBLE SOFTWARE + PLAN READER PRICING</span><h2 className="text-[39px] font-black leading-[.96] tracking-[-.06em] text-[#071a36] uppercase sm:text-[52px] lg:text-[67px]">Choose the platform.<br />Slide to the volume you need.</h2></div>
          <p className="m-0 text-[15px] leading-7 text-[#5e6f89]">Your platform rate covers the connected Builder Assist system. Your plan-reader charge changes with the number and size of plan uploads you select each month.</p>
        </div>

        <div className="mb-6 flex flex-col justify-between gap-5 rounded-2xl border border-[#d9e5f7] bg-[#f2f7ff] p-5 lg:flex-row lg:items-center">
          <div><span className="block text-[8px] font-black tracking-[.16em] text-[#0b4fd3]">CHOOSE A PLATFORM RATE</span><strong className="mt-1 block text-[15px] text-[#071a36]">{billing === "founding" ? "Founding-customer pricing" : billing === "annual" ? "Annual platform pricing" : "Standard monthly pricing"}</strong><small className="mt-1 block text-[9px] text-[#71839a]">The calculators below currently total {totalUploads} monthly uploads across all three examples.</small></div>
          <div className="grid gap-1 rounded-xl bg-[#dbe7f8] p-1 sm:grid-cols-3" role="tablist" aria-label="Billing option">
            {billingOptions.map((option) => <button key={option.id} type="button" role="tab" aria-selected={billing === option.id} className={billing === option.id ? "min-h-14 rounded-lg bg-white px-5 text-left text-[#0b4fd3] shadow-[0_5px_18px_rgba(7,26,54,.11)]" : "min-h-14 rounded-lg bg-transparent px-5 text-left text-[#48617f]"} onClick={() => setBilling(option.id)}><strong className="block text-[11px]">{option.label}</strong><small className="mt-1 block text-[8px]">{option.note}</small></button>)}
          </div>
        </div>

        <div className="mb-8 grid gap-4 rounded-2xl border-l-4 border-[#0b4fd3] bg-[#eaf3ff] p-5 lg:grid-cols-[.75fr_1.25fr] lg:items-center lg:gap-8">
          <div><span className="block text-[8px] font-black tracking-[.16em] text-[#0b4fd3]">PROGRESSIVE PROJECT PRICING</span><strong className="mt-1 block text-base text-[#071a36]">Volume discounts apply automatically as the sliders move.</strong></div>
          <p className="m-0 text-xs leading-5 text-[#4f6480]">50-page Scale pricing moves from $10 to $8 after 10 projects, $7.50 after 20 and $7 after 35. Every plan's 100-page pricing moves from $15 to $12 after 15 projects and $10 after 25. Tiers are progressive, so each threshold applies only to projects within that tier.</p>
        </div>

        <div className="grid items-stretch gap-6 xl:grid-cols-3">
          {plans.map((plan) => <PlanCard key={plan.id} plan={plan} billing={billing} capacity={capacity[plan.id]} onCapacityChange={(next) => setCapacity((current) => ({ ...current, [plan.id]: next }))} />)}
        </div>

        <SpecializedPlans />
        <p className="mt-6 text-[9px] leading-4 text-[#75859a]">Founding rates apply for the first 12 months and are not lifetime prices. Annual figures are effective monthly platform rates billed annually. Plan-reader capacity is shown as a monthly charge and may be adjusted before the next billing cycle. Unusually large scans, repeated revisions, custom data preparation and services outside the signed scope may require a separate quote.</p>
      </div>
    </section>
  );
}
