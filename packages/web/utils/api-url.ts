const isServer = typeof window === 'undefined';

export const apiURL =
  process.env.WEB_UI_API_URL ||
  (isServer ? 'http://api:4000' : `${window.location.origin}/api`);
