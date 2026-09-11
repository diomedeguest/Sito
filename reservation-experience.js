/* Passaggi guidati. Si prosegue solo con un preventivo valido del server. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id),
    form = $('reservation-form');
  if (!form) return;
  const en = document.documentElement.lang === 'en',
    t = (it, eng) => (en ? eng : it);
  const ids = ['stay-section', 'guest-section', 'payment-section'];
  const links = [...document.querySelectorAll('.booking-steps a')];
  const guests = ['first-name', 'last-name', 'guest-email', 'guest-phone'].map($);
  let verified = false,
    active = 'stay-section',
    locked = false;
  function mark() {
    links.forEach((a) => {
      const id = a.getAttribute('href').slice(1);
      if (active === id) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
      a.setAttribute('aria-disabled', String(locked || (!verified && id !== 'stay-section')));
    });
  }
  function show(id, focus = true) {
    active = id;
    ids.forEach((key) => ($(key).hidden = key !== id));
    mark();
    if (focus) {
      $(id).scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
      $(id).querySelector('legend').focus({ preventScroll: true });
    }
  }
  function errorFor(el) {
    if (el.validity.customError) return el.validationMessage;
    if (el.validity.valueMissing) return t('Compila questo campo.', 'Complete this field.');
    if (el.validity.typeMismatch)
      return t('Inserisci un indirizzo email valido.', 'Enter a valid email address.');
    if (el.validity.rangeUnderflow)
      return t(
        'Scegli una data non precedente a quella consentita.',
        'Choose a date on or after the earliest allowed date.',
      );
    return t('Controlla il valore inserito.', 'Check the value entered.');
  }
  function validate(fields, focus = true) {
    let first = null;
    fields.forEach((el) => {
      if (['first-name', 'last-name', 'guest-phone'].includes(el.id))
        el.setCustomValidity(
          el.value.trim() ? '' : t('Compila questo campo.', 'Complete this field.'),
        );
      const valid = el.checkValidity(),
        error = $(el.id + '-error');
      el.setAttribute('aria-invalid', String(!valid));
      if (error) {
        error.hidden = valid;
        error.textContent = valid ? '' : errorFor(el);
      }
      if (!valid && !first) first = el;
    });
    if (first && focus) {
      const section = first.closest('.reservation-panel');
      if (section && section.hidden) show(section.id, false);
      first.focus();
      if (!$(first.id + '-error')) first.reportValidity();
    }
    return !first;
  }
  function go(id) {
    if (locked) return;
    if (window.DiomedeReservationState && !window.DiomedeReservationState.hasQuote())
      verified = false;
    if (id !== 'stay-section' && !verified) {
      $('flow-status').textContent = t(
        'Verifica prima disponibilità e prezzo per le date scelte.',
        'First check availability and price for your dates.',
      );
      show('stay-section');
      return;
    }
    if (id === 'payment-section' && !validate(guests)) return;
    $('flow-status').textContent = '';
    show(id);
  }
  window.DiomedeBookingFlow = {
    go,
    validate,
    verified: () => {
      verified = true;
      go('guest-section');
    },
    reset: () => {
      verified = false;
      $('terms-consent').checked = false;
      show('stay-section', false);
    },
    lock: (value) => {
      locked = value;
      $('edit-stay').disabled = value;
      mark();
    },
    validateAll: () => {
      if (!verified || !window.DiomedeReservationState?.hasQuote()) {
        go('stay-section');
        return false;
      }
      const stay = ['arrival', 'departure', 'adults', 'children'].map($);
      if (!validate(stay) || !validate(guests)) return false;
      show('payment-section', false);
      return validate([...$('payment-section').querySelectorAll('input')]);
    },
  };
  links.forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      go(a.getAttribute('href').slice(1));
    }),
  );
  document
    .querySelectorAll('[data-back]')
    .forEach((b) => b.addEventListener('click', () => go(b.dataset.back)));
  $('edit-stay').addEventListener('click', () => go('stay-section'));
  $('go-payment').addEventListener('click', () => go('payment-section'));
  form.addEventListener('input', (e) => {
    const error = $(e.target.id + '-error');
    if (error) {
      error.hidden = true;
      e.target.removeAttribute('aria-invalid');
    }
    if (guests.includes(e.target)) e.target.setCustomValidity('');
  });
  show('stay-section', false);
})();
