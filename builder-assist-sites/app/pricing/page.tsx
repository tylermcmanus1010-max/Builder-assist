import type { Metadata } from "next";
import PricingClient from "./pricing-client";

export const metadata: Metadata = {
  title: "Builder Assist Flexible Project Pricing | Core, Complete & Scale",
  description:
    "Build a Builder Assist plan with flexible 50-page and 100-page project uploads, pay-as-you-go processing, or a custom industry-specific enterprise system.",
};

export default function BuilderAssistPricingPage() {
  return <PricingClient />;
}
