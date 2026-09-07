"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- legacy marketing shell uses hash routes */
import { useState } from "react";
import { ArrowIcon, CheckIcon } from "./pricing-icons";
import {
  billingOptions,
  plans,
  type BillingMode,
  type PlanId,
  type SoftwarePlan,
} from "./pricing-data";

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
      label: `${plan.founding} for the first 12 months`,
      badge: "Founding platform",
    };
  }

  if (billing === "annual") {
    return {
      amount: plan.annual,
      label: `${plan.annual}/mo, billed annually`,
      badge: "Annual platform",
    };
  }

  return {
    amount: plan.monthly,
    label: `${plan.monthly}/mo`,
    badge: "Monthly platform",
  };
}

function volumeCost(quantity: number, tiers: Array<{ upTo: number; rate: number }>) {
  let remaining = quantity;
  let previousLimit = 0;
  let cost = 0;

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const tierCapacity = tier.upTo === Number.POSITIVE_INFINITY
      ? remaining
      : tier.upTo - previousLimit;
    const units = Math.min(remaining, tierCapacity);
    cost += units * tier.rate;
    remaining -= units;
    previousLimit = tier.upTo;
  }

  return cost;
}

function fiftyPageCost(planId: PlanId, quantity: number) {
  if (planId === "core") return quantity * 15;
  if (planId === "complete") return quantity * 10;

  return volumeCost(quantity, [
    { upTo: 10, rate: 10 },
    { upTo: 20, rate: 8 },
    { upTo: 35, rate: 7.5 },
    { upTo: Number.POSITIVE_INFINITY, rate: 7 },
  ]);
}

function hundredPageCost(quantity: number) {
  return volumeCost(quantity, [
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
          <label className="block text-[10px] font-black leading-4 text-[#071a36]" htmlFor={id}>
            {label}
          </label>
          <small className="mt-1 block text-[7px] leading-4 text-[#6a7d96]">{helper}</small>
        </div>
        <div className="text-right">
          <strong className="block text-xl font-black text-[#0b4fd3]">{value}</strong>
          <small className="block text-[7px] font-extrabold text-[#6a7d96]">{money(cost)}/mo</small>
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
      <div className="mt-3 grid grid-cols-[34px_1fr_34px] items-center gap-3">
        <button
          aria-label={`Remove one ${label}`}
          className="grid h-8 w-8 place-items-center rounded-full border border-[#c8d7eb] bg-white text-lg font-black text-[#0b4fd3]"
          onClick={() => set(value - 1)}
          type="button"
        >
          -
        </button>
        <div className="text-center text-[7px] font-bold text-[#7a8ba0]">
          Select {min}-{max} per month
        </div>
        <button
          aria-label={`Add one ${label}`}
          className="grid h-8 w-8 place-items-center rounded-full bg-[#0b4fd3] text-lg font-black text-white"
          onClick={() => set(value + 1)}
          type="button"
        >
          +
        </button>
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
  const hundredCost = plan.hundredMax > 0 ? hundredPageCost(capacity.hundred) : 0;
  const readerCost = fiftyCost + hundredCost;
  const total = platform.amount + readerCost;
  const uploadCount = capacity.fifty + (plan.hundredMax > 0 ? capacity.hundred : 0);
  const fiftyHelper = plan.id === "core"
    ? "$15 per selected project"
    : plan.id === "complete"
      ? "$10 per selected project"
      : "Price updates with selected monthly volume";

  const cardClass = plan.featured
    ? "relative flex flex-col rounded-[26px] border-2 border-[#0b4fd3] bg-white p-6 shadow-[0_28px_72px_rgba(11,79,211,.18)]"
    : "relative flex flex-col rounded-[26px] border border-[#d9e5f7] bg-white p-6 shadow-[0_20px_60px_rgba(7,26,54,.09)]";

  return (
    <article className={cardClass}>
      {plan.featured && (
        <div className="absolute -top-3 right-5 rounded-full bg-[#0b4fd3] px-4 py-2 text-[7px] font-black tracking-[.14em] text-white">
          MOST POPULAR
        </div>
      )}

      <div className="flex items-center justify-between gap-4 text-[8px] font-black tracking-[.13em] text-[#0b4fd3]">
        <span>{plan.eyebrow}</span>
        <span className="text-right tracking-[.02em] text-[#687b94]">{plan.users}</span>
      </div>
      <h2 className="mt-4 text-[31px] font-black leading-none tracking-[-.05em] text-[#071a36]">{plan.name}</h2>
      <p className="mt-2 min-h-10 text-[10px] leading-5 text-[#5e6f89]">{plan.audience}</p>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#071a36] to-[#0b4fd3] p-5 text-white shadow-[0_16px_40px_rgba(7,26,54,.2)]" aria-live="polite">
        <div className="flex items-end justify-between gap-4">
          <div>
            <small className="block text-[7px] font-black tracking-[.13em] text-[#89dcff]">MONTHLY TOTAL</small>
            <strong className="mt-2 block text-[44px] font-black leading-none tracking-[-.065em]">{money(total)}</strong>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-2 text-[7px] font-black">
            {uploadCount} uploads
          </span>
        </div>
        <div className="mt-4 grid gap-1 border-t border-white/15 pt-3 text-[8px] text-[#c7d8ef]">
          <span className="flex justify-between gap-4"><b>Platform</b><strong className="text-white">{money(platform.amount)}</strong></span>
          <span className="flex justify-between gap-4"><b>Selected uploads</b><strong className="text-white">{money(readerCost)}</strong></span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#d9e5f7] bg-[#f7faff] px-3 py-2.5 text-[8px] text-[#5e7088]">
        <b className="text-[#0b4fd3]">{platform.badge}</b>
        <span>{platform.label}</span>
      </div>

      <div className="mt-3 grid gap-3">
        <CapacitySlider
          cost={fiftyCost}
          helper={fiftyHelper}
          id={`${plan.id}-fifty`}
          label="50 Build Plan Pages per upload"
          max={plan.fiftyMax}
          min={plan.fiftyMin}
          onChange={(fifty) => onCapacityChange({ ...capacity, fifty })}
          value={capacity.fifty}
        />

        {plan.hundredMax > 0 && (
          <CapacitySlider
            cost={hundredCost}
            helper="Price updates with selected monthly volume"
            id={`${plan.id}-hundred`}
            label="100 Build Plan Pages per upload"
            max={plan.hundredMax}
            min={plan.hundredMin}
            onChange={(hundred) => onCapacityChange({ ...capacity, hundred })}
            value={capacity.hundred}
          />
        )}
      </div>

      {plan.id === "scale" && (
        <p className="mt-3 rounded-xl border border-[#c5dbf7] bg-[#eef6ff] px-4 py-3 text-[8px] leading-4 text-[#31577f]">
          Scale starts with 5 fifty-page and 10 one-hundred-page uploads per month.
        </p>
      )}

      <ul className="my-5 grid gap-2.5 text-[9px] leading-4 text-[#3f536f]">
        {plan.highlights.map((feature) => (
          <li className="flex items-start gap-2" key={feature}>
            <CheckIcon className="h-4 w-4 shrink-0 text-[#0b4fd3]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {plan.comingSoon && plan.comingSoon.length > 0 && (
        <div className="mb-5 rounded-xl border border-[#ffb8bf] bg-[#fff1f2] px-4 py-3">
          <strong className="block text-[8px] font-black tracking-[.13em] text-[#c51d2d]">COMING SOON</strong>
          <span className="mt-1 block text-[9px] font-extrabold leading-4 text-[#8b1b27]">
            {plan.comingSoon.join(" + ")}
          </span>
        </div>
      )}

      <a
        className={plan.featured
          ? "mt-auto flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#0b4fd3] px-4 text-[11px] font-black text-white shadow-[0_12px_30px_rgba(11,79,211,.2)]"
          : "mt-auto flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#071a36] px-4 text-[11px] font-black text-white"}
        href="/index.html#/get-pricing"
      >
        Choose {plan.name.replace("Builder ", "")} at {money(total)}/mo
        <ArrowIcon className="h-4 w-4" />
      </a>
      <a className="mt-3 text-center text-[8px] font-extrabold text-[#60748f] underline underline-offset-4" href="#compare">
        Compare plans
      </a>
    </article>
  );
}

function SpecializedPlans() {
  return (
    <div className="mt-12 border-t border-[#d9e5f7] pt-10">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <span className="text-[8px] font-black tracking-[.17em] text-[#0b4fd3]">SPECIALIZED ACCOUNT OPTIONS</span>
          <h3 className="mt-3 max-w-3xl text-[34px] font-black leading-none tracking-[-.05em] text-[#071a36] sm:text-[42px]">
            Flexible paths beyond a standard platform plan.
          </h3>
        </div>
        <p className="max-w-lg text-[10px] leading-5 text-[#5e6f89]">
          Use one-off plan processing for occasional work or commission a custom quoting system designed around your company.
        </p>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <article className="relative flex h-full flex-col overflow-hidden rounded-[26px] border border-[#d9e5f7] bg-[#f7faff] p-7 shadow-[0_20px_58px_rgba(7,26,54,.08)] sm:p-8">
          <span className="text-[8px] font-black tracking-[.16em] text-[#0b4fd3]">PAY BY THE PLAN</span>
          <h4 className="mt-4 text-[30px] font-black leading-tight tracking-[-.05em] text-[#071a36]">
            Professional plan processing without a monthly commitment.
          </h4>
          <p className="mt-3 text-[10px] leading-5 text-[#5e6f89]">
            Designed for occasional bids, specialty contractors and smaller operations.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <small className="text-[7px] font-black tracking-[.12em] text-[#6a7d96]">50 BUILD PLAN PAGES</small>
              <strong className="mt-2 block text-[36px] font-black tracking-[-.05em] text-[#0b4fd3]">$75</strong>
              <span className="text-[8px] text-[#6a7d96]">per uploaded plan</span>
            </div>
            <div className="rounded-2xl bg-[#071a36] p-5 text-white shadow-lg">
              <small className="text-[7px] font-black tracking-[.12em] text-[#89dcff]">100 BUILD PLAN PAGES</small>
              <strong className="mt-2 block text-[36px] font-black tracking-[-.05em]">$135</strong>
              <span className="text-[8px] text-[#b8cae1]">per uploaded plan</span>
            </div>
          </div>
          <ul className="my-6 grid gap-2 text-[9px] leading-4 text-[#4e627d]">
            {["One-time plan-reader access", "No recurring platform fee", "Upgrade to a platform plan at any time"].map((feature) => (
              <li className="flex items-start gap-2" key={feature}><CheckIcon className="h-4 w-4 shrink-0 text-[#0b4fd3]" />{feature}</li>
            ))}
          </ul>
          <a className="mt-auto flex min-h-12 w-fit items-center gap-3 rounded-xl bg-[#0b4fd3] px-5 text-[11px] font-black text-white" href="/index.html#/get-pricing">
            Open a pay-by-the-plan account <ArrowIcon className="h-4 w-4" />
          </a>
        </article>

        <article className="relative flex h-full flex-col overflow-hidden rounded-[26px] bg-gradient-to-br from-[#071a36] via-[#0a2c67] to-[#0b4fd3] p-7 text-white shadow-[0_27px_72px_rgba(7,26,54,.25)] sm:p-8">
          <span className="text-[8px] font-black tracking-[.16em] text-[#68d4ff]">CUSTOM ENTERPRISE SYSTEM</span>
          <h4 className="mt-4 text-[30px] font-black leading-tight tracking-[-.05em]">
            A specialized quote system built for your operation.
          </h4>
          <p className="mt-3 text-[10px] leading-5 text-[#c7d7ed]">
            For window, flooring, fencing, cabinet, manufacturing, distribution and other industry-specific companies.
          </p>
          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-5">
            <small className="text-[7px] font-black tracking-[.12em] text-[#68d4ff]">ONE-TIME SYSTEM BUILD</small>
            <strong className="mt-2 block text-[36px] font-black tracking-[-.05em]">$1,500-$2,500</strong>
            <span className="text-[8px] text-[#b8cae1]">plus a custom monthly reader, hosting and support plan</span>
          </div>
          <ul className="my-6 grid gap-2 text-[9px] leading-4 text-[#dbe7f5]">
            {["Industry-specific quote logic and forms", "Growify front desk and CRM", "Assistify coordination options", "Catalog and price-book configuration"].map((feature) => (
              <li className="flex items-start gap-2" key={feature}><CheckIcon className="h-4 w-4 shrink-0 text-[#68d4ff]" />{feature}</li>
            ))}
          </ul>
          <a className="mt-auto flex min-h-12 w-fit items-center gap-3 rounded-xl bg-[#68d4ff] px-5 text-[11px] font-black text-[#071a36]" href="/index.html#/get-pricing">
            Request an enterprise build quote <ArrowIcon className="h-4 w-4" />
          </a>
        </article>
      </div>
    </div>
  );
}

export function PricingPlans({
  billing,
  setBilling,
}: {
  billing: BillingMode;
  setBilling: (mode: BillingMode) => void;
}) {
  const [capacity, setCapacity] = useState<CapacityState>(initialCapacity);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#f8fbff] to-white px-5 py-8 sm:px-[4vw] sm:py-12" id="plans">
      <div className="relative mx-auto w-full max-w-[1280px]">
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <span className="text-[9px] font-black tracking-[.17em] text-[#0b4fd3]">BUILDER ASSIST PRICING</span>
            <h1 className="mt-2 text-[38px] font-black leading-none tracking-[-.055em] text-[#071a36] sm:text-[52px]">Choose your plan.</h1>
          </div>
          <div className="grid gap-1 rounded-2xl border border-[#cfddf0] bg-[#e6eef9] p-1 sm:grid-cols-3" role="tablist" aria-label="Billing option">
            {billingOptions.map((option) => (
              <button
                aria-selected={billing === option.id}
                className={billing === option.id
                  ? "min-h-12 rounded-xl bg-white px-4 text-left text-[#0b4fd3] shadow-[0_5px_17px_rgba(7,26,54,.1)]"
                  : "min-h-12 rounded-xl bg-transparent px-4 text-left text-[#48617f]"}
                key={option.id}
                onClick={() => setBilling(option.id)}
                role="tab"
                type="button"
              >
                <strong className="block text-[10px]">{option.label}</strong>
                <small className="mt-1 block text-[7px]">{option.note}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="grid items-stretch gap-5 xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              billing={billing}
              capacity={capacity[plan.id]}
              key={plan.id}
              onCapacityChange={(next) => setCapacity((current) => ({ ...current, [plan.id]: next }))}
              plan={plan}
            />
          ))}
        </div>

        <SpecializedPlans />
        <p className="mt-5 text-[8px] leading-4 text-[#75859a]">
          Founding platform rates apply for the first 12 months. Annual platform rates are billed annually. Selected upload capacity is added to the platform rate.
        </p>
      </div>
    </section>
  );
}
