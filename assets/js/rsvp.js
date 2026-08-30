/* ==========================================================================
   RSVP.JS — "Find Your Invitation" lookup + Supabase-backed submission.
   Runs only on rsvp.html (bails out if the markup isn't present). Depends on
   supabaseClient from supabase-config.js.
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

  const submitBtn = rsvpForm.querySelector('button[type="submit"]');
  const successEl = document.querySelector('[data-rsvp-success]');
  const guestNameField = document.getElementById('guestName').closest('div');

  const attendingRadios = rsvpForm.querySelectorAll('input[name="attending"]');
  const conditionalFields = rsvpForm.querySelector('[data-attending-fields]');

  let currentGuest = null; // { guestId, firstName, lastName }

  function syncAttending(){
    const checked = rsvpForm.querySelector('input[name="attending"]:checked');
    if(conditionalFields){
      conditionalFields.style.display = (checked && checked.value === 'yes') ? '' : 'none';
    }
  }
  attendingRadios.forEach(r => r.addEventListener('change', syncAttending));

  function setSearchMessage(text){
    if(!searchMessage) return;
    searchMessage.textContent = text || '';
    searchMessage.style.display = text ? 'block' : 'none';
  }

  function resetForm(){
    rsvpForm.reset();
    syncAttending();
  }

  function showFoundStep(invitation){
    currentGuest = {
      guestId: invitation.guestId,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
    };

    foundName.textContent = `${invitation.firstName} ${invitation.lastName}`;
    if(foundHousehold){
      if(invitation.household){
        foundHousehold.textContent = invitation.household;
        foundHousehold.style.display = '';
      } else {
        foundHousehold.style.display = 'none';
      }
    }
    if(guestNameField){
      guestNameField.style.display = invitation.invitedPlusOne ? '' : 'none';
    }

    resetForm();
    const existing = invitation.existingRsvp;
    if(existing){
      const radio = rsvpForm.querySelector(`input[name="attending"][value="${existing.attending ? 'yes' : 'no'}"]`);
      if(radio) radio.checked = true;
      if(existing.guestName) document.getElementById('guestName').value = existing.guestName;
      if(existing.meal) document.getElementById('meal').value = existing.meal;
      if(existing.dietary) document.getElementById('dietary').value = existing.dietary;
      if(existing.arrival) document.getElementById('arrival').value = existing.arrival;
      if(existing.departure) document.getElementById('departure').value = existing.departure;
      if(existing.hotel) document.getElementById('hotel').value = existing.hotel;
      if(existing.transportationNeeds) document.getElementById('transportNeeds').value = existing.transportationNeeds;
      if(existing.notes) document.getElementById('notes').value = existing.notes;
      submitBtn.textContent = 'Update RSVP';
    } else {
      submitBtn.textContent = 'Send RSVP';
    }
    syncAttending();

    if(foundBanner) foundBanner.style.display = '';
    rsvpForm.style.display = '';
    successEl.classList.remove('is-visible');
    searchStep.style.display = 'none';
    foundStep.style.display = '';
    window.scrollTo({ top: foundStep.offsetTop - 120, behavior: 'smooth' });
  }

  function resetToSearch(){
    currentGuest = null;
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

  rsvpForm.addEventListener('submit', async function(e){
    e.preventDefault();
    if(!currentGuest) return;

    const formData = new FormData(rsvpForm);
    const attending = formData.get('attending') === 'yes';
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const { error } = await supabaseClient.rpc('submit_rsvp', {
        p_guest_id: currentGuest.guestId,
        p_first_name: currentGuest.firstName,
        p_last_name: currentGuest.lastName,
        p_attending: attending,
        p_guest_name: formData.get('guestName') || null,
        p_meal: formData.get('meal') || null,
        p_dietary: formData.get('dietary') || null,
        p_arrival: formData.get('arrival') || null,
        p_departure: formData.get('departure') || null,
        p_hotel: formData.get('hotel') || null,
        p_transportation_needs: formData.get('transportNeeds') || null,
        p_notes: formData.get('notes') || null,
      });
      if(error) throw error;

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
