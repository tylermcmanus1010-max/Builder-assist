"use client";

import { useState } from "react";
import { type BillingMode } from "./pricing-data";
import { ArrowIcon, BrandMark } from "./pricing-icons";
import { PricingHero } from "./pricing-hero";
import { PricingPlans } from "./pricing-plans";
import { ComparisonSection, ScopeSection } from "./pricing-details";
import { FaqSection, MaterialSection } from "./pricing-info";
import { FinalCta, ModuleSection, PricingFooter, RoiSection } from "./pricing-marketing";

export default function PricingClient() {
  const [billing, setBilling] = useState<BillingMode>("founding");
  return (
    <main className="min-h-screen overflow-hidden bg-white font-sans text-[#071a36] [color-scheme:light]">
      <header className="sticky top-0 z-50 grid min-h-[70px] grid-cols-[1fr_auto] items-center gap-6 border-b border-[#071a36]/10 bg-white/95 px-5 backdrop-blur-xl sm:min-h-[84px] sm:px-[4vw] xl:grid-cols-[minmax(210px,1fr)_auto_minmax(210px,1fr)]">
        <a className="inline-flex w-fit items-center gap-3" href="/index.html" aria-label="Builder Assist home"><BrandMark className="h-9 w-9 text-[#0b4fd3] sm:h-[42px] sm:w-[42px]" /><span className="flex items-baseline gap-2 tracking-[-.035em]"><strong className="text-[13px] font-black sm:text-base">BUILDER ASSIST</strong><small className="text-[8px] font-black tracking-[.12em] text-[#0b4fd3] sm:text-[10px]">LLC</small></span></a>
        <nav className="hidden items-center gap-7 text-xs font-extrabold text-[#334866] xl:flex" aria-label="Main navigation"><a href="/index.html#products">Products</a><a className="border-b-2 border-[#0b4fd3] py-3" href="#plans" aria-current="page">Software pricing</a><a href="/index.html#autoquote">AutoQuote</a><a href="/index.html#/walkthrough">Visit the warehouse</a></nav>
        <a className="flex min-h-10 items-center justify-center gap-2 bg-[#071a36] px-3 text-[10px] font-black text-white sm:min-h-11 sm:px-5 sm:text-xs xl:justify-self-end" href="/index.html#/get-pricing">Request access <ArrowIcon className="hidden h-4 w-4 sm:block" /></a>
      </header>
      <PricingHero />
      <PricingPlans billing={billing} setBilling={setBilling} />
      <ModuleSection />
      <RoiSection />
      <ComparisonSection />
      <ScopeSection />
      <MaterialSection />
      <FaqSection />
      <FinalCta />
      <PricingFooter />
    </main>
  );
}
