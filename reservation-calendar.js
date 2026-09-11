/* Calendario visuale. blockedNights contiene notti [arrivo, partenza).
 * Un aggiornamento del calendario non equivale a una modifica dell'ospite.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id),
    box = $('stay-calendar');
  if (!box) return;
  const config = window.DIOMEDE_RESERVATIONS,
    utils = window.DiomedeReservationUtils;
  const en = document.documentElement.lang === 'en',
    t = (it, eng) => (en ? eng : it);
  const arrival = $('arrival'),
    departure = $('departure'),
    note = $('calendar-status');
  const iso = (date) => date.toISOString().slice(0, 10);
  const fullDate = (value) =>
    new Intl.DateTimeFormat(en ? 'en-GB' : 'it-IT', { dateStyle: 'full', timeZone: 'UTC' }).format(
      new Date(utils.parseDate(value)),
    );
  let start,
    first,
    end,
    month,
    locked = false,
    blocked = new Set(),
    loadNumber = 0;
  function bounds() {
    start = utils.today(config.timeZone);
    first = new Date(utils.parseDate(start));
    first.setUTCDate(1);
    end = new Date(first);
    const months =
      Number.isInteger(config.calendarMonths) &&
      config.calendarMonths >= 1 &&
      config.calendarMonths <= 36
        ? config.calendarMonths
        : 18;
    end.setUTCMonth(end.getUTCMonth() + months);
    if (!month || month < first || month >= end) month = new Date(first);
  }
  function validRange(from, to) {
    if (!Number.isFinite(utils.parseDate(from)) || !Number.isFinite(utils.parseDate(to)))
      return true;
    // Bounded by the returned calendar data, not by an arbitrary user date range.
    return ![...blocked].some((night) => night >= from && night < to);
  }
  window.DiomedeCalendar = {
    validRange,
    setLocked: (value) => {
      locked = value;
      render();
    },
  };
  function selectDate(value) {
    if (locked || arrival.disabled) return;
    if (!arrival.value || departure.value || value <= arrival.value) {
      arrival.value = value;
      departure.value = '';
    } else if (validRange(arrival.value, value)) departure.value = value;
    else {
      note.textContent = t(
        'Il periodo include notti occupate. Scegli un altro periodo.',
        'This period includes unavailable nights. Choose another period.',
      );
      return;
    }
    arrival.dispatchEvent(new Event('change', { bubbles: true }));
    departure.dispatchEvent(new Event('change', { bubbles: true }));
    render();
    box.querySelector('[data-date="' + value + '"]')?.focus();
  }
  function renderMonth(view, grid) {
    const next = new Date(view);
    next.setUTCMonth(next.getUTCMonth() + 1);
    grid.replaceChildren();
    for (let i = 0; i < (view.getUTCDay() + 6) % 7; i++) {
      const blank = document.createElement('span');
      blank.setAttribute('aria-hidden', 'true');
      grid.append(blank);
    }
    for (let date = new Date(view); date < next; date.setUTCDate(date.getUTCDate() + 1)) {
      const value = iso(date),
        button = document.createElement('button');
      const choosingEnd = arrival.value && !departure.value && value > arrival.value,
        occupied = blocked.has(value);
      const selected = value === arrival.value || value === departure.value;
      button.type = 'button';
      button.dataset.date = value;
      button.textContent = date.getUTCDate();
      button.disabled =
        locked || value < start || (choosingEnd ? !validRange(arrival.value, value) : occupied);
      button.className =
        (selected ? 'selected ' : '') +
        (arrival.value && departure.value && value > arrival.value && value < departure.value
          ? 'in-range '
          : '') +
        (occupied ? 'occupied' : '');
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute(
        'aria-label',
        fullDate(value) +
          (value === arrival.value
            ? t(', arrivo', ', check-in')
            : value === departure.value
              ? t(', partenza', ', check-out')
              : occupied
                ? t(', notte occupata', ', night unavailable')
                : ''),
      );
      if (value === start) button.setAttribute('aria-current', 'date');
      button.addEventListener('click', () => selectDate(value));
      grid.append(button);
    }
  }
  function render() {
    const monthLabel = (value) =>
      new Intl.DateTimeFormat(en ? 'en-GB' : 'it-IT', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(value);
    const next = new Date(month);
    next.setUTCMonth(next.getUTCMonth() + 1);
    $('calendar-month').textContent = monthLabel(month);
    $('calendar-prev').disabled = locked || month <= first;
    $('calendar-next').disabled = locked || next >= end;
    $('calendar-clear').disabled = locked;
    $('calendar-instruction').textContent =
      arrival.value && departure.value
        ? t(
            'Periodo selezionato. Puoi modificarlo scegliendo un nuovo arrivo.',
            'Dates selected. Choose a new check-in date to change your stay.',
          )
        : arrival.value
          ? t('Seleziona il giorno di partenza.', 'Select your check-out date.')
          : t('Seleziona il giorno di arrivo.', 'Select your check-in date.');
    renderMonth(month, $('calendar-days'));
  }
  $('calendar-prev').addEventListener('click', () => {
    if (!locked && month > first) {
      month.setUTCMonth(month.getUTCMonth() - 1);
      render();
    }
  });
  $('calendar-next').addEventListener('click', () => {
    const next = new Date(month);
    next.setUTCMonth(next.getUTCMonth() + 1);
    if (!locked && next < end) {
      month = next;
      render();
    }
  });
  $('calendar-clear').addEventListener('click', () => {
    if (locked) return;
    arrival.value = '';
    departure.value = '';
    arrival.dispatchEvent(new Event('change', { bubbles: true }));
    departure.dispatchEvent(new Event('change', { bubbles: true }));
    render();
  });
  box.addEventListener('keydown', (event) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (!delta || !event.target.dataset.date || locked) return;
    event.preventDefault();
    const target = new Date(utils.parseDate(event.target.dataset.date) + delta * utils.DAY_MS);
    if (target < first || target >= end) return;
    // Keep focus on a real enabled day; never leave it on a replaced DOM node.
    for (
      ;
      target >= first && target < end;
      target.setUTCDate(target.getUTCDate() + Math.sign(delta))
    ) {
      month = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), 1));
      render();
      const button = $('calendar-days').querySelector('[data-date="' + iso(target) + '"]');
      if (button && !button.disabled) {
        button.focus();
        return;
      }
    }
    $('calendar-clear').focus();
  });
  [arrival, departure].forEach((input) =>
    input.addEventListener('change', () => {
      if (locked) return;
      if (input === arrival && Number.isFinite(utils.parseDate(arrival.value))) {
        const selected = new Date(utils.parseDate(arrival.value));
        if (selected >= first && selected < end && !box.contains(document.activeElement))
          month = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1));
      }
      render();
    }),
  );
  async function loadAvailability() {
    if (config.mode !== 'live' || !config.endpoints?.availability) return;
    const request = ++loadNumber,
      from = start,
      to = iso(end);
    note.textContent = t('Aggiornamento delle disponibilità…', 'Updating availability…');
    try {
      const result = await window.DiomedeReservationAPI.availability({ from, to });
      if (request !== loadNumber) return;
      if (
        !result ||
        result.from !== from ||
        result.to !== to ||
        !Array.isArray(result.blockedNights) ||
        !result.blockedNights.every(
          (value) => Number.isFinite(utils.parseDate(value)) && value >= from && value < to,
        )
      )
        throw new Error('INVALID_AVAILABILITY');
      blocked = new Set(result.blockedNights);
      render();
      window.dispatchEvent(new Event('reservation:availability'));
      note.textContent = t(
        'Le notti occupate sono contrassegnate. La disponibilità sarà ricontrollata prima del pagamento.',
        'Unavailable nights are marked. Availability will be checked again before payment.',
      );
    } catch (_) {
      if (request !== loadNumber) return;
      // Keep previously known blocks when a refresh fails; never invent free nights.
      note.textContent = t(
        'Calendario non aggiornato. Verifica disponibilità e prezzo per il periodo scelto.',
        'Calendar could not be updated. Check availability and price for your selected dates.',
      );
    }
  }
  bounds();
  render();
  window.addEventListener('pageshow', () => {
    bounds();
    render();
    loadAvailability();
  });
})();
