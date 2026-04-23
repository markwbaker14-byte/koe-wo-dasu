// Google Analytics 4 helper. All calls are no-ops when VITE_GA_MEASUREMENT_ID
// is unset (dev) or when window.gtag has not yet loaded — never throws.

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const enabled = Boolean(MEASUREMENT_ID) && typeof window !== "undefined";

export function track(eventName, params = {}) {
  if (!enabled || !window.gtag) return;
  window.gtag("event", eventName, params);
}

export function setUserProperty(key, value) {
  if (!enabled || !window.gtag) return;
  window.gtag("set", "user_properties", { [key]: value });
}

export function trackPurchase({ transactionId, value = 980, currency = "JPY" }) {
  track("purchase", {
    transaction_id: transactionId,
    value,
    currency,
    items: [{
      item_id: "premium_monthly",
      item_name: "Premium Monthly",
      price: value,
      quantity: 1,
    }],
  });
}
