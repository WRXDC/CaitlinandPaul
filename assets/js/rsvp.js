/* ==========================================================================
   RSVP.JS — "Find Your Invitation" lookup + Supabase-backed submission.
   Runs only on rsvp.html (bails out if the markup isn't present). Depends on
   supabaseClient from supabase-config.js and MEAL_OPTIONS/HOTEL_OPTIONS from
   content.js.

   A search returns every guest in the searched person's household (see
   find_invitation in supabase/functions.sql) - one member card per person is
   rendered into the form, and submitting sends one submit_rsvp call per
   member, so a whole party can RSVP in a single visit. For parties of more
   than one, a sticky pill nav lets you jump between members and see at a
   glance who's been filled out.
   ========================================================================== */
(function(){

  const searchStep = document.querySelector('[data-rsvp-search]');
  const foundStep = document.querySelector('[data-rsvp-found]');
  const rsvpForm = document.querySelector('[data-rsvp-form]');
  const lockedStep = document.querySelector('[data-rsvp-locked]');
  if(!searchStep || !foundStep || !rsvpForm) return;

  // Past the deadline, lock the form instead of silently accepting (or
  // silently rejecting) late changes - guests are pointed to contact you
  // directly instead.
  const deadlinePassed = new Date() > new Date(WEDDING.rsvpDeadline.iso + 'T23:59:59');
  if(deadlinePassed){
    searchStep.style.display = 'none';
    foundStep.style.display = 'none';
    if(lockedStep) lockedStep.style.display = '';
    return;
  }

  const firstNameInput = document.getElementById('searchFirstName');
  const lastNameInput = document.getElementById('searchLastName');
  const findBtn = document.querySelector('[data-find-invitation]');
  const searchMessage = document.querySelector('[data-search-message]');
  const searchAgainBtn = document.querySelector('[data-search-again]');
  const foundName = document.querySelector('[data-found-name]');
  const foundHousehold = document.querySelector('[data-found-household]');
  const foundBanner = document.querySelector('[data-found-banner]');
  const membersNav = document.querySelector('[data-members-nav]');
  const membersWrap = document.querySelector('[data-members-wrap]');

  const submitBtn = rsvpForm.querySelector('button[type="submit"]');
  const successEl = document.querySelector('[data-rsvp-success]');
  const successHeading = document.querySelector('[data-success-heading]');
  const successBody = document.querySelector('[data-success-body]');
  const successCta = document.querySelector('[data-success-cta]');

  const SUCCESS_COPY = {
    attending: {
      heading: "You're on the list.",
      body: "Thank you for letting us know - we can't wait to celebrate with you in Mexico City. Check the Travel and Stay pages whenever you're ready to start planning your trip.",
      showCta: true,
    },
    declined: {
      heading: "We'll miss you.",
      body: "Thank you for letting us know - we're sorry you can't make it, but we really appreciate you taking the time to respond.",
      showCta: false,
    },
  };

  let currentMembers = null; // [{ guestId, firstName, lastName }]

  function setSearchMessage(text){
    if(!searchMessage) return;
    searchMessage.textContent = text || '';
    searchMessage.style.display = text ? 'block' : 'none';
  }

  // The placeholder is a real disabled option with an empty value, paired
  // with `required` on the <select> - so an attending guest can't silently
  // submit with the meal left on "Select a meal".
  function mealOptionsHtml(selected, required){
    return MEAL_OPTIONS.map((m, i) => {
      const isPlaceholder = i === 0;
      const isSelected = selected ? m === selected : isPlaceholder;
      return `<option value="${isPlaceholder ? '' : m}" ${isPlaceholder ? 'disabled' : ''} ${isSelected ? 'selected' : ''}>${m}</option>`;
    }).join('');
  }

  // Unlike meal, "not yet booked" (the first option) is a legitimate answer,
  // not just a placeholder - it stays enabled so it can actually be picked,
  // and the field isn't required.
  function hotelOptionsHtml(selected){
    return HOTEL_OPTIONS.map((h, i) => {
      const isSelected = selected ? h === selected : i === 0;
      return `<option value="${h}" ${isSelected ? 'selected' : ''}>${h}</option>`;
    }).join('');
  }

  function memberCardHtml(m, index, total){
    const existing = m.existingRsvp;
    const attendingYes = existing ? existing.attending : true;
    const welcomePartyYes = existing && existing.welcomeParty === true;
    const welcomePartyNo = !existing || existing.welcomeParty === false;
    const hasPlusOne = existing && existing.guestName;

    return `
    <div class="rsvp-member" data-member-card data-guest-id="${m.guestId}" id="member-${m.guestId}">
      <div class="rsvp-member-head">
        ${total > 1 ? `<span class="rsvp-member-num">${index + 1} of ${total}</span>` : ''}
        <h3>${m.firstName} ${m.lastName}</h3>
      </div>

      <div class="form-block">
        <label>Will ${m.firstName} be joining us?</label>
        <div class="radio-group">
          <label class="radio-pill">
            <input type="radio" name="attending-${m.guestId}" value="yes" ${attendingYes ? 'checked' : ''}>
            <span>Joyfully Yes</span>
          </label>
          <label class="radio-pill">
            <input type="radio" name="attending-${m.guestId}" value="no" ${!attendingYes ? 'checked' : ''}>
            <span>Sadly Can't Make It</span>
          </label>
        </div>
      </div>

      <div data-attending-fields>

        <div class="form-block">
          <label for="meal-${m.guestId}">Meal Selection</label>
          <select id="meal-${m.guestId}" name="meal-${m.guestId}" required data-track>${mealOptionsHtml(existing && existing.meal)}</select>
        </div>

        <div class="form-block">
          <label for="dietary-${m.guestId}">Dietary Restrictions</label>
          <textarea id="dietary-${m.guestId}" name="dietary-${m.guestId}" placeholder="Allergies, preferences, anything we should know">${existing && existing.dietary ? existing.dietary : ''}</textarea>
        </div>

        <div class="form-block">
          <label>Will ${m.firstName} join us for the Friday welcome party?</label>
          <div class="radio-group">
            <label class="radio-pill">
              <input type="radio" name="welcomeParty-${m.guestId}" value="yes" ${welcomePartyYes ? 'checked' : ''}>
              <span>Yes</span>
            </label>
            <label class="radio-pill">
              <input type="radio" name="welcomeParty-${m.guestId}" value="no" ${welcomePartyNo ? 'checked' : ''}>
              <span>Not planning to</span>
            </label>
          </div>
        </div>

        <div class="form-block">
          <label for="hotel-${m.guestId}">Hotel / Accommodation</label>
          <select id="hotel-${m.guestId}" name="hotel-${m.guestId}">${hotelOptionsHtml(existing && existing.hotel)}</select>
          <p class="form-note">Haven't booked yet? Pick "not yet booked" - you can always come back and update this once you have.</p>
        </div>

        ${m.invitedPlusOne ? `
        <div class="rsvp-plus-one" data-plus-one-block>
          <div class="form-block">
            <label for="guestName-${m.guestId}">Bringing a Guest? <span style="text-transform:none; letter-spacing:0;">(optional - enter their name)</span></label>
            <input type="text" id="guestName-${m.guestId}" name="guestName-${m.guestId}" data-track placeholder="Their name" value="${existing && existing.guestName ? existing.guestName : ''}">
          </div>
          <div data-plus-one-fields style="display:${hasPlusOne ? '' : 'none'};">
            <div class="form-block">
              <label for="plusOneMeal-${m.guestId}">Their Meal Selection</label>
              <select id="plusOneMeal-${m.guestId}" name="plusOneMeal-${m.guestId}" data-track>${mealOptionsHtml(existing && existing.plusOneMeal)}</select>
            </div>
            <div class="form-block">
              <label for="plusOneDietary-${m.guestId}">Their Dietary Restrictions</label>
              <textarea id="plusOneDietary-${m.guestId}" name="plusOneDietary-${m.guestId}" placeholder="Allergies, preferences, anything we should know">${existing && existing.plusOneDietary ? existing.plusOneDietary : ''}</textarea>
            </div>
          </div>
        </div>` : ''}

      </div>

      <div class="form-block">
        <label for="notes-${m.guestId}">Additional Notes</label>
        <textarea id="notes-${m.guestId}" name="notes-${m.guestId}" placeholder="Anything else we should know">${existing && existing.notes ? existing.notes : ''}</textarea>
        <p class="form-note" data-notes-hint>Song requests, questions, or just a hello - we read every note.</p>
      </div>
    </div>`;
  }

  const NOTES_COPY = {
    yes: { placeholder: 'Anything else we should know', hint: "Song requests, questions, or just a hello - we read every note." },
    no: { placeholder: "We'll miss you - anything you'd like to share?", hint: "Sorry we'll miss you! Let us know if there's anything you'd like us to know." },
  };

  function syncNotes(card, attendingYes){
    const guestId = card.dataset.guestId;
    const textarea = card.querySelector(`#notes-${guestId}`);
    const hint = card.querySelector('[data-notes-hint]');
    const copy = attendingYes ? NOTES_COPY.yes : NOTES_COPY.no;
    if(textarea) textarea.placeholder = copy.placeholder;
    if(hint) hint.textContent = copy.hint;
  }

  function syncAttending(card){
    const guestId = card.dataset.guestId;
    const checked = card.querySelector(`input[name="attending-${guestId}"]:checked`);
    const attendingYes = !!(checked && checked.value === 'yes');
    const conditionalFields = card.querySelector('[data-attending-fields]');
    if(conditionalFields){
      conditionalFields.style.display = attendingYes ? '' : 'none';
    }
    // CSS display:none does NOT exempt a field from constraint validation -
    // only removing `required` does. Without this, declining attendance left
    // the hidden meal select still required, so the browser silently blocked
    // submission on a field it couldn't even show the user.
    const meal = card.querySelector(`#meal-${guestId}`);
    if(meal) meal.required = attendingYes;
    syncPlusOne(card);
    syncNotes(card, attendingYes);
  }

  // A plus-one's meal/dietary fields only appear (and meal is only required)
  // once a name has actually been entered - otherwise "bringing a guest" is
  // left blank and there's nothing to force a meal choice for.
  function syncPlusOne(card){
    const guestId = card.dataset.guestId;
    const nameInput = card.querySelector(`#guestName-${guestId}`);
    const fields = card.querySelector('[data-plus-one-fields]');
    const mealSelect = card.querySelector(`#plusOneMeal-${guestId}`);
    if(!nameInput || !fields) return;
    const attending = card.querySelector(`input[name="attending-${guestId}"]:checked`);
    const attendingYes = !!(attending && attending.value === 'yes');
    const hasName = attendingYes && nameInput.value.trim().length > 0;
    fields.style.display = hasName ? '' : 'none';
    if(mealSelect) mealSelect.required = hasName;
  }

  // Marks a member's nav pill "done" once their attending decision - and,
  // if attending, a real meal choice (and their plus-one's, if named) - is
  // actually made, so the pills double as an at-a-glance progress tracker.
  function updateNavState(card){
    const guestId = card.dataset.guestId;
    const pill = membersNav && membersNav.querySelector(`[data-nav-for="${guestId}"]`);
    if(!pill) return;
    const attending = card.querySelector(`input[name="attending-${guestId}"]:checked`);
    let done = !!attending;
    if(attending && attending.value === 'yes'){
      const meal = card.querySelector(`#meal-${guestId}`);
      done = !!(meal && meal.value);
      const plusOneMeal = card.querySelector(`#plusOneMeal-${guestId}`);
      if(plusOneMeal && plusOneMeal.required){
        done = done && !!plusOneMeal.value;
      }
    }
    pill.classList.toggle('is-done', done);
  }

  function wireCard(card){
    const guestId = card.dataset.guestId;
    card.querySelectorAll(`input[name="attending-${guestId}"]`).forEach(r => {
      r.addEventListener('change', () => { syncAttending(card); updateNavState(card); });
    });
    syncAttending(card);

    const nameInput = card.querySelector(`#guestName-${guestId}`);
    if(nameInput){
      nameInput.addEventListener('input', () => { syncPlusOne(card); updateNavState(card); });
      syncPlusOne(card);
    }

    card.querySelectorAll('[data-track]').forEach(el => {
      el.addEventListener('change', () => updateNavState(card));
    });

    updateNavState(card);
  }

  function membersNavHtml(members){
    if(members.length <= 1) return '';
    return members.map(m => `
      <button type="button" class="member-nav-pill" data-nav-for="${m.guestId}">
        <span class="member-nav-check"></span>${m.firstName}
      </button>
    `).join('');
  }

  function wireNav(){
    if(!membersNav) return;
    membersNav.querySelectorAll('[data-nav-for]').forEach(pill => {
      pill.addEventListener('click', () => {
        const card = document.getElementById(`member-${pill.dataset.navFor}`);
        if(card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function showFoundStep(invitation){
    currentMembers = invitation.members.map(m => ({
      guestId: m.guestId,
      firstName: m.firstName,
      lastName: m.lastName,
    }));

    const searched = invitation.members.find(m =>
      m.firstName.toLowerCase() === firstNameInput.value.trim().toLowerCase() &&
      m.lastName.toLowerCase() === lastNameInput.value.trim().toLowerCase()
    ) || invitation.members[0];
    foundName.textContent = `${searched.firstName} ${searched.lastName}`;

    if(foundHousehold){
      if(invitation.household){
        foundHousehold.textContent = invitation.members.length > 1
          ? `${invitation.household} - RSVP below for everyone in your party.`
          : invitation.household;
        foundHousehold.style.display = '';
      } else {
        foundHousehold.style.display = 'none';
      }
    }

    if(membersNav){
      membersNav.style.display = invitation.members.length > 1 ? '' : 'none';
      membersNav.innerHTML = membersNavHtml(invitation.members);
    }
    membersWrap.innerHTML = invitation.members.map((m, i) => memberCardHtml(m, i, invitation.members.length)).join('');
    membersWrap.querySelectorAll('[data-member-card]').forEach(wireCard);
    wireNav();

    submitBtn.textContent = invitation.members.some(m => m.existingRsvp) ? 'Update RSVP' : 'Send RSVP';

    if(foundBanner) foundBanner.style.display = '';
    rsvpForm.style.display = '';
    successEl.classList.remove('is-visible');
    searchStep.style.display = 'none';
    foundStep.style.display = '';
    // foundStep sits close to the top of the page (it replaces the compact
    // search step in the same spot), so a hardcoded window.scrollTo landed
    // near the very top of the page - a jarring jump backward for anyone
    // who'd scrolled down at all to reach the button. scrollIntoView only
    // moves the minimum distance needed, or not at all if it's already in view.
    foundStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function resetToSearch(){
    currentMembers = null;
    foundStep.style.display = 'none';
    searchStep.style.display = '';
    setSearchMessage('');
    firstNameInput.value = '';
    lastNameInput.value = '';
    firstNameInput.focus();
  }

  async function findInvitation(){
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    if(!firstName || !lastName){
      setSearchMessage('Please enter your first and last name.');
      return;
    }
    findBtn.disabled = true;
    setSearchMessage('Searching…');
    try {
      const { data, error } = await supabaseClient.rpc('find_invitation', {
        p_first_name: firstName,
        p_last_name: lastName,
      });
      if(error) throw error;
      if(!data || !data.found){
        setSearchMessage(data && data.multiple
          ? "We found more than one invitation under that name - please reach out to us directly so we can sort it out."
          : "We couldn't find an invitation under that name. Double-check the spelling, or reach out to us directly.");
        return;
      }
      setSearchMessage('');
      showFoundStep(data);
    } catch(err){
      console.error(err);
      setSearchMessage('Something went wrong searching for your invitation. Please try again in a moment.');
    } finally {
      findBtn.disabled = false;
    }
  }

  findBtn.addEventListener('click', findInvitation);
  [firstNameInput, lastNameInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){ e.preventDefault(); findInvitation(); }
    });
  });
  if(searchAgainBtn) searchAgainBtn.addEventListener('click', resetToSearch);

  // Enter key in a text/date/select field natively submits the form, which
  // was firing a real (often incomplete) RSVP submission every time - it felt
  // like the page "jumping back to the top" since that's where the success
  // message sits. Only an explicit click/Enter on the submit button itself
  // should submit.
  rsvpForm.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit'){
      e.preventDefault();
    }
  });

  rsvpForm.addEventListener('submit', async function(e){
    e.preventDefault();
    if(!currentMembers || !currentMembers.length) return;

    const formData = new FormData(rsvpForm);
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    // Attempt every household member's RSVP even if one fails, rather than
    // stopping at the first error - submit_rsvp upserts by guest_id, so
    // re-submitting on retry is harmless for whoever already succeeded.
    const results = await Promise.allSettled(currentMembers.map(member => {
      const id = member.guestId;
      const attending = formData.get(`attending-${id}`) === 'yes';
      const welcomeParty = formData.get(`welcomeParty-${id}`) === 'yes';
      return supabaseClient.rpc('submit_rsvp', {
        p_guest_id: id,
        p_first_name: member.firstName,
        p_last_name: member.lastName,
        p_attending: attending,
        p_guest_name: formData.get(`guestName-${id}`) || null,
        p_meal: formData.get(`meal-${id}`) || null,
        p_dietary: formData.get(`dietary-${id}`) || null,
        p_plus_one_meal: formData.get(`plusOneMeal-${id}`) || null,
        p_plus_one_dietary: formData.get(`plusOneDietary-${id}`) || null,
        p_welcome_party: welcomeParty,
        p_hotel: formData.get(`hotel-${id}`) || null,
        p_notes: formData.get(`notes-${id}`) || null,
      }).then(({ error }) => { if(error) throw error; });
    }));

    submitBtn.disabled = false;

    const failed = results
      .map((result, i) => ({ result, member: currentMembers[i] }))
      .filter(x => x.result.status === 'rejected');

    if(failed.length === 0){
      // If even one member of the household is attending, this is still a
      // celebration - only show the "we'll miss you" copy when everyone
      // who just submitted declined.
      const anyAttending = currentMembers.some(member => formData.get(`attending-${member.guestId}`) === 'yes');
      const copy = anyAttending ? SUCCESS_COPY.attending : SUCCESS_COPY.declined;
      if(successHeading) successHeading.textContent = copy.heading;
      if(successBody) successBody.textContent = copy.body;
      if(successCta) successCta.style.display = copy.showCta ? '' : 'none';

      // Deliberately NOT hiding the form/banner here. For a large household
      // the submit button can sit thousands of pixels down the page - hiding
      // everything above the success message collapses the page and forces
      // a jarring jump back up to where that content used to be. Leaving the
      // form in place means the success message just appears right where
      // the user already is, below the button they just pressed.
      submitBtn.textContent = 'Update RSVP';
      successEl.classList.add('is-visible');
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      failed.forEach(f => console.error(f.member, f.result.reason));
      submitBtn.textContent = originalText;
      const names = failed.map(f => f.member.firstName).join(', ');
      const savedCount = currentMembers.length - failed.length;
      const savedNote = savedCount > 0 ? ' The rest of your party saved fine - no need to redo them.' : '';
      alert(`We couldn't save the RSVP for ${names}. Please try again in a moment.${savedNote}`);
    }
  });

})();
