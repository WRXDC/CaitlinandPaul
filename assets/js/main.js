/* ==========================================================================
   MAIN.JS — shared interactions across every page.
   Depends on content.js being loaded first.
   ========================================================================== */

(function(){

  /* ---------------- Nav: scroll state + active link ---------------- */
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const mobilePanel = document.querySelector('.mobile-panel');

  function onScroll(){
    if(!nav) return;
    if(window.scrollY > 40){ nav.classList.add('is-scrolled'); }
    else { nav.classList.remove('is-scrolled'); }
  }
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();

  if(toggle && mobilePanel){
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('is-open');
      mobilePanel.classList.toggle('is-open', open);
      // Force light-background nav styling while the (light) mobile panel is
      // open, regardless of scroll position, so the mark/toggle stay legible.
      nav.classList.toggle('on-light', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobilePanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      toggle.classList.remove('is-open');
      mobilePanel.classList.remove('is-open');
      nav.classList.remove('on-light');
      document.body.style.overflow = '';
    }));
  }

  // Mark active nav link based on current page filename
  const current = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-links a, .mobile-panel a').forEach(a => {
    const href = a.getAttribute('href');
    if(href === current || (current === '' && href === 'index.html')){
      a.classList.add('is-active');
    }
  });

  /* ---------------- Reveal-on-scroll ----------------
     Most pages inject their real content (cards, timelines, FAQ items) via an
     inline <script> that runs after this file, so a one-time querySelectorAll
     here would miss all of it and leave those elements at opacity:0 forever.
     A MutationObserver picks up .reveal elements whenever they're added,
     regardless of which script added them or when. */
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold:.12, rootMargin:'0px 0px -40px 0px' });

    const observeNew = (root) => {
      (root.matches && root.matches('.reveal') ? [root] : [])
        .concat(root.querySelectorAll ? Array.from(root.querySelectorAll('.reveal')) : [])
        .forEach(el => io.observe(el));
    };
    observeNew(document.body);

    new MutationObserver((mutations) => {
      mutations.forEach(m => m.addedNodes.forEach(node => {
        if(node.nodeType === 1) observeNew(node);
      }));
    }).observe(document.body, { childList:true, subtree:true });
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  }

  /* ---------------- Countdown ---------------- */
  function startCountdown(){
    const wrap = document.querySelector('[data-countdown]');
    if(!wrap || typeof COUNTDOWN_TARGET === 'undefined') return;
    const dEl = wrap.querySelector('[data-cd-days]');
    const hEl = wrap.querySelector('[data-cd-hours]');
    const mEl = wrap.querySelector('[data-cd-mins]');
    const sEl = wrap.querySelector('[data-cd-secs]');

    function tick(){
      const now = new Date();
      let diff = COUNTDOWN_TARGET - now;
      if(diff < 0) diff = 0;
      const days = Math.floor(diff / (1000*60*60*24));
      const hours = Math.floor((diff / (1000*60*60)) % 24);
      const mins = Math.floor((diff / (1000*60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      if(dEl) dEl.textContent = days;
      if(hEl) hEl.textContent = String(hours).padStart(2,'0');
      if(mEl) mEl.textContent = String(mins).padStart(2,'0');
      if(sEl) sEl.textContent = String(secs).padStart(2,'0');
    }
    tick();
    setInterval(tick, 1000);
  }
  startCountdown();

  /* ---------------- Accordion (FAQ) ---------------- */
  document.querySelectorAll('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const panel = item.querySelector('.accordion-panel');
      const isOpen = item.classList.contains('is-open');
      item.classList.toggle('is-open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
      panel.style.maxHeight = !isOpen ? panel.scrollHeight + 'px' : '0px';
    });
  });

  /* ---------------- FAQ live search ---------------- */
  const faqSearch = document.querySelector('[data-faq-search]');
  if(faqSearch){
    const items = Array.from(document.querySelectorAll('.accordion-item'));
    const categoryLabels = Array.from(document.querySelectorAll('.faq-category-label'));
    const noResults = document.querySelector('.no-results');
    faqSearch.addEventListener('input', () => {
      const q = faqSearch.value.trim().toLowerCase();
      let anyVisible = false;
      items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const match = text.includes(q);
        item.style.display = match ? '' : 'none';
        if(match) anyVisible = true;
      });
      categoryLabels.forEach(label => {
        let next = label.nextElementSibling;
        let hasVisible = false;
        while(next && !next.classList.contains('faq-category-label')){
          if(next.classList.contains('accordion-item') && next.style.display !== 'none') hasVisible = true;
          next = next.nextElementSibling;
        }
        label.style.display = hasVisible ? '' : 'none';
      });
      if(noResults) noResults.style.display = anyVisible ? 'none' : 'block';
    });
  }

})();

/* ==========================================================================
   Render helpers — used by page-specific inline scripts to turn content.js
   data into markup, so every page stays a thin template over one data source.
   ========================================================================== */

const Render = {
  photoBlock(label, toneIndex, extraClass){
    const tone = 'tone-' + (((toneIndex||0) % 5) + 1);
    return `<div class="photo-block ${tone} ${extraClass||''}">
      <span class="photo-plus">+</span>
      <span class="photo-label">${label}</span>
    </div>`;
  },

  photoFrame(src, alt, caption, toneIndex, extraClass){
    if (!src) return Render.photoBlock(caption || alt, toneIndex, extraClass);
    return `<div class="photo-frame ${extraClass||''}">
      <img src="${src}" alt="${alt}" loading="lazy">
      ${caption ? `<span class="photo-caption">${caption}</span>` : ''}
    </div>`;
  },

  infoCard(num, title, body, linkText, linkHref){
    return `<div class="info-card reveal">
      <span class="icon-num">${num}</span>
      <h3>${title}</h3>
      <p>${body}</p>
      ${linkText ? `<a class="btn-ghost card-link" href="${linkHref||'#'}">${linkText}</a>` : ''}
    </div>`;
  },

  glanceCard(items){
    return `<div class="glance-card reveal">
      <div class="glance-grid">
        ${items.map(i => `<div class="glance-item"><span class="g-label">${i.label}</span><span class="g-value">${i.value}</span></div>`).join('')}
      </div>
    </div>`;
  },

  travelBlock(list, startIndex){
    return list.map((item, i) => `
      <div class="reveal" style="padding:26px 0; border-bottom:1px solid var(--line);">
        <h4>${item.title}</h4>
        <p class="mt-1">${item.body}</p>
      </div>
    `).join('');
  },

  neighborhoodCard(n, i){
    return `<div class="neigh-card reveal">
      ${Render.photoFrame(n.img, n.name + ' neighborhood', n.name, i)}
      <div class="neigh-card-body">
        <span class="eyebrow">${n.vibe}</span>
        <h3 class="mt-1">${n.name}</h3>
        <p class="mt-1">${n.description}</p>
        <div class="neigh-tags">
          <span class="tag">Best for: ${n.bestFor}</span>
        </div>
        <div class="neigh-meta">
          <div><span class="label">Distance to Casa Xipe</span><span class="value">${n.distance}</span></div>
        </div>
      </div>
    </div>`;
  },

  hotelCard(hotel, neighborhoodName, i){
    const tag = hotel.roomBlock
      ? `<span class="room-block-tag">Our Room Block</span>`
      : (hotel.name === 'Hotel Name TBD' ? `<span class="needs-input">Add hotel details</span>` : '');
    const bookLink = hotel.bookingUrl
      ? `<a class="btn-ghost" href="${hotel.bookingUrl}">Book Hotel →</a>`
      : (hotel.roomBlock
        ? `<span class="dist-note">Booking link coming soon</span>`
        : `<a class="btn-ghost" href="#">Book Hotel →</a>`);
    return `<div class="hotel-card reveal">
      ${Render.photoFrame(hotel.img, hotel.name, hotel.name, i)}
      <div class="hotel-card-body">
        <div class="hotel-card-top">
          <div>
            ${tag}
            <h4 class="mt-1">${hotel.name}</h4>
          </div>
          <span class="price-tier">${hotel.tier}</span>
        </div>
        <p>${hotel.desc}</p>
        <div class="hotel-card-foot">
          <span class="dist-note">${hotel.distance} to Casa Xipe · ${neighborhoodName}</span>
          ${bookLink}
        </div>
      </div>
    </div>`;
  },

  exploreCard(item, i, opts){
    opts = opts || {};
    return `<div class="feature-card reveal">
      ${Render.photoFrame(item.img, item.name || item.category, item.name || item.category, i)}
      <div class="flex-between">
        <h3 style="font-size:1.15rem;">${item.name || item.category}</h3>
        ${item.price ? `<span class="small-caps" style="color:var(--clay-dark);">${item.price}</span>` : ''}
      </div>
      ${item.neighborhood ? `<span class="small-caps" style="color:var(--charcoal-50); margin-top:4px; display:block;">${item.neighborhood}</span>` : ''}
      <p class="mt-1">${item.desc}</p>
    </div>`;
  },

  accordionItem(q, a, idx){
    return `<div class="accordion-item">
      <button class="accordion-trigger" aria-expanded="false">
        <span>${q}</span>
        <span class="acc-plus">+</span>
      </button>
      <div class="accordion-panel">
        <div class="accordion-panel-inner"><p>${a}</p></div>
      </div>
    </div>`;
  },
};
