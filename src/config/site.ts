/**
 * Public site configuration — safe to import from client components.
 * Edit these values to change branding, contact details and the
 * example prompts on the welcome screen. Do NOT put secrets here.
 */

export const siteConfig = {
  /** Assistant name shown in the header and chat. */
  assistantName: "Xpert AI",
  /** Your company name. */
  companyName: "Ghandhara Estate",
  /** Short tagline under the logo. */
  tagline: "Your AI property advisor",
  /** Used for <title>, meta description and social previews. */
  title: "Xpert AI by Ghandhara Estate — AI Real Estate Assistant",
  description:
    "Ask Xpert AI, Ghandhara Estate's real estate assistant, about buying, selling or renting property in Islamabad and Rawalpindi — houses, plots, apartments, farmhouses and commercial space. Get clear answers, then talk to an agent.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://chat.ghandharaestate.com",
  /** Your main website. */
  mainWebsite: "https://ghandharaestate.com",

  /**
   * Contact details shown in the sidebar and "Talk to an agent" dialog.
   * Leave a field empty ("") to hide it. Fill these in with your real details.
   */
  contact: {
    phone: "+92 300 9568645",
    whatsapp: "923009568645", // digits only with country code
    email: "info@ghandharaestate.com",
    office: "", // e.g. your office address in Islamabad
  },

  /** Clickable starter prompts on the welcome screen. */
  examplePrompts: [
    {
      title: "Find a home",
      prompt:
        "I'm looking to buy a house. Help me work out what I should look for and what questions to ask.",
    },
    {
      title: "Buying a plot",
      prompt: "What should I check before buying a residential plot?",
    },
    {
      title: "Sell my property",
      prompt: "I want to sell my property. What's the process and how do I prepare it?",
    },
    {
      title: "Overseas Pakistanis",
      prompt: "I live abroad. How can I safely buy or manage property in Islamabad from overseas?",
    },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
