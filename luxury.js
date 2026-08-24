(function(){
  const header=document.querySelector('.header');
  const menu=document.querySelector('.menu');
  if(header){window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>12),{passive:true});}
  const nav=document.querySelector('.links');
  if(menu && nav){
    const panel=document.createElement('div');panel.className='mobile-nav-panel';
    nav.querySelectorAll('a').forEach(a=>panel.appendChild(a.cloneNode(true)));
    const cta=document.querySelector('.header .cta');if(cta){const x=cta.cloneNode(true);x.classList.add('mobile-cta');panel.appendChild(x)}
    document.body.appendChild(panel);
    menu.addEventListener('click',()=>{const open=panel.classList.toggle('open');menu.textContent=open?'×':'☰';menu.setAttribute('aria-expanded',String(open));});
  }
  const targets=document.querySelectorAll('.section-head,.card,.fact,.gallery,.form-wrap,.features-grid');
  targets.forEach(el=>el.classList.add('reveal'));
  if('IntersectionObserver' in window){
    const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');obs.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -25px 0px'});
    targets.forEach(el=>obs.observe(el));
  } else targets.forEach(el=>el.classList.add('is-visible'));
  const hero=document.querySelector('.hero');
  if(hero){const s=document.createElement('div');s.className='luxury-scroll';s.textContent=document.documentElement.lang==='en'?'Explore':'Esplora';hero.appendChild(s)}
})();

// Immersive gallery lightbox
(function(){
  const imgs=[...document.querySelectorAll('.gallery-card-image img')];
  if(!imgs.length) return;
  const box=document.createElement('div');box.className='lightbox';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.innerHTML='<button class="lightbox-close" aria-label="Close">×</button><button class="lightbox-prev" aria-label="Previous">‹</button><img alt=""><button class="lightbox-next" aria-label="Next">›</button><div class="lightbox-caption"></div>';
  document.body.appendChild(box); const big=box.querySelector('img'),cap=box.querySelector('.lightbox-caption'); let i=0;
  function show(n){i=(n+imgs.length)%imgs.length;big.src=imgs[i].src;big.alt=imgs[i].alt;cap.textContent=imgs[i].alt||'';box.classList.add('open');document.body.style.overflow='hidden'}
  function close(){box.classList.remove('open');document.body.style.overflow=''}
  imgs.forEach((im,n)=>im.addEventListener('click',()=>show(n))); box.querySelector('.lightbox-close').onclick=close; box.querySelector('.lightbox-prev').onclick=()=>show(i-1); box.querySelector('.lightbox-next').onclick=()=>show(i+1);
  box.addEventListener('click',e=>{if(e.target===box)close()}); document.addEventListener('keydown',e=>{if(!box.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});
})();

// Availability request form — test delivery via FormSubmit AJAX
(function(){
  const form=document.querySelector('#availability-form');
  if(!form) return;
  const status=form.querySelector('.form-status');
  const submit=form.querySelector('button[type="submit"]');
  const lang=document.documentElement.lang==='en'?'en':'it';
  const copy=lang==='en' ? {
    sending:'Sending your request…',
    error:'The request could not be sent. If this is the first test, check diomedeguest@gmail.com and activate FormSubmit from the email you received, then try again.',
    invalid:'Please complete all required fields correctly.',
    button:'Send request'
  } : {
    sending:'Invio della richiesta in corso…',
    error:'Non è stato possibile inviare la richiesta. Se è la prima prova, controlla diomedeguest@gmail.com e attiva FormSubmit dalla mail ricevuta, poi riprova.',
    invalid:'Compila correttamente tutti i campi obbligatori.',
    button:'Invia richiesta'
  };
  function setStatus(text,type){
    if(!status) return;
    status.textContent=text;
    status.className='form-status show '+(type||'');
  }
  form.addEventListener('submit',async function(e){
    if(!form.checkValidity()){
      e.preventDefault();
      form.reportValidity();
      setStatus(copy.invalid,'error');
      return;
    }
    if(!window.fetch) return; // normal POST fallback
    e.preventDefault();
    submit.disabled=true;
    const original=submit.textContent;
    submit.textContent=lang==='en'?'Sending…':'Invio…';
    setStatus(copy.sending,'sending');
    try{
      const res=await fetch(form.dataset.endpoint,{
        method:'POST',
        body:new FormData(form),
        headers:{'Accept':'application/json'}
      });
      let data={};
      try{ data=await res.json(); }catch(_e){}
      const ok=res.ok && (data.success===true || data.success==='true' || /success/i.test(String(data.message||'')));
      if(!ok) throw new Error('Form delivery not confirmed');
      window.location.href=form.dataset.success||'grazie.html';
    }catch(err){
      setStatus(copy.error,'error');
      submit.disabled=false;
      submit.textContent=original||copy.button;
    }
  });
})();
