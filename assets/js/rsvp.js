/* ==========================================================================
   RSVP.JS — "Find Your Invitation" lookup + Supabase-backed submission.
   Runs only on rsvp.html (bails out if the markup isn't present). Depends on
   supabaseClient from supabase-config.js and MEAL_OPTIONS/HOTEL_OPTIONS from
   content.js.

   A search returns every guest in the searched person's household (see
   find_invitation in supabase/functions.sql) - one member card per person is
   rendered into the form, and submitting sends one submit_rsvp call per
   member, so a whole party can RSVP in a single visit.
   ========================================================================== */
(function(){

  const searchStep = document.querySelector('[data-rsvp-search]');
  const foundStep = document.querySelector('[data-rsvp-found]');
  const rsvpForm = document.querySelector('[data-rsvp-form]');
  if(!searchStep || !foundStep || !rsvpForm) return;

  const firstNameInput = document.getElementById('searchFirstName');
  const lastNameInput = document.getElementById('searchLastName');
  const findBtn = document.querySelector('[data-find-invitation]');
  const searchMessage = document.querySelector('[data-search-message]');
  const searchAgainBtn = document.querySelector('[data-search-again]');
  const foundName = document.querySelector('[data-found-name]');
  const foundHousehold = document.querySelector('[data-found-household]');
  const foundBanner = document.querySelector('[data-found-banner]');
  const membersWrap = document.querySelector('[data-members-wrap]');

  const submitBtn = rsvpForm.querySelector('button[type="submit"]');
  const successEl = document.querySelector('[data-rsvp-success]');

  let currentMembers = null; // [{ guestId, firstName, lastName }]

  function setSearchMessage(text){
    if(!searchMessage) return;
    searchMessage.textContent = text || '';
    searchMessage.style.display = text ? 'block' : 'none';
  }

  function mealOptionsHtml(selected){
    return MEAL_OPTIONS.map((m, i) => {
      const isPlaceholder = i === 0;
      const isSelected = selected ? m === selected : isPlaceholder;
      return `<option value="${m}" ${isPlaceholder ? 'disabled' : ''} ${isSelected ? 'selected' : ''}>${m}</option>`;
    }).join('');
  }

  function hotelOptionsHtml(selected){
    return HOTEL_OPTIONS.map((h, i) => {
      const isPlaceholder = i === 0;
      const isSelected = selected ? h === selected : isPlaceholder;
      return `<option value="${h}" ${isPlaceholder ? 'disabled' : ''} ${isSelected ? 'selected' : ''}>${h}</option>`;
    }).join('');
  }

  function memberCardHtml(m){
    const existing = m.existingRsvp;
    const attendingYes = existing ? existing.attending : true;
    const welcomePartyYes = existing && existing.welcomeParty === true;
    const welcomePartyNo = !existing || existing.welcomeParty === false;

    return `
    <div class="rsvp-member" data-member-card data-guest-id="${m.guestId}" style="padding-top:28px; margin-top:28px; border-top:1px solid var(--line);">
      <h3 style="margin-bottom:16px;">${m.firstName} ${m.lastName}</h3>

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

        ${m.invitedPlusOne ? `
        <div class="form-block">
          <label for="guestName-${m.guestId}">Guest Name <span style="text-transform:none; letter-spacing:0;">(if bringing someone)</span></label>
          <input type="text" id="guestName-${m.guestId}" name="guestName-${m.guestId}" value="${existing && existing.guestName ? existing.guestName : ''}">
        </div>` : ''}

        <div class="form-block">
          <label for="meal-${m.guestId}">Meal Selection</label>
          <select id="meal-${m.guestId}" name="meal-${m.guestId}">${mealOptionsHtml(existing && existing.meal)}</select>
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

      </div>

      <div class="form-block">
        <label for="notes-${m.guestId}">Additional Notes</label>
        <textarea id="notes-${m.guestId}" name="notes-${m.guestId}" placeholder="Anything else we should know">${existing && existing.notes ? existing.notes : ''}</textarea>
        <p class="form-note">Song requests, questions, or just a hello - we read every note.</p>
      </div>
    </div>`;
  }

  function syncAttending(card){
    const guestId = card.dataset.guestId;
    const checked = card.querySelector(`input[name="attending-${guestId}"]:checked`);
    const conditionalFields = card.querySelector('[data-attending-fields]');
    if(conditionalFields){
      conditionalFields.style.display = (checked && checked.value === 'yes') ? '' : 'none';
    }
  }

  function wireCard(card){
    const guestId = card.dataset.guestId;
    card.querySelectorAll(`input[name="attending-${guestId}"]`).forEach(r => {
      r.addEventListener('change', () => syncAttending(card));
    });
    syncAttending(card);
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

    membersWrap.innerHTML = invitation.members.map(memberCardHtml).join('');
    membersWrap.querySelectorAll('[data-member-card]').forEach(wireCard);

    submitBtn.textContent = invitation.members.some(m => m.existingRsvp) ? 'Update RSVP' : 'Send RSVP';

    if(foundBanner) foundBanner.style.display = '';
    rsvpForm.style.display = '';
    successEl.classList.remove('is-visible');
    searchStep.style.display = 'none';
    foundStep.style.display = '';
    window.scrollTo({ top: foundStep.offsetTop - 120, behavior: 'smooth' });
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

    try {
      for(const member of currentMembers){
        const id = member.guestId;
        const attending = formData.get(`attending-${id}`) === 'yes';
        const welcomeParty = formData.get(`welcomeParty-${id}`) === 'yes';
        const { error } = await supabaseClient.rpc('submit_rsvp', {
          p_guest_id: id,
          p_first_name: member.firstName,
          p_last_name: member.lastName,
          p_attending: attending,
          p_guest_name: formData.get(`guestName-${id}`) || null,
          p_meal: formData.get(`meal-${id}`) || null,
          p_dietary: formData.get(`dietary-${id}`) || null,
          p_welcome_party: welcomeParty,
          p_hotel: formData.get(`hotel-${id}`) || null,
          p_notes: formData.get(`notes-${id}`) || null,
        });
        if(error) throw error;
      }

      rsvpForm.style.display = 'none';
      if(foundBanner) foundBanner.style.display = 'none';
      successEl.classList.add('is-visible');
      window.scrollTo({ top: successEl.offsetTop - 120, behavior: 'smooth' });
    } catch(err){
      console.error(err);
      submitBtn.textContent = originalText;
      alert("Something went wrong submitting your RSVP. Please try again.");
    } finally {
      submitBtn.disabled = false;
    }
  });

})();
