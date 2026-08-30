/* ==========================================================================
   SITE-GATE.JS — a simple shared password so search engines/randos landing on
   the URL don't see wedding details before we're ready to share them widely.

   This is NOT real security: the password lives in this file in plain text,
   visible to anyone who opens dev tools or views source. It's a soft gate for
   casual visitors, not protection against someone determined to look — don't
   rely on it to hide anything sensitive (the RSVP admin dashboard has its own
   real login and is unaffected by this file).

   Pairs with the inline anti-flash snippet in each page's <head>:
     <script>if(localStorage.getItem('siteUnlocked')!=='true'){document.documentElement.style.visibility='hidden';}</script>
   That hides the page instantly so there's no flash of content before this
   script (loaded later, with the rest) can decide whether to show it.
   ========================================================================== */
(function(){
  const STORAGE_KEY = 'siteUnlocked';
  const PASSWORD = 'susie';

  function reveal(){
    document.documentElement.style.visibility = '';
  }

  if(localStorage.getItem(STORAGE_KEY) === 'true'){
    reveal();
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'gate-overlay';
  overlay.innerHTML = `
    <div class="gate-box">
      <span class="gate-mark">Caitlin <span>&</span> Paul</span>
      <h2>This site is private</h2>
      <p class="gate-sub">Enter the password to continue.</p>
      <input type="password" class="gate-input" placeholder="Password" autocomplete="off">
      <button type="button" class="btn btn-primary gate-submit" style="width:100%; justify-content:center;">Enter <span class="btn-arrow">→</span></button>
      <p class="gate-error" style="display:none;">That's not quite right - please try again.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  // Note: <html> stays visibility:hidden (set by the inline head snippet) the
  // whole time the overlay is up — .gate-overlay explicitly sets its own
  // visibility:visible in CSS, which overrides that inherited hidden state
  // for just this element. reveal() only runs once the password is correct.

  const input = overlay.querySelector('.gate-input');
  const button = overlay.querySelector('.gate-submit');
  const error = overlay.querySelector('.gate-error');

  function tryUnlock(){
    const value = (input.value || '').trim().toLowerCase();
    if(value === PASSWORD){
      localStorage.setItem(STORAGE_KEY, 'true');
      overlay.remove();
      reveal();
    } else {
      error.style.display = 'block';
      input.value = '';
      input.focus();
    }
  }

  button.addEventListener('click', tryUnlock);
  input.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ tryUnlock(); } });
  setTimeout(() => input.focus(), 50);
})();
