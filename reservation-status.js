/* La URL di ritorno non prova un pagamento. Solo il backend autorizzato
 * può dichiarare prenotazione confermata e pagamento verificato.
 */
(function () {
  'use strict';
  const title = document.getElementById('reservation-result-title');
  if (!title) return;
  const message = document.getElementById('reservation-result-message'),
    reference = document.getElementById('reservation-reference'),
    refresh = document.getElementById('refresh-status');
  const en = document.documentElement.lang === 'en',
    t = (it, eng) => (en ? eng : it);
  const api = window.DiomedeReservationAPI;
  const params = new URLSearchParams(location.search);
  // Token opaco, breve e limitato alla singola prenotazione, emesso dal backend.
  const token = params.get('reservation_token');
  // Preserve the reservation when switching between the two result pages.
  if (token) {
    document.querySelectorAll('.langs a').forEach((link) => {
      const url = new URL(link.getAttribute('href'), location.href);
      if (url.origin === location.origin) {
        url.searchParams.set('reservation_token', token);
        link.href = url.href;
      }
    });
  }
  if (!token || !api.ready('status')) return;
  let busy = false;
  function showSummary(result) {
    const box = document.getElementById('confirmed-summary'),
      details = document.getElementById('confirmed-details');
    if (!box || !details) return;
    details.replaceChildren();
    box.hidden = true;
    const stay = result.stay;
    if (!stay) return;
    const utils = window.DiomedeReservationUtils;
    const start = utils.parseDate(stay.arrival),
      end = utils.parseDate(stay.departure);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      !utils.validGuests(stay.adults, stay.children) ||
      typeof stay.cot !== 'boolean'
    )
      return;
    const date = (n) =>
      new Intl.DateTimeFormat(en ? 'en-GB' : 'it-IT', {
        dateStyle: 'long',
        timeZone: 'UTC',
      }).format(new Date(n));
    const rows = [
      ['Check-in', date(start)],
      ['Check-out', date(end)],
      [t('Notti', 'Nights'), String((end - start) / 86400000)],
      [t('Adulti / bambini', 'Adults / children'), `${stay.adults} / ${stay.children}`],
      [t('Culla', 'Baby cot'), stay.cot ? t('Sì', 'Yes') : 'No'],
    ];
    if (
      Number.isSafeInteger(result.totalMinor) &&
      result.totalMinor > 0 &&
      result.currency === 'EUR'
    )
      rows.push([
        t('Totale pagato', 'Total paid'),
        new Intl.NumberFormat(en ? 'en-GB' : 'it-IT', {
          style: 'currency',
          currency: result.currency,
        }).format(result.totalMinor / 100),
      ]);
    const rules = result.stayRules || {};
    for (const [key, label] of Object.entries({
      checkIn: t('Orario check-in', 'Check-in time'),
      checkOut: t('Orario check-out', 'Check-out time'),
      cancellation: t('Cancellazione', 'Cancellation'),
      deposit: t('Cauzione', 'Security deposit'),
    }))
      if (typeof rules[key] === 'string' && rules[key]) rows.push([label, rules[key]]);
    for (const [label, value] of rows) {
      const row = document.createElement('div'),
        dt = document.createElement('dt'),
        dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      row.append(dt, dd);
      details.append(row);
    }
    document.getElementById('confirmed-email').textContent =
      result.emailStatus === 'sent'
        ? t(
            'Il riepilogo è stato inviato anche via email.',
            'Your summary has also been sent by email.',
          )
        : t(
            'Conserva il riferimento della prenotazione. Per assistenza, contattaci.',
            'Keep your reservation reference. Contact us if you need assistance.',
          );
    box.hidden = false;
  }
  async function check() {
    if (busy) return;
    busy = true;
    refresh.disabled = true;
    reference.textContent = '';
    const summary = document.getElementById('confirmed-summary');
    if (summary) summary.hidden = true;
    title.textContent = t('Verifica della prenotazione', 'Checking your reservation');
    message.textContent = t(
      'Stiamo verificando l’esito del pagamento.',
      'We are checking your payment status.',
    );
    try {
      const result = await api.status({ token });
      if (
        result.state === 'confirmed' &&
        result.paymentStatus === 'paid' &&
        typeof result.reference === 'string' &&
        result.reference.trim()
      ) {
        title.textContent = t(
          'La tua prenotazione è confermata.',
          'Your reservation is confirmed.',
        );
        message.textContent = t(
          'Il pagamento è stato verificato. Ti aspettiamo a Diomede Luxury.',
          'Payment has been verified. We look forward to welcoming you to Diomede Luxury.',
        );
        reference.textContent = t('Riferimento: ', 'Reference: ') + result.reference;
        refresh.hidden = true;
        showSummary(result);
      } else if (result.state === 'cancelled' || result.state === 'failed') {
        title.textContent = t('Prenotazione non completata', 'Reservation not completed');
        message.textContent = t(
          'La prenotazione non risulta confermata. Se hai ricevuto un addebito, contattaci prima di riprovare.',
          'Your reservation is not confirmed. If you were charged, contact us before trying again.',
        );
        refresh.hidden = false;
      } else {
        title.textContent = t('Conferma in attesa', 'Confirmation pending');
        message.textContent = t(
          'La verifica non è ancora conclusa. Controlla nuovamente tra poco senza ripetere il pagamento.',
          'Verification is still in progress. Check again shortly without paying again.',
        );
        refresh.hidden = false;
      }
    } catch (_) {
      title.textContent = t('Verifica non disponibile', 'Status unavailable');
      message.textContent = t(
        'Non possiamo verificare la prenotazione in questo momento. Se hai già pagato, non ripetere il pagamento: contattaci.',
        'We cannot verify your reservation right now. If you have already paid, do not pay again: contact us.',
      );
      refresh.hidden = false;
    } finally {
      busy = false;
      refresh.disabled = false;
    }
  }
  refresh.addEventListener('click', check);
  check();
})();
