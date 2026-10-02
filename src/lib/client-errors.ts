/** Errors the browser can detect on its own (no server response). */
export const FRIENDLY_CLIENT_ERRORS = {
  offline: "You appear to be offline. Reconnect to the internet and try again.",
  network: "Couldn't reach Xpert AI. Check your connection and try again.",
  server: "Something went wrong on our side. Please try again.",
  timeout: "The response took too long. Please try again.",
  interrupted: "The reply was interrupted before it finished. Try again to get the full answer.",
} as const;
