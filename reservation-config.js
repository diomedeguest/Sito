/* CONFIGURAZIONE PUBBLICA EDITABILE — nessuna chiave segreta in questo file.
 * Passare a "live" solo dopo il collegamento e la verifica del backend.
 * Le rotte vuote lasciano disattivati preventivi, incassi e conferme.
 */
window.DIOMEDE_RESERVATIONS = {
  mode: 'preview',
  maxGuests: 4,
  currency: 'EUR',
  timeZone: 'Europe/Rome',
  endpoints: { quote: '', checkout: '', status: '', availability: '' },
  calendarMonths: 18,
  // Testi effettivi della struttura: compilare prima di attivare i pagamenti.
  stayRules: {
    it: { checkIn: '', checkOut: '', cancellation: '', deposit: '' },
    en: { checkIn: '', checkOut: '', cancellation: '', deposit: '' },
  },
  paymentMethods: ['paypal', 'klarna', 'nexi'],
  // Origini HTTPS esatte autorizzate per il redirect al checkout del fornitore.
  checkoutOrigins: [],
  policies: {
    it: { privacy: '', terms: '' },
    en: { privacy: '', terms: '' },
  },
};
