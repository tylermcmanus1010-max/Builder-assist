import type { Metadata } from "next";
import PricingClient from "./pricing-client";

export const metadata: Metadata = {
  title: "Builder Assist Pricing | Core, Complete, Scale & Enterprise",
  description:
    "Compare Builder Assist software plans for contractors, builders, dealers, and multi-location construction teams.",
};

export default function BuilderAssistPricingPage() {
  return <PricingClient />;
}
