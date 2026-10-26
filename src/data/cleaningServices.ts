// Cleaning services around Sohna / Gurugram, gathered from each provider's
// own page or public business listing on 24 Oct 2026. Every entry links to its source.
// Prices are only included where the provider's page shows them; check before booking.

export const CHECKED_ON = "24 Oct 2026"

export type CleaningCategory = "home" | "kitchen" | "bathroom" | "sofa" | "pest" | "tank" | "office" | "staff"

export const CLEANING_CATEGORIES: { id: CleaningCategory; label: string; search: string }[] = [
  { id: "home", label: "Full home", search: "home deep cleaning service" },
  { id: "kitchen", label: "Kitchen", search: "kitchen deep cleaning service" },
  { id: "bathroom", label: "Bathroom", search: "bathroom cleaning service" },
  { id: "sofa", label: "Sofa & carpet", search: "sofa carpet cleaning service" },
  { id: "pest", label: "Pest control", search: "pest control service" },
  { id: "tank", label: "Water tank", search: "water tank cleaning service" },
  { id: "office", label: "Office & commercial", search: "office deep cleaning service" },
  { id: "staff", label: "Housekeeping staff", search: "housekeeping services" },
]

export interface CleaningProvider {
  id: string
  name: string
  /** "platform" = book online across the city; "local" = a local firm */
  kind: "platform" | "local"
  area: string
  categories: CleaningCategory[]
  services: string[]
  /** starting prices exactly as shown on the provider's page */
  prices?: { label: string; from: string }[]
  phone?: string
  bookUrl: string
  bookLabel: string
  sourceUrl: string
  note?: string
}

export const CLEANING_PROVIDERS: CleaningProvider[] = [
  {
    id: "urban-company",
    name: "Urban Company",
    kind: "platform",
    area: "Gurugram, incl. Sector 66 and Sohna Road pages",
    categories: ["home", "kitchen", "bathroom", "sofa", "pest", "office"],
    services: ["Home deep cleaning", "Kitchen", "Bathroom", "Sofa", "Carpet", "Car cleaning", "Pest control", "Chimney (Sohna Road)"],
    prices: [
      { label: "Unfurnished apartment deep clean", from: "₹3,999" },
      { label: "Furnished apartment deep clean", from: "₹4,299" },
      { label: "Partial home cleaning", from: "₹2,848" },
    ],
    bookUrl: "https://www.urbancompany.com/delhi-ncr-professional-home-cleaning-sector-66-gurgaon",
    bookLabel: "Book on Urban Company",
    sourceUrl: "https://www.urbancompany.com/delhi-ncr-professional-home-cleaning-sector-66-gurgaon",
    note: "Pest control and chimney cleaning are booked from their own Urban Company pages.",
  },
  {
    id: "mygate",
    name: "MyGate Home Services",
    kind: "platform",
    area: "Gurugram, lists Sohna Road as a served area",
    categories: ["home", "bathroom", "sofa", "office"],
    services: ["Eco-friendly deep cleaning", "Bathroom deep cleaning", "Carpet, sofa & mattress dry cleaning", "Marble & furniture polishing", "Commercial cleaning"],
    phone: "1800 123 2084",
    bookUrl: "https://mygate.com/blog/home-services/home-deep-cleaning-in-gurgaon/",
    bookLabel: "Book via MyGate",
    sourceUrl: "https://mygate.com/blog/home-services/home-deep-cleaning-in-gurgaon/",
    note: "Booked through the MyGate app or website; toll-free number from their site.",
  },
  {
    id: "diamond-shine",
    name: "Diamond Shine Enterprises",
    kind: "local",
    area: "Kasan, Gurugram",
    categories: ["home", "office", "staff"],
    services: ["Domestic cleaning", "Commercial cleaning", "Glass & facade cleaning", "Epoxy floors", "End-of-tenancy cleaning", "After-party cleaning"],
    phone: "+91 80102 66684",
    bookUrl: "https://diamond-shine-enterprises.ueniweb.com/",
    bookLabel: "Website",
    sourceUrl: "https://diamond-shine-enterprises.ueniweb.com/",
  },
  {
    id: "klean-homz",
    name: "Klean Homz Services",
    kind: "local",
    area: "Gurugram",
    categories: ["home", "sofa", "pest"],
    services: ["Home deep cleaning", "Sofa cleaning", "Carpet cleaning", "Floor scrubbing & polishing", "Pest control", "Sanitisation", "Anti-termite"],
    bookUrl: "https://m.indiamart.com/klean-homz-services/profile.html",
    bookLabel: "IndiaMART listing",
    sourceUrl: "https://m.indiamart.com/klean-homz-services/profile.html",
  },
  {
    id: "rs-services",
    name: "R S Services",
    kind: "local",
    area: "Gurugram",
    categories: ["home", "sofa", "office"],
    services: ["Home deep cleaning", "Commercial deep cleaning", "Restaurant cleaning", "Sofa shampooing", "Chair & carpet cleaning"],
    bookUrl: "https://m.indiamart.com/rs-servicesharyana",
    bookLabel: "IndiaMART listing",
    sourceUrl: "https://m.indiamart.com/rs-servicesharyana",
  },
  {
    id: "service-mantra",
    name: "Service Mantra Pest Control",
    kind: "local",
    area: "Gurugram",
    categories: ["pest"],
    services: ["Termite treatment", "Bed bugs", "Rodents", "Mosquitoes", "Free inspection"],
    bookUrl: "https://business.google.com/v/service-mantra-pest-control/07775304117831902638/02cb/_/fullmenu/",
    bookLabel: "Google listing",
    sourceUrl: "https://business.google.com/v/service-mantra-pest-control/07775304117831902638/02cb/_/fullmenu/",
  },
  {
    id: "jbm-builders",
    name: "JBM Builders",
    kind: "local",
    area: "Sohna",
    categories: ["office", "staff"],
    services: ["Industrial housekeeping", "Hospital housekeeping", "Housekeeping staff"],
    bookUrl: "https://m.indiamart.com/jbm-builders/housekeeping-services.html",
    bookLabel: "IndiaMART listing",
    sourceUrl: "https://m.indiamart.com/jbm-builders/housekeeping-services.html",
    note: "Monthly housekeeping contracts for institutions; suits offices, schools and societies rather than one-off home cleaning.",
  },
]
