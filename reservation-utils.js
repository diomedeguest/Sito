/* Funzioni pure condivise dal browser, dagli esempi server e dai test. */
(function (root, factory) {
  const utils = factory();
  if (typeof module === 'object' && module.exports) module.exports = utils;
  else root.DiomedeReservationUtils = utils;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const DAY_MS = 86400000;
  function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const time = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
      ? time
      : NaN;
  }
  function today(timeZone = 'Europe/Rome') {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function validGuests(adults, children, maxGuests = 4) {
    return (
      Number.isInteger(adults) &&
      adults >= 1 &&
      Number.isInteger(children) &&
      children >= 0 &&
      adults + children <= Math.min(4, maxGuests)
    );
  }
  function nights(arrival, departure) {
    return (parseDate(departure) - parseDate(arrival)) / DAY_MS;
  }
  return { DAY_MS, parseDate, today, validGuests, nights };
});
