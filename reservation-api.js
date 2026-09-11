/* Adattatore indipendente dal fornitore: POST JSON verso gli endpoint configurati.
 * quote: available, quoteId, expiresAt, currency, totalMinor, items, paymentMethods.
 * checkout: restituisce checkoutUrl. status: restituisce l'esito verificato dal server.
 * Il backend resta responsabile di prezzi, disponibilità, incassi e invio email.
 */
(function () {
  'use strict';
  const config = window.DIOMEDE_RESERVATIONS;
  function endpoint(name) {
    if (!config || config.mode !== 'live' || !config.endpoints?.[name])
      throw new Error('NOT_CONFIGURED');
    const url = new URL(config.endpoints[name], location.href);
    if (
      url.origin !== location.origin ||
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      url.hash
    )
      throw new Error('INVALID_ENDPOINT');
    return url;
  }
  async function post(name, payload, headers = {}) {
    const url = endpoint(name);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url.href, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('SERVICE_ERROR');
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
  function validateQuote(q) {
    if (!q || typeof q.available !== 'boolean') throw new Error('INVALID_QUOTE');
    if (!q.available) return q;
    if (
      typeof q.quoteId !== 'string' ||
      !q.quoteId.trim() ||
      q.currency !== config.currency ||
      !Number.isSafeInteger(q.totalMinor) ||
      q.totalMinor <= 0 ||
      typeof q.expiresAt !== 'string' ||
      !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(q.expiresAt) ||
      !Number.isFinite(Date.parse(q.expiresAt)) ||
      Date.parse(q.expiresAt) <= Date.now() ||
      !Array.isArray(q.items) ||
      !q.items.length ||
      !q.items.every(
        (i) =>
          i && typeof i.label === 'string' && i.label.trim() && Number.isSafeInteger(i.amountMinor),
      ) ||
      q.items.reduce(
        (n, i) => (Number.isSafeInteger(n + i.amountMinor) ? n + i.amountMinor : NaN),
        0,
      ) !== q.totalMinor ||
      !Array.isArray(q.paymentMethods) ||
      !Array.isArray(config.paymentMethods) ||
      !q.paymentMethods.some((m) => config.paymentMethods.includes(m))
    ) {
      throw new Error('INVALID_QUOTE');
    }
    return q;
  }
  function checkoutURL(value) {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !Array.isArray(config.checkoutOrigins) ||
      !config.checkoutOrigins.includes(url.origin)
    )
      throw new Error('INVALID_CHECKOUT_URL');
    return url.href;
  }
  window.DiomedeReservationAPI = {
    ready: (name) => {
      try {
        (name ? [name] : ['quote', 'checkout', 'status']).forEach(endpoint);
        return true;
      } catch (_) {
        return false;
      }
    },
    checkoutConfigured: () =>
      Array.isArray(config?.checkoutOrigins) &&
      config.checkoutOrigins.length > 0 &&
      config.checkoutOrigins.every((origin) => {
        try {
          const url = new URL(origin);
          return (
            url.protocol === 'https:' && !url.username && !url.password && origin === url.origin
          );
        } catch (_) {
          return false;
        }
      }),
    quote: async (stay) => validateQuote(await post('quote', stay)),
    checkout: async (payload, key) => {
      const result = await post('checkout', payload, { 'Idempotency-Key': key });
      return { checkoutUrl: checkoutURL(result.checkoutUrl) };
    },
    status: (payload) => post('status', payload),
    availability: (payload) => post('availability', payload),
  };
})();
