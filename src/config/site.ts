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

  /**
   * Clickable options on the welcome screen.
   * title = card heading, description = short line under it,
   * prompt = the message sent to Xpert AI when the card is tapped.
   */
  examplePrompts: [
    {
      title: "Buy a home",
      description: "Houses for sale",
      prompt: "I want to buy a house. Please ask me what you need to know (area, size, budget) and help me find the right option.",
    },
    {
      title: "Rent a home",
      description: "Houses & apartments for rent",
      prompt: "I'm looking for a house or apartment to rent. Please ask me about area, size, budget and move-in date, and help me find a suitable place.",
    },
    {
      title: "Residential plots",
      description: "Plots to build your home",
      prompt: "I'm interested in buying a residential plot. Please ask me about the area, plot size and budget, and tell me what to check before buying.",
    },
    {
      title: "Commercial plots",
      description: "Land for business & investment",
      prompt: "I'm interested in commercial plots or commercial land. Please ask me about purpose, location and budget, and guide me on what to look for.",
    },
    {
      title: "Apartments",
      description: "Flats to buy",
      prompt: "I want to buy an apartment. Please ask me about area, number of rooms and budget, and help me compare options.",
    },
    {
      title: "Farmhouses",
      description: "Farmhouses & agricultural land",
      prompt: "I'm interested in a farmhouse or agricultural land. Please ask me about location, size and budget, and explain what to check.",
    },
    {
      title: "Sell my property",
      description: "Get it listed with us",
      prompt: "I want to sell my property. Please ask me about the property and explain the selling process with Ghandhara Estate.",
    },
    {
      title: "Overseas Pakistanis",
      description: "Buy or manage from abroad",
      prompt: "I live abroad. How can I safely buy, rent out or manage property in Islamabad or Rawalpindi from overseas?",
    },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
