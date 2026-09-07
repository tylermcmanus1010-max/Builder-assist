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
};

export const billingOptions: Array<{ id: BillingMode; label: string; note: string }> = [
  { id: "founding", label: "Founding", note: "First 12 months" },
  { id: "monthly", label: "Monthly", note: "Standard rate" },
  { id: "annual", label: "Annual", note: "Effective monthly" },
];

export const plans: SoftwarePlan[] = [
  {
    id: "core",
    name: "Builder Core",
    eyebrow: "LEAN START",
    audience: "Owner-operators and small contractors that need the connected system without a large fixed plan-reader allowance.",
    monthly: 199,
    founding: 129,
    annual: 169,
    annualSavings: "Save $360/year on platform access",
    users: "3 internal users",
    fiftyMin: 0,
    fiftyMax: 30,
    fiftyDefault: 2,
    hundredMin: 0,
    hundredMax: 30,
    hundredDefault: 0,
    highlights: [
      "Core Growify front desk and CRM workflow",
      "Core Assistify scheduling and project tracking",
      "Buildify and Quotify plan-reader access",
      "Estimates, proposals and e-approval",
      "Margin and markup controls",
      "Basic supplier price comparison",
      "Quote-to-project conversion",
      "Unlimited external collaborators",
    ],
  },
  {
    id: "complete",
    name: "Builder Complete",
    eyebrow: "MOST POPULAR",
    audience: "Growing contractors that want the complete lead-to-closeout operating system with flexible monthly plan-reader capacity.",
    monthly: 499,
    founding: 299,
    annual: 425,
    annualSavings: "Save $888/year on platform access",
    users: "Up to 10 internal users",
    featured: true,
    fiftyMin: 0,
    fiftyMax: 50,
    fiftyDefault: 6,
    hundredMin: 0,
    hundredMax: 50,
    hundredDefault: 0,
    highlights: [
      "Full Growify front desk, CRM and follow-up",
      "Full Assistify coordination, logs and approvals",
      "Full Buildify and Quotify estimating workflow",
      "QuickBooks integration workflow",
      "Vendor RFQs, comparisons and purchase orders",
      "Advanced reporting and client communication",
      "Priority onboarding and support",
      "Unlimited external collaborators",
    ],
  },
  {
    id: "scale",
    name: "Builder Scale",
    eyebrow: "HIGH VOLUME",
    audience: "Established builders, dealers, multiple crews, branches and locations that need volume pricing and organizational controls.",
    monthly: 899,
    founding: 599,
    annual: 765,
    annualSavings: "Save $1,608/year on platform access",
    users: "25-30 internal users",
    fiftyMin: 5,
    fiftyMax: 50,
    fiftyDefault: 5,
    hundredMin: 10,
    hundredMax: 50,
    hundredDefault: 10,
    highlights: [
      "Everything in Builder Complete",
      "Multiple companies, branches or divisions",
      "Advanced roles and approval thresholds",
      "Company-specific cost books and pricing",
      "Regional supplier and catalog controls",
      "API, webhooks and advanced exports",
      "White-labeled client experience",
      "Dedicated implementation manager",
    ],
  },
];

export const detailedScope = [
  {
    name: "Builder Core",
    intro: "Connected essentials for a small team, with plan-reader capacity selected separately each month.",
    groups: [
      {
        title: "Buildify & Quotify Core",
        items: [
          "50-page and 100-page plan upload options",
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
    intro: "The complete operating system for contractors that want sales, quoting, purchasing and production in one record.",
    groups: [
      {
        title: "Front Desk + Sales",
        items: [
          "Lead intake and centralized communication",
          "Pipeline, appointments and automated follow-up",
          "QuickBooks integration workflow",
          "Branded proposals, contracts and deposits",
          "Selections, allowances and client approvals",
          "Lead-source and revenue reporting",
        ],
      },
      {
        title: "Estimating + Purchasing",
        items: [
          "AI-assisted plan reading and estimate generation",
          "Estimate review and missing-scope detection",
          "Assemblies, alternates and allowances",
          "Vendor RFQs and material comparisons",
          "Catalog and price-book imports",
          "Purchase orders and delivery tracking",
        ],
      },
      {
        title: "Production + Closeout",
        items: [
          "Schedules, dependencies and daily logs",
          "Field photos, time records and inspections",
          "Change orders and client approvals",
          "Budgets, commitments and actual costs",
          "Job profitability and payment schedules",
          "Priority onboarding and support",
        ],
      },
    ],
  },
  {
    name: "Builder Scale",
    intro: "The complete system plus volume plan pricing, multi-team controls and implementation support.",
    groups: [
      {
        title: "Organization Controls",
        items: [
          "Multiple companies, branches or divisions",
          "Advanced roles, permissions and approvals",
          "Company-specific cost books and pricing",
          "Custom workflows, forms and construction phases",
          "Regional supplier catalog controls",
          "White-labeled client experience",
        ],
      },
      {
        title: "Volume + Implementation",
        items: [
          "Progressive 50-page project pricing",
          "Progressive 100-page project pricing",
          "Company-wide dashboards and forecasts",
          "API and webhook access",
          "Advanced export and integration support",
          "Dedicated implementation manager",
        ],
      },
    ],
  },
];

export const comparisonRows = [
  {
    label: "Best fit",
    core: "Solo operators and small crews",
    complete: "Growing contractors and full offices",
    scale: "Multiple teams, branches or high volume",
  },
  {
    label: "Internal users",
    core: "3 users",
    complete: "Up to 10 users",
    scale: "25-30 users",
  },
  {
    label: "Growify",
    core: "Core CRM and front-desk workflow",
    complete: "Full CRM, automation and QuickBooks workflow",
    scale: "Full system plus branch reporting",
  },
  {
    label: "Assistify",
    core: "Core scheduling and project tracking",
    complete: "Full coordination, logs, approvals and portals",
    scale: "Multi-team controls and dashboards",
  },
  {
    label: "Buildify + Quotify",
    core: "Core plan reading and estimating",
    complete: "Full quoting, comparison and purchasing workflow",
    scale: "Full system plus cost books and regional controls",
  },
  {
    label: "50-page uploads",
    core: "$10 each",
    complete: "$10 each",
    scale: "$10, then $8, $7.50 and $7 volume tiers",
  },
  {
    label: "100-page uploads",
    core: "$15, then $12 and $10 volume tiers",
    complete: "$15, then $12 and $10 volume tiers",
    scale: "$15, then $12 and $10 volume tiers",
  },
  {
    label: "Implementation",
    core: "Guided setup",
    complete: "Priority onboarding",
    scale: "Dedicated implementation manager",
  },
  {
    label: "Advanced controls",
    core: "Standard workspace",
    complete: "Standard roles and reporting",
    scale: "Branches, approvals, API and white label",
  },
];
