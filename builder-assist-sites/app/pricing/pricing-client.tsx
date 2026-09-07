/* eslint-disable @next/next/no-html-link-for-pages -- legacy marketing shell uses hash routes */
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
      <header className="sticky top-0 z-50 border-b border-[#071a36]/10 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-[4vw]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto] items-center gap-5 xl:grid-cols-[minmax(230px,1fr)_auto_minmax(230px,1fr)]">
          <a className="inline-flex w-fit items-center gap-3" href="/index.html" aria-label="Builder Assist home"><BrandMark className="h-9 w-9 text-[#0b4fd3] sm:h-[42px] sm:w-[42px]" /><span className="flex items-baseline gap-2 tracking-[-.035em]"><strong className="text-[13px] font-black sm:text-base">BUILDER ASSIST</strong><small className="text-[8px] font-black tracking-[.12em] text-[#0b4fd3] sm:text-[10px]">LLC</small></span></a>
          <nav className="hidden items-center gap-2 rounded-full border border-[#d9e5f7] bg-[#f7faff] p-1 text-[10px] font-extrabold text-[#334866] xl:flex" aria-label="Main navigation"><a className="rounded-full px-4 py-2.5 hover:bg-white" href="#plans">Build a price</a><a className="rounded-full px-4 py-2.5 hover:bg-white" href="#compare">Compare plans</a><a className="rounded-full px-4 py-2.5 hover:bg-white" href="#full-scope">Full scope</a><a className="rounded-full px-4 py-2.5 hover:bg-white" href="/index.html#products">Products</a></nav>
          <a className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#071a36] px-4 text-[10px] font-black text-white shadow-[0_10px_25px_rgba(7,26,54,.16)] transition hover:-translate-y-0.5 sm:px-5 sm:text-xs xl:justify-self-end" href="/index.html#/get-pricing">Request access <ArrowIcon className="hidden h-4 w-4 sm:block" /></a>
        </div>
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
