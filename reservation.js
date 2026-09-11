/* Controller della prenotazione: nessun prezzo o dato personale in storage.
 * Il backend rimane responsabile di disponibilità, importi e conferma.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('reservation-form');
  if (!form) return;

  const config = window.DIOMEDE_RESERVATIONS;
  const api = window.DiomedeReservationAPI;
  const utils = window.DiomedeReservationUtils;
  const en = document.documentElement.lang === 'en';
  const t = (it, english) => (en ? english : it);
  const arrival = $('arrival'),
    departure = $('departure');
  const adults = $('adults'),
    children = $('children'),
    cot = $('cot');
  const check = $('check-dates'),
    pay = $('pay-button');
  const stayFields = [arrival, departure, adults, children];
  const methods = [...form.querySelectorAll('[name="payment"]')];
  const today = () => utils.today(config.timeZone);
  const money = (minor) =>
    new Intl.NumberFormat(en ? 'en-GB' : 'it-IT', {
      style: 'currency',
      currency: config.currency,
    }).format(minor / 100);
  const formatDate = (value) =>
    Number.isFinite(utils.parseDate(value))
      ? new Intl.DateTimeFormat(en ? 'en-GB' : 'it-IT', {
          dateStyle: 'medium',
          timeZone: 'UTC',
        }).format(new Date(utils.parseDate(value)))
      : '—';
  const flow = () => window.DiomedeBookingFlow;

  // A quote is bound to the exact stay; an edit invalidates outstanding requests.
  let quote = null,
    quoteStay = '',
    generation = 0,
    requestNumber = 0;
  let expiryTimer,
    busy = false,
    redirecting = false,
    savedControls = [];
  let attemptKey = null,
    attemptPayload = '';

  function policyURL(value) {
    if (!value) return null;
    try {
      const url = new URL(value, location.href);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch (_) {
      return null;
    }
  }
  const policies = config.policies?.[en ? 'en' : 'it'] || {};
  const rules = config.stayRules?.[en ? 'en' : 'it'] || {};
  const ruleLabels = {
    cancellation: t('Cancellazione', 'Cancellation'),
    deposit: t('Cauzione', 'Security deposit'),
  };
  const privacy = policyURL(policies.privacy),
    terms = policyURL(policies.terms);
  const rulesComplete = Object.keys(ruleLabels).every(
    (key) => typeof rules[key] === 'string' && rules[key].trim(),
  );
  const ready = Boolean(
    api.ready() && api.checkoutConfigured() && privacy && terms && rulesComplete,
  );
  Object.entries(ruleLabels).forEach(([key, label]) => {
    const row = document.createElement('div'),
      dt = document.createElement('dt'),
      dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = rules[key] || t('Contattaci per informazioni', 'Contact us for details');
    row.append(dt, dd);
    $('stay-rules').append(row);
  });
  if (ready) {
    $('service-notice').hidden = true;
    $('policies').hidden = false;
    $('privacy-link').href = privacy;
    $('terms-link').href = terms;
  }
  check.disabled = !ready;

  function stay() {
    return {
      arrival: arrival.value,
      departure: departure.value,
      guests: Number(adults.value) + Number(children.value),
      adults: Number(adults.value),
      children: Number(children.value),
      cot: cot.value === 'yes',
      language: en ? 'en' : 'it',
    };
  }
  function syncDates() {
    const start = utils.parseDate(arrival.value);
    arrival.min = today();
    arrival.setCustomValidity(
      arrival.value && !Number.isFinite(start)
        ? t('Inserisci una data valida.', 'Enter a valid date.')
        : '',
    );
    const minimum = (Number.isFinite(start) ? start : utils.parseDate(today())) + utils.DAY_MS;
    departure.min = new Date(minimum).toISOString().slice(0, 10);
    const end = utils.parseDate(departure.value);
    departure.setCustomValidity(
      departure.value && (!Number.isFinite(end) || end < minimum)
        ? t('Il check-out deve essere successivo al check-in.', 'Check-out must be after check-in.')
        : '',
    );
    const group = stay();
    $('guests').value = String(group.guests);
    children.setCustomValidity(
      utils.validGuests(group.adults, group.children, config.maxGuests)
        ? ''
        : t(
            'Massimo 4 ospiti complessivi, con almeno un adulto.',
            'Maximum 4 guests in total, including at least one adult.',
          ),
    );
    [...children.options].forEach(
      (option) =>
        (option.disabled = Number(option.value) + group.adults > Math.min(4, config.maxGuests)),
    );
    [...adults.options].forEach(
      (option) =>
        (option.disabled = Number(option.value) + group.children > Math.min(4, config.maxGuests)),
    );
    if (
      window.DiomedeCalendar &&
      !window.DiomedeCalendar.validRange(arrival.value, departure.value)
    ) {
      departure.setCustomValidity(
        t('Il periodo include notti occupate.', 'This period includes unavailable nights.'),
      );
    }
    $('summary-arrival').textContent = formatDate(arrival.value);
    $('summary-departure').textContent = formatDate(departure.value);
    const nights = utils.nights(arrival.value, departure.value);
    $('summary-nights').textContent = nights > 0 ? String(nights) : '—';
    $('summary-guests').textContent =
      group.adults +
      ' ' +
      t(group.adults === 1 ? 'adulto' : 'adulti', group.adults === 1 ? 'adult' : 'adults') +
      ' · ' +
      group.children +
      ' ' +
      t(group.children === 1 ? 'bambino' : 'bambini', group.children === 1 ? 'child' : 'children');
    $('summary-cot').textContent = group.cot ? t('Sì', 'Yes') : 'No';
  }
  function hasQuote() {
    return Boolean(
      quote && Date.parse(quote.expiresAt) > Date.now() && quoteStay === JSON.stringify(stay()),
    );
  }
  function invalidate(message = '') {
    generation++;
    quote = null;
    quoteStay = '';
    clearTimeout(expiryTimer);
    pay.disabled = true;
    methods.forEach((radio) => {
      radio.checked = false;
      radio.disabled = true;
    });
    $('terms-consent').checked = false;
    $('price-lines').replaceChildren();
    $('summary-total').textContent = '—';
    $('price-help').textContent = t(
      'Il prezzo verrà mostrato dopo la verifica delle date.',
      'The price will be shown after checking your dates.',
    );
    $('payment-help').textContent = ready
      ? t(
          'Verifica le date per conoscere i metodi disponibili.',
          'Check your dates to see available payment methods.',
        )
      : t('I pagamenti online non sono ancora attivi.', 'Online payments are not yet active.');
    if (message) $('quote-status').textContent = message;
    flow()?.reset();
  }
  function syncPay() {
    pay.disabled =
      busy || !hasQuote() || !methods.some((radio) => radio.checked && !radio.disabled);
  }
  function validateStay() {
    syncDates();
    return flow()
      ? flow().validate(stayFields)
      : stayFields.every((input) => input.reportValidity());
  }
  function restoreControls() {
    savedControls.forEach(([control, disabled]) => {
      control.disabled = disabled;
    });
    savedControls = [];
    busy = false;
    redirecting = false;
    if (window.DiomedeCalendar) window.DiomedeCalendar.setLocked(false);
    flow()?.lock(false);
    check.disabled = !ready;
    if (quote && !hasQuote())
      invalidate(
        t(
          'Il prezzo è scaduto. Verifica nuovamente le date.',
          'This price has expired. Check your dates again.',
        ),
      );
    methods.forEach((radio) => {
      radio.disabled =
        !hasQuote() ||
        !config.paymentMethods.includes(radio.value) ||
        !quote.paymentMethods.includes(radio.value);
    });
    syncPay();
  }
  // Exposed only for UI coordination; this is never an authorization mechanism.
  window.DiomedeReservationState = { hasQuote, isBusy: () => busy };

  [...stayFields, cot].forEach((input) =>
    input.addEventListener('change', () => {
      if (busy) return;
      syncDates();
      invalidate();
      check.disabled = !ready;
      $('quote-status').textContent = '';
      $('checkout-status').textContent = '';
      $('flow-status').textContent = '';
      if (input.value) flow()?.validate([input], false);
    }),
  );
  // A calendar refresh is not an edit. Only a real conflict invalidates the quote.
  window.addEventListener('reservation:availability', () => {
    if (busy) return;
    syncDates();
    if (
      arrival.value &&
      departure.value &&
      !window.DiomedeCalendar.validRange(arrival.value, departure.value)
    ) {
      invalidate(
        t(
          'La disponibilità è cambiata. Scegli un altro periodo.',
          'Availability has changed. Choose another period.',
        ),
      );
      flow()?.validate([departure], false);
    }
  });
  methods.forEach((radio) => radio.addEventListener('change', syncPay));

  check.addEventListener('click', async () => {
    if (busy || !validateStay()) return;
    if (!ready) {
      $('quote-status').textContent = t('Contattaci per prenotare.', 'Please contact us to book.');
      return;
    }
    invalidate();
    const current = generation,
      request = ++requestNumber,
      requestedStay = stay();
    check.disabled = true;
    $('quote-status').textContent = t('Verifica in corso…', 'Checking…');
    try {
      const result = await api.quote(requestedStay);
      if (current !== generation || JSON.stringify(requestedStay) !== JSON.stringify(stay()))
        return;
      if (!result.available) {
        $('quote-status').textContent = t(
          'Queste date non sono disponibili. Scegli un altro periodo.',
          'These dates are unavailable. Please choose another period.',
        );
        return;
      }
      quote = result;
      quoteStay = JSON.stringify(requestedStay);
      result.items.forEach((item) => {
        const li = document.createElement('li'),
          label = document.createElement('span'),
          amount = document.createElement('span');
        label.textContent = item.label;
        amount.textContent = money(item.amountMinor);
        li.append(label, amount);
        $('price-lines').append(li);
      });
      $('summary-total').textContent = money(result.totalMinor);
      $('price-help').textContent = t(
        'Importo totale da pagare, comprensivo delle voci indicate.',
        'Total amount payable, including the items shown.',
      );
      methods.forEach(
        (radio) =>
          (radio.disabled = !(
            config.paymentMethods.includes(radio.value) &&
            result.paymentMethods.includes(radio.value)
          )),
      );
      $('payment-help').textContent = t(
        'Seleziona il metodo di pagamento.',
        'Select a payment method.',
      );
      $('quote-status').textContent = t(
        'Date disponibili. Completa i tuoi dati e scegli il pagamento.',
        'Dates available. Complete your details and choose a payment method.',
      );
      flow()?.verified();
      expiryTimer = setTimeout(
        () => {
          // Do not hide a payment in flight or its eventual error message.
          if (!busy)
            invalidate(
              t(
                'Il prezzo è scaduto. Verifica nuovamente le date.',
                'This price has expired. Check your dates again.',
              ),
            );
        },
        Math.min(2147483647, Date.parse(result.expiresAt) - Date.now()),
      );
    } catch (_) {
      if (current === generation)
        invalidate(
          t(
            'Non è stato possibile verificare le date. Riprova o contattaci.',
            'We could not check your dates. Please try again or contact us.',
          ),
        );
    } finally {
      if (request === requestNumber) check.disabled = busy || !ready;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !ready) return;
    if (!hasQuote()) {
      invalidate(
        t('Verifica nuovamente disponibilità e prezzo.', 'Check availability and price again.'),
      );
      return;
    }
    if (!validateStay() || (flow() ? !flow().validateAll() : !form.reportValidity())) return;
    const method = methods.find((radio) => radio.checked && !radio.disabled);
    if (!method) return;
    const payload = {
      quoteId: quote.quoteId,
      paymentMethod: method.value,
      customer: {
        firstName: $('first-name').value.trim(),
        lastName: $('last-name').value.trim(),
        email: $('guest-email').value.trim(),
        phone: $('guest-phone').value.trim(),
      },
      notes: $('guest-notes').value.trim(),
      termsAccepted: $('terms-consent').checked,
      language: en ? 'en' : 'it',
    };
    if (!payload.customer.firstName || !payload.customer.lastName || !payload.customer.phone)
      return;
    const serialized = JSON.stringify(payload);
    // Retry identical payloads with the same key, including after a network timeout.
    if (!attemptKey || attemptPayload !== serialized) {
      attemptKey = crypto.randomUUID();
      attemptPayload = serialized;
    }
    busy = true;
    pay.disabled = true;
    flow()?.lock(true);
    window.DiomedeCalendar?.setLocked(true);
    savedControls = [...form.querySelectorAll('input,select,textarea,button')].map((control) => [
      control,
      control.disabled,
    ]);
    savedControls.forEach(([control]) => {
      control.disabled = true;
    });
    $('checkout-status').textContent = t(
      'Apertura del pagamento sicuro…',
      'Opening secure payment…',
    );
    try {
      const result = await api.checkout(payload, attemptKey);
      location.assign(result.checkoutUrl);
      redirecting = true;
    } catch (_) {
      const message = t(
        'Non è stato possibile aprire il pagamento. Se hai già pagato, contattaci prima di riprovare.',
        'We could not open payment. If you have already paid, contact us before trying again.',
      );
      $('checkout-status').textContent = message;
      $('flow-status').textContent = message;
    } finally {
      if (!redirecting) restoreControls();
    }
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) restoreControls();
    syncDates();
    if (quote && !hasQuote())
      invalidate(
        t('Verifica nuovamente disponibilità e prezzo.', 'Check availability and price again.'),
      );
    syncPay();
  });
  syncDates();
  invalidate();
})();
