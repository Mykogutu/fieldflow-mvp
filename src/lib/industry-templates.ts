/**
 * Industry templates — see MVP-STRATEGY.md §16.4
 *
 * One product, every company. Each template is a small JSON object that
 * seeds a new workspace's configuration. Adding a new industry = adding
 * an entry here. No engineering beyond a syntax check.
 *
 * Consumed by:
 *  - Signup flow (applies template at workspace creation)
 *  - Settings page (admin can switch industry to reset defaults)
 *  - AI prompts (injected as workspace context)
 */

export type IndustryKey =
  | "PLUMBING"
  | "ELECTRICAL"
  | "HVAC"
  | "CLEANING"
  | "TANK_SERVICES"
  | "PEST_CONTROL"
  | "SOLAR"
  | "APPLIANCE_REPAIR"
  | "LOGISTICS"
  | "SECURITY"
  | "HANDYMAN"
  | "LANDSCAPING"
  | "AUTO_REPAIR"
  | "IT_SUPPORT"
  | "FUEL_TRACKER"
  | "OTHER";

export type DocumentType =
  | "Invoice"
  | "Warranty"
  | "DeliveryNote"
  | "Certificate"
  | "ServiceReport"
  | "InstallationCertificate";

export interface IndustryTemplate {
  key: IndustryKey;
  displayName: string;
  workerTitle: string;            // singular — "Plumber", "Driver", "Cleaner"
  workerTitlePlural: string;      // "Plumbers", "Drivers"
  jobLabel: string;               // singular — "Job", "Delivery", "Service Call"
  jobLabelPlural: string;         // "Jobs", "Deliveries"
  jobTypes: string[];             // 4-8 common services
  defaultWarranty: string | null; // null if industry doesn't issue warranties
  defaultDocuments: DocumentType[];
  sampleWelcome: string;          // first-message copy
  currencyHint: string | null;    // default currency guess
  whatsappTone: "professional" | "friendly" | "urgent";
  emoji: string;                  // single emoji used in briefings
}

export const INDUSTRY_TEMPLATES: Record<IndustryKey, IndustryTemplate> = {
  PLUMBING: {
    key: "PLUMBING",
    displayName: "Plumbing",
    workerTitle: "Plumber",
    workerTitlePlural: "Plumbers",
    jobLabel: "Job",
    jobLabelPlural: "Jobs",
    jobTypes: [
      "Leak Repair",
      "Drain Unblocking",
      "Pipe Installation",
      "Tap Replacement",
      "Water Heater Service",
      "Emergency Call-out",
    ],
    defaultWarranty: "30-day workmanship warranty on all repairs.",
    defaultDocuments: ["Invoice", "Warranty"],
    sampleWelcome:
      "Hi {firstName}, you'll receive plumbing jobs here on WhatsApp. Reply Accept to take a job. That's it.",
    currencyHint: null,
    whatsappTone: "professional",
    emoji: "🔧",
  },

  ELECTRICAL: {
    key: "ELECTRICAL",
    displayName: "Electrical Services",
    workerTitle: "Electrician",
    workerTitlePlural: "Electricians",
    jobLabel: "Service Call",
    jobLabelPlural: "Service Calls",
    jobTypes: [
      "Wiring Repair",
      "Socket Installation",
      "Fuse Box Service",
      "Lighting Install",
      "Compliance Inspection",
      "Emergency Fault",
    ],
    defaultWarranty:
      "90-day workmanship warranty. Components carry manufacturer warranty.",
    defaultDocuments: ["Invoice", "Warranty", "Certificate"],
    sampleWelcome:
      "Hi {firstName}, you'll get electrical service calls here on WhatsApp. Reply Accept when you can take one.",
    currencyHint: null,
    whatsappTone: "professional",
    emoji: "⚡",
  },

  HVAC: {
    key: "HVAC",
    displayName: "HVAC",
    workerTitle: "Technician",
    workerTitlePlural: "Technicians",
    jobLabel: "Service Call",
    jobLabelPlural: "Service Calls",
    jobTypes: [
      "AC Installation",
      "AC Service",
      "Refrigeration Repair",
      "Duct Cleaning",
      "Maintenance Contract",
      "Emergency Cooling",
    ],
    defaultWarranty:
      "12-month service warranty. Parts warranty per manufacturer terms.",
    defaultDocuments: ["Invoice", "Warranty", "ServiceReport"],
    sampleWelcome:
      "Hi {firstName}, HVAC service calls will come through this WhatsApp. Reply Accept to confirm.",
    currencyHint: null,
    whatsappTone: "professional",
    emoji: "❄️",
  },

  CLEANING: {
    key: "CLEANING",
    displayName: "Cleaning Services",
    workerTitle: "Cleaner",
    workerTitlePlural: "Cleaners",
    jobLabel: "Clean",
    jobLabelPlural: "Cleans",
    jobTypes: [
      "Deep Clean",
      "Regular Clean",
      "Post-Construction Clean",
      "Carpet Cleaning",
      "Window Cleaning",
      "Move-out Clean",
    ],
    defaultWarranty: null,
    defaultDocuments: ["Invoice", "ServiceReport"],
    sampleWelcome:
      "Hi {firstName}, cleaning jobs come here on WhatsApp. Reply Accept to confirm a clean.",
    currencyHint: null,
    whatsappTone: "friendly",
    emoji: "🧹",
  },

  // MVP-STRATEGY v2.0 §8 — Restore Services origin template.
  // Asset = Tank. This is the validated baseline that every other industry
  // is benchmarked against.
  TANK_SERVICES: {
    key: "TANK_SERVICES",
    displayName: "Water Tank Services",
    workerTitle: "Technician",
    workerTitlePlural: "Technicians",
    jobLabel: "Job",
    jobLabelPlural: "Jobs",
    jobTypes: [
      "Plastic Tank Repair",
      "Water Tank Cleaning",
      "Tank Disinfection",
      "Gate Valve Installation",
      "Underground Tank Repair",
      "Steel Tank Cleaning",
      "Tank Painting",
    ],
    defaultWarranty: "1 year workmanship warranty on qualifying repair jobs.",
    defaultDocuments: ["Invoice", "Warranty", "Certificate"],
    sampleWelcome:
      "Hi {firstName}, tank service jobs will come here. Reply Accept to take a job.",
    currencyHint: "KES",
    whatsappTone: "professional",
    emoji: "💧",
  },

  PEST_CONTROL: {
    key: "PEST_CONTROL",
    displayName: "Pest Control",
    workerTitle: "Technician",
    workerTitlePlural: "Technicians",
    jobLabel: "Treatment",
    jobLabelPlural: "Treatments",
    jobTypes: [
      "General Pest",
      "Termite Treatment",
      "Rodent Control",
      "Fumigation",
      "Bed Bug Treatment",
      "Follow-up Visit",
    ],
    defaultWarranty:
      "90-day retreat guarantee if pests return under normal conditions.",
    defaultDocuments: ["Invoice", "Certificate", "ServiceReport"],
    sampleWelcome:
      "Hi {firstName}, pest treatment jobs arrive here via WhatsApp. Reply Accept to take one.",
    currencyHint: null,
    whatsappTone: "professional",
    emoji: "🪲",
  },

  SOLAR: {
    key: "SOLAR",
    displayName: "Solar Installation",
    workerTitle: "Installer",
    workerTitlePlural: "Installers",
    jobLabel: "Installation",
    jobLabelPlural: "Installations",
    jobTypes: [
      "Panel Installation",
      "System Maintenance",
      "Battery Install",
      "Inverter Service",
      "Survey & Quote",
      "Performance Check",
    ],
    defaultWarranty:
      "24-month workmanship warranty. Panels and inverters carry manufacturer warranties.",
    defaultDocuments: ["Invoice", "Warranty", "InstallationCertificate"],
    sampleWelcome:
      "Hi {firstName}, solar installations will be assigned here. Reply Accept to confirm.",
    currencyHint: null,
    whatsappTone: "professional",
    emoji: "☀️",
  },

  APPLIANCE_REPAIR: {
    key: "APPLIANCE_REPAIR",
    displayName: "Appliance Repair",
    workerTitle: "Technician",
    workerTitlePlural: "Technicians",
    jobLabel: "Repair",
    jobLabelPlural: "Repairs",
    jobTypes: [
      "Fridge Repair",
      "Washing Machine",
      "Dryer Service",
      "Oven Repair",
      "Microwave",
      "Dishwasher",
    ],
    defaultWarranty:
      "60-day repair warranty on parts and labour for the same fault.",
    defaultDocuments: ["Invoice", "Warranty"],
    sampleWelcome:
      "Hi {firstName}, appliance repair jobs will come here on WhatsApp. Reply Accept to confirm.",
    currencyHint: null,
    whatsappTone: "professional",
    emoji: "🔌",
  },

  LOGISTICS: {
    key: "LOGISTICS",
    displayName: "Logistics & Delivery",
    workerTitle: "Driver",
    workerTitlePlural: "Drivers",
    jobLabel: "Delivery",
    jobLabelPlural: "Deliveries",
    jobTypes: [
      "Same-Day Delivery",
      "Next-Day Delivery",
      "Bulk Delivery",
      "Last-Mile",
      "Return Pickup",
      "Scheduled Run",
    ],
    defaultWarranty: null,
    defaultDocuments: ["Invoice", "DeliveryNote"],
    sampleWelcome:
      "Hi {firstName}, deliveries will be assigned here on WhatsApp. Reply Accept to take the run.",
    currencyHint: null,
    whatsappTone: "urgent",
    emoji: "🚚",
  },

  SECURITY: {
    key: "SECURITY",
    displayName: "Security Services",
    workerTitle: "Guard",
    workerTitlePlural: "Guards",
    jobLabel: "Deployment",
    jobLabelPlural: "Deployments",
    jobTypes: [
      "Day Shift",
      "Night Shift",
      "Event Security",
      "Patrol",
      "Escort",
      "Emergency Response",
    ],
    defaultWarranty: null,
    defaultDocuments: ["Invoice", "ServiceReport"],
    sampleWelcome:
      "Hi {firstName}, deployments will be assigned here on WhatsApp. Reply Accept to confirm your shift.",
    currencyHint: null,
    whatsappTone: "professional",
    emoji: "🛡️",
  },

  HANDYMAN: {
    key: "HANDYMAN",
    displayName: "Handyman / General Repairs",
    workerTitle: "Handyman",
    workerTitlePlural: "Handymen",
    jobLabel: "Job",
    jobLabelPlural: "Jobs",
    jobTypes: [
      "Minor Repair",
      "Furniture Assembly",
      "Painting",
      "Carpentry",
      "General Maintenance",
      "Small Install",
    ],
    defaultWarranty: "30-day workmanship warranty.",
    defaultDocuments: ["Invoice", "Warranty"],
    sampleWelcome:
      "Hi {firstName}, repair jobs will come here on WhatsApp. Reply Accept when you can take one.",
    currencyHint: null,
    whatsappTone: "friendly",
    emoji: "🔨",
  },

  LANDSCAPING: {
    key: "LANDSCAPING",
    displayName: "Landscaping / Gardens",
    workerTitle: "Gardener",
    workerTitlePlural: "Gardeners",
    jobLabel: "Visit",
    jobLabelPlural: "Visits",
    jobTypes: [
      "Lawn Mowing",
      "Hedge Trimming",
      "Garden Design",
      "Tree Pruning",
      "Irrigation Service",
      "Seasonal Cleanup",
    ],
    defaultWarranty: null,
    defaultDocuments: ["Invoice", "ServiceReport"],
    sampleWelcome:
      "Hi {firstName}, garden visits will be assigned here on WhatsApp. Reply Accept to confirm.",
    currencyHint: null,
    whatsappTone: "friendly",
    emoji: "🌿",
  },

  AUTO_REPAIR: {
    key: "AUTO_REPAIR",
    displayName: "Auto Repair / Roadside",
    workerTitle: "Mechanic",
    workerTitlePlural: "Mechanics",
    jobLabel: "Call-out",
    jobLabelPlural: "Call-outs",
    jobTypes: [
      "Roadside Assistance",
      "Battery Jump",
      "Tyre Change",
      "Diagnostic",
      "Minor Repair",
      "Towing Coordination",
    ],
    defaultWarranty: "30-day warranty on parts replaced during this call-out.",
    defaultDocuments: ["Invoice", "Warranty", "ServiceReport"],
    sampleWelcome:
      "Hi {firstName}, roadside call-outs will come here. Reply Accept to take the job.",
    currencyHint: null,
    whatsappTone: "urgent",
    emoji: "🚗",
  },

  IT_SUPPORT: {
    key: "IT_SUPPORT",
    displayName: "IT Support / Field Engineering",
    workerTitle: "Engineer",
    workerTitlePlural: "Engineers",
    jobLabel: "Ticket",
    jobLabelPlural: "Tickets",
    jobTypes: [
      "On-Site Diagnostic",
      "Network Setup",
      "Hardware Replacement",
      "Software Install",
      "Preventive Maintenance",
      "Emergency Response",
    ],
    defaultWarranty:
      "30-day fix guarantee for the reported fault under normal conditions.",
    defaultDocuments: ["Invoice", "ServiceReport"],
    sampleWelcome:
      "Hi {firstName}, IT tickets will be dispatched here on WhatsApp. Reply Accept to claim a ticket.",
    currencyHint: null,
    whatsappTone: "professional",
    emoji: "💻",
  },

  // MVP-STRATEGY v2.0 §9 — Vertical Pilot 1.
  // Asset = Vehicle. Client = Fleet Client. Job types cover the full
  // tracking + fuel-monitoring lifecycle so the pilot needs zero schema
  // changes, only this template + Asset rows.
  FUEL_TRACKER: {
    key: "FUEL_TRACKER",
    displayName: "Tracking & Fuel Monitoring",
    workerTitle: "Technician",
    workerTitlePlural: "Technicians",
    jobLabel: "Job",
    jobLabelPlural: "Jobs",
    jobTypes: [
      "Tracker Installation",
      "Fuel Sensor Installation",
      "Fuel Sensor Calibration",
      "Device Inspection",
      "Device Replacement",
      "Device Removal",
      "Device Transfer",
      "Maintenance Visit",
      "Troubleshooting Visit",
      "SIM Connectivity Issue",
      "Fleet Support Visit",
      "Fuel Monitoring System Verification",
    ],
    defaultWarranty:
      "Warranty applies as per device, installation, and service terms.",
    defaultDocuments: [
      "Invoice",
      "InstallationCertificate",
      "ServiceReport",
      "Warranty",
    ],
    sampleWelcome:
      "Hi {firstName}, tracking and fuel monitoring jobs will be assigned here on WhatsApp. Reply Accept to take a job.",
    currencyHint: "KES",
    whatsappTone: "professional",
    emoji: "📡",
  },

  OTHER: {
    key: "OTHER",
    displayName: "Other / Custom",
    workerTitle: "Technician",
    workerTitlePlural: "Technicians",
    jobLabel: "Job",
    jobLabelPlural: "Jobs",
    jobTypes: ["Service Call", "Installation", "Repair", "Maintenance"],
    defaultWarranty: "30-day workmanship warranty.",
    defaultDocuments: ["Invoice"],
    sampleWelcome:
      "Hi {firstName}, jobs will be assigned here on WhatsApp. Reply Accept to confirm.",
    currencyHint: null,
    whatsappTone: "professional",
    emoji: "📋",
  },
};

/**
 * List of template entries for UI pickers. Order = display order on signup.
 */
// Display order on signup. Restore Services (TANK_SERVICES) and Pilot 1
// (FUEL_TRACKER) lead because they're the only validated templates today.
export const INDUSTRY_LIST: IndustryTemplate[] = [
  INDUSTRY_TEMPLATES.TANK_SERVICES,
  INDUSTRY_TEMPLATES.FUEL_TRACKER,
  INDUSTRY_TEMPLATES.PLUMBING,
  INDUSTRY_TEMPLATES.ELECTRICAL,
  INDUSTRY_TEMPLATES.HVAC,
  INDUSTRY_TEMPLATES.CLEANING,
  INDUSTRY_TEMPLATES.PEST_CONTROL,
  INDUSTRY_TEMPLATES.SOLAR,
  INDUSTRY_TEMPLATES.APPLIANCE_REPAIR,
  INDUSTRY_TEMPLATES.LOGISTICS,
  INDUSTRY_TEMPLATES.SECURITY,
  INDUSTRY_TEMPLATES.HANDYMAN,
  INDUSTRY_TEMPLATES.LANDSCAPING,
  INDUSTRY_TEMPLATES.AUTO_REPAIR,
  INDUSTRY_TEMPLATES.IT_SUPPORT,
  INDUSTRY_TEMPLATES.OTHER,
];

export function getTemplate(key: string | null | undefined): IndustryTemplate {
  if (!key) return INDUSTRY_TEMPLATES.OTHER;
  const upper = key.toUpperCase() as IndustryKey;
  return INDUSTRY_TEMPLATES[upper] ?? INDUSTRY_TEMPLATES.OTHER;
}
