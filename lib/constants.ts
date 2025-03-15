export const isProductionEnvironment = process.env.NODE_ENV === 'production';

export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

// MusTax AI Branding
export const APP_NAME = 'MusTax AI';
export const APP_DESCRIPTION = 'UAE Corporate Tax Chatbot';
export const APP_FULL_NAME = 'MusTax AI - UAE Corporate Tax Chatbot';
export const APP_TAGLINE = 'Your expert assistant for UAE Corporate Tax inquiries and guidance';
export const PRIMARY_COLOR = '#0F4C81'; // Professional blue color
export const SECONDARY_COLOR = '#E5A823'; // Gold accent color