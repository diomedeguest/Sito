(function () {
  'use strict';
  const form = document.getElementById('info-request-form');
  if (!form) return;

  const surname = document.getElementById('info-surname');
  const subject = document.getElementById('info-subject');
  const next = document.getElementById('info-next');
  function requestDate() {
    const parts = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(new Date());
    const value = (type) => parts.find((part) => part.type === type)?.value || '';
    return `${value('day')}-${value('month')}-${value('year')}`;
  }

  function updateMetadata() {
    const cleanSurname = surname.value.trim().replace(/\s+/g, ' ').slice(0, 80);
    subject.value = `[Richiesta Info] ${requestDate()}${cleanSurname ? ` ${cleanSurname}` : ''}`;
    next.value = new URL('messaggio-inviato.html', location.href).href;
  }

  surname.addEventListener('input', updateMetadata);
  form.addEventListener('submit', updateMetadata);
  updateMetadata();
})();
