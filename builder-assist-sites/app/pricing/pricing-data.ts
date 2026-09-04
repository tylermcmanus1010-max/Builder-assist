export type BillingMode = "founding" | "monthly" | "annual";

export type SoftwarePlan = {
  id: "core" | "complete" | "scale";
  name: string;
  eyebrow: string;
  audience: string;
  monthly: number;
  founding: number;
  annual: number;
  annualSavings: string;
  users: string;
  pages: string;
  models: string;
  featured?: boolean;
  highlights: string[];
};

export const billingOptions: Array<{ id: BillingMode; label: string; note: string }> = [
  { id: "founding", label: "Founding", note: "First 12 months" },
  { id: "monthly", label: "Monthly", note: "Standard rate" },
  { id: "annual", label: "Annual", note: "About 15% less" },
];

export const plans: SoftwarePlan[] = [
  {
    id: "core",
    name: "Builder Core",
    eyebrow: "START HERE",
    audience: "Owner-operators and small contractors replacing spreadsheets and disconnected basic tools.",
    monthly: 199,
    founding: 129,
    annual: 169,
    annualSavings: "Save $360/year",
    users: "3 internal users",
    pages: "250 AI plan pages / month",
    models: "2 3D conversions / month",
    highlights: [
      "Plan and specification uploads",
      "Digital takeoffs and basic assemblies",
      "Estimates, proposals and e-approval",
      "Margin and markup controls",
      "Basic supplier comparison",
      "Quote-to-project conversion",
      "Core project, client and CRM tools",
      "Unlimited external collaborators",
    ],
  },
  {
    id: "complete",
    name: "Builder Complete",
    eyebrow: "MOST POPULAR",
    audience: "Growing contractors that want one connected system from the first lead through closeout.",
    monthly: 499,
    founding: 299,
    annual: 425,
    annualSavings: "Save $888/year",
    users: "Up to 10 internal users",
    pages: "1,500 AI plan pages / month",
    models: "10 3D conversions / month",
    featured: true,
    highlights: [
      "Full Buildify, Assistify and Growify access",
      "AI-assisted takeoff and estimate generation",
      "Estimate review and missing-scope detection",
      "Interactive selections and 3D visualization",
      "Vendor RFQs, material comparisons and POs",
      "Schedules, daily logs and field records",
      "Advanced CRM and automated follow-up",
      "Priority onboarding and support",
    ],
  },
  {
    id: "scale",
    name: "Builder Scale",
    eyebrow: "MULTI-TEAM",
    audience: "Established builders, dealers, multiple crews, branches, divisions and locations.",
    monthly: 899,
    founding: 599,
    annual: 765,
    annualSavings: "Save $1,608/year",
    users: "25-30 internal users",
    pages: "5,000 AI plan pages / month",
    models: "30 3D conversions / month",
    highlights: [
      "Multiple companies, branches or divisions",
      "Advanced roles and approval thresholds",
      "Company-specific cost books and pricing",
      "Regional supplier and catalog controls",
      "Advanced dashboards and profitability forecasts",
      "API, webhooks and advanced data exports",
      "White-labeled client experience",
      "Dedicated implementation manager",
    ],
  },
];

export const detailedScope = [
  {
    name: "Builder Core",
    intro: "A complete entry-level workflow rather than a restricted product demo.",
    groups: [
      {
        title: "Buildify & Quotify Core",
        items: [
          "Plan and specification uploads",
          "Digital takeoffs and basic assemblies",
          "Estimates, proposals and e-approval",
          "Margin and markup controls",
          "Basic supplier comparison",
          "Quote-to-project conversion",
        ],
      },
      {
        title: "Assistify + Growify Core",
        items: [
          "Project dashboard, tasks and schedule",
          "Photos, documents and client portal",
          "Contact database and opportunity pipeline",
          "Lead-source and appointment tracking",
          "Basic reminders and activity history",
          "Standard support and setup guides",
        ],
      },
    ],
  },
  {
    name: "Builder Complete",
    intro: "The full connected operating system and the primary Builder Assist commercial plan.",
    groups: [
      {
        title: "Preconstruction + Sales",
        items: [
          "AI-assisted takeoff and estimate generation",
          "Estimate review and missing-scope detection",
          "Assemblies, alternates and allowances",
          "Branded proposals, contracts and deposits",
          "Selections and interactive 3D visualization",
          "Advanced CRM and automated follow-up",
        ],
      },
      {
        title: "Purchasing + Production",
        items: [
          "Vendor RFQs and material comparisons",
          "Catalog and price-book imports",
          "Purchase orders and delivery tracking",
          "Schedules, dependencies and daily logs",
          "Field photos, time records and inspections",
          "Change orders and client approvals",
        ],
      },
      {
        title: "Financials + Growth",
        items: [
          "Budgets, commitments and actual costs",
          "Job profitability and payment schedules",
          "Client and subcontractor portals",
          "Lead-source, pipeline and revenue reporting",
          "Calendar and accounting integrations",
          "Priority onboarding and support",
        ],
      },
    ],
  },
  {
    name: "Builder Scale",
    intro: "Controls, reporting and implementation for organizational complexity, not just additional seats.",
    groups: [
      {
        title: "Enterprise-style Controls",
        items: [
          "Multiple companies, branches or divisions",
          "Advanced roles, permissions and approval thresholds",
          "Company-specific cost books and pricing",
          "Custom workflows, forms and construction phases",
          "Regional pricing and supplier catalog controls",
          "White-labeled client experience",
        ],
      },
      {
        title: "Scale + Implementation",
        items: [
          "Company-wide dashboards and profitability forecasts",
          "Advanced purchasing and supplier performance reports",
          "API and webhook access",
          "Advanced data exports and integration support",
          "Dedicated implementation manager",
          "Quarterly strategic account review",
        ],
      },
    ],
  },
];

export const comparisonRows = [
  ["Internal office users", "3", "Up to 10", "25-30", "Configured"],
  ["External collaborators", "Unlimited", "Unlimited", "Included", "Configured"],
  ["AI plan pages / month", "250", "1,500", "5,000", "High-volume"],
  ["3D conversions / month", "2", "10", "30", "Custom volume"],
  ["Estimating + proposals", "Core", "Full", "Full + controls", "Custom"],
  ["Supplier + purchasing", "Basic compare", "RFQs, POs, delivery", "Regional controls", "Network-scale"],
  ["Project execution", "Core", "Full", "Multi-team", "Custom workflows"],
  ["CRM + automation", "Basic", "Advanced", "Advanced reporting", "Custom"],
  ["Roles + branch controls", "-", "Standard", "Advanced", "Custom governance"],
  ["API + webhooks", "-", "-", "Included", "Custom integrations"],
  ["Implementation", "Setup guides", "Priority onboarding", "Dedicated manager", "Scoped migration"],
  ["White label", "-", "-", "Client experience", "Private-branded"],
];
