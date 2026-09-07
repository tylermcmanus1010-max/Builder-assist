export type BillingMode = "founding" | "monthly" | "annual";
export type PlanId = "core" | "complete" | "scale";

export type SoftwarePlan = {
  id: PlanId;
  name: string;
  eyebrow: string;
  audience: string;
  monthly: number;
  founding: number;
  annual: number;
  annualSavings: string;
  users: string;
  featured?: boolean;
  fiftyMin: number;
  fiftyMax: number;
  fiftyDefault: number;
  hundredMin: number;
  hundredMax: number;
  hundredDefault: number;
  highlights: string[];
  comingSoon?: string[];
};

export const billingOptions: Array<{ id: BillingMode; label: string; note: string }> = [
  { id: "founding", label: "Founding", note: "First 12 months" },
  { id: "monthly", label: "Monthly", note: "Standard" },
  { id: "annual", label: "Annual", note: "Billed annually" },
];

export const plans: SoftwarePlan[] = [
  {
    id: "core",
    name: "Builder Core",
    eyebrow: "LEAN START",
    audience: "For owner-operators and small crews.",
    monthly: 199,
    founding: 129,
    annual: 169,
    annualSavings: "Save $360/year",
    users: "3 internal users",
    fiftyMin: 0,
    fiftyMax: 30,
    fiftyDefault: 2,
    hundredMin: 0,
    hundredMax: 0,
    hundredDefault: 0,
    highlights: [
      "Growify front desk and CRM",
      "Assistify scheduling and project tracking",
      "Buildify and Quotify plan-reader access",
      "Estimates, proposals and e-approval",
      "Supplier price comparison",
      "Unlimited external collaborators",
    ],
  },
  {
    id: "complete",
    name: "Builder Complete",
    eyebrow: "MOST POPULAR",
    audience: "For growing contractors running sales, estimating and production together.",
    monthly: 499,
    founding: 299,
    annual: 425,
    annualSavings: "Save $888/year",
    users: "Up to 7 internal users",
    featured: true,
    fiftyMin: 0,
    fiftyMax: 50,
    fiftyDefault: 6,
    hundredMin: 0,
    hundredMax: 50,
    hundredDefault: 0,
    highlights: [
      "Full Growify CRM and follow-up",
      "Full Assistify coordination and approvals",
      "Full Buildify and Quotify workflow",
      "QuickBooks integration",
      "Vendor RFQs and purchase orders",
      "Priority onboarding and support",
    ],
    comingSoon: ["Step-by-Step 3D Model"],
  },
  {
    id: "scale",
    name: "Builder Scale",
    eyebrow: "HIGH VOLUME",
    audience: "For established builders, multiple crews and higher plan volume.",
    monthly: 899,
    founding: 599,
    annual: 765,
    annualSavings: "Save $1,608/year",
    users: "Up to 12 internal users",
    fiftyMin: 5,
    fiftyMax: 50,
    fiftyDefault: 5,
    hundredMin: 10,
    hundredMax: 50,
    hundredDefault: 10,
    highlights: [
      "Everything in Builder Complete",
      "Multiple companies or divisions",
      "Advanced roles and approvals",
      "Company-specific cost books",
      "API, webhooks and advanced exports",
      "Dedicated implementation manager",
    ],
    comingSoon: ["Step-by-Step 3D Model", "Redlining"],
  },
];

export const comparisonRows = [
  {
    label: "Best for",
    core: "Owner-operators and small crews",
    complete: "Growing contractors and full offices",
    scale: "Established builders and multiple teams",
  },
  {
    label: "Internal users",
    core: "3 users",
    complete: "Up to 7 users",
    scale: "Up to 12 users",
  },
  {
    label: "Growify",
    core: "Core front desk and CRM",
    complete: "Full CRM, automation and QuickBooks",
    scale: "Full system with company-wide reporting",
  },
  {
    label: "Assistify",
    core: "Scheduling and project tracking",
    complete: "Full coordination, logs and approvals",
    scale: "Multi-team controls and dashboards",
  },
  {
    label: "Buildify + Quotify",
    core: "Core plan reading and estimating",
    complete: "Full quoting and purchasing workflow",
    scale: "Full system with advanced cost controls",
  },
  {
    label: "50-page uploads",
    core: "$15 per selected project",
    complete: "$10 per selected project",
    scale: "Calculated from selected monthly volume",
  },
  {
    label: "100-page uploads",
    core: "Not available",
    complete: "Calculated from selected monthly volume",
    scale: "Calculated from selected monthly volume",
  },
  {
    label: "Coming soon",
    core: "None listed",
    complete: "Step-by-Step 3D Model",
    scale: "Step-by-Step 3D Model + Redlining",
  },
];
