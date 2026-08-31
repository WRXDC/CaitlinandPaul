/* ==========================================================================
   RSVP-ADMIN.JS — auth-gated dashboard for rsvp-admin.html.
   Reads guests+rsvps directly via supabaseClient (allowed only for an
   authenticated session, per the RLS policies in supabase/schema.sql).
   Depends on supabaseClient from supabase-config.js.
   ========================================================================== */
(function(){

  const loginPanel = document.querySelector('[data-admin-login]');
  const dashboard = document.querySelector('[data-admin-dashboard]');
  const loginBtn = document.querySelector('[data-admin-login-btn]');
  const logoutBtn = document.querySelector('[data-admin-logout]');
  const loginMessage = document.querySelector('[data-admin-login-message]');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');
  const userLabel = document.querySelector('[data-admin-user]');
  if(!loginPanel || !dashboard) return;

  const searchInput = document.querySelector('[data-admin-search]');
  const filterSelect = document.querySelector('[data-admin-filter]');
  const exportBtn = document.querySelector('[data-admin-export]');
  const tableBody = document.querySelector('[data-admin-table-body]');
  const emptyMessage = document.querySelector('[data-admin-empty]');

  const statInvited = document.querySelector('[data-stat-invited]');
  const statResponded = document.querySelector('[data-stat-responded]');
  const statAttending = document.querySelector('[data-stat-attending]');
  const statDeclined = document.querySelector('[data-stat-declined]');
  const statPending = document.querySelector('[data-stat-pending]');

  let rows = []; // [{ guest, rsvp, status }]

  function escapeHtml(value){
    const s = (value === null || value === undefined) ? '' : String(value);
    return s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function setLoginMessage(text){
    loginMessage.textContent = text || '';
    loginMessage.style.display = text ? 'block' : 'none';
  }

  function showDashboard(session){
    loginPanel.style.display = 'none';
    dashboard.style.display = '';
    userLabel.textContent = session.user.email;
    loadData();
  }

  function showLogin(){
    dashboard.style.display = 'none';
    loginPanel.style.display = '';
    passwordInput.value = '';
  }

  async function signIn(){
    setLoginMessage('Signing in…');
    loginBtn.disabled = true;
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });
    loginBtn.disabled = false;
    if(error){ setLoginMessage('Incorrect email or password.'); return; }
    setLoginMessage('');
    showDashboard(data.session);
  }

  loginBtn.addEventListener('click', signIn);
  [emailInput, passwordInput].forEach(el => el.addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); signIn(); }
  }));

  logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    showLogin();
  });

  async function loadData(){
    const { data, error } = await supabaseClient
      .from('guests')
      .select('id, first_name, last_name, household, invited_plus_one, plus_one_name, rsvps(attending, guest_name, meal, dietary, welcome_party, hotel, notes, updated_at)')
      .order('household', { ascending: true, nullsFirst: false })
      .order('last_name', { ascending: true });

    if(error){
      console.error(error);
      return;
    }

    rows = data.map(g => {
      const rsvp = Array.isArray(g.rsvps) ? (g.rsvps[0] || null) : (g.rsvps || null);
      const status = !rsvp ? 'pending' : (rsvp.attending ? 'attending' : 'declined');
      return { guest: g, rsvp, status };
    });

    renderStats();
    renderTable();
  }

  function renderStats(){
    const invited = rows.length;
    const responded = rows.filter(r => r.status !== 'pending').length;
    statInvited.textContent = invited;
    statResponded.textContent = responded;
    statAttending.textContent = rows.filter(r => r.status === 'attending').length;
    statDeclined.textContent = rows.filter(r => r.status === 'declined').length;
    statPending.textContent = rows.filter(r => r.status === 'pending').length;
  }

  function statusLabel(status){
    return status === 'attending' ? 'Attending' : status === 'declined' ? 'Declined' : 'Pending';
  }

  function getFiltered(){
    const q = (searchInput.value || '').trim().toLowerCase();
    const statusFilter = filterSelect.value;
    return rows.filter(r => {
      if(statusFilter !== 'all' && r.status !== statusFilter) return false;
      if(!q) return true;
      const haystack = [r.guest.first_name, r.guest.last_name, r.guest.household, r.rsvp && r.rsvp.guest_name]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  function welcomePartyLabel(rsvp){
    if(!rsvp || rsvp.welcome_party === null || rsvp.welcome_party === undefined) return '';
    return rsvp.welcome_party ? 'Yes' : 'No';
  }

  function renderTable(){
    const filtered = getFiltered();
    emptyMessage.style.display = filtered.length ? 'none' : 'block';
    let prevHousehold; // undefined on the first row, so it always counts as a new group
    tableBody.innerHTML = filtered.map(r => {
      const g = r.guest, rsvp = r.rsvp;
      const name = `${g.first_name} ${g.last_name}` + (rsvp && rsvp.guest_name ? ` + ${rsvp.guest_name}` : '');
      // Guests with no household are each their own group, not one big
      // blank-household group - only actually-matching households collapse.
      const isNewGroup = !g.household || g.household !== prevHousehold;
      prevHousehold = g.household;
      const groupStyle = isNewGroup ? ' style="border-top:2px solid var(--line-strong);"' : '';
      return `<tr${groupStyle}>
        <td>${escapeHtml(name)}</td>
        <td>${isNewGroup ? escapeHtml(g.household) : ''}</td>
        <td><span class="status-badge status-${r.status}">${statusLabel(r.status)}</span></td>
        <td>${escapeHtml(rsvp && rsvp.meal)}</td>
        <td>${escapeHtml(rsvp && rsvp.dietary)}</td>
        <td>${escapeHtml(welcomePartyLabel(rsvp))}</td>
        <td>${escapeHtml(rsvp && rsvp.hotel)}</td>
        <td>${escapeHtml(rsvp && rsvp.notes)}</td>
      </tr>`;
    }).join('');
  }

  searchInput.addEventListener('input', renderTable);
  filterSelect.addEventListener('change', renderTable);

  function csvEscape(value){
    const s = (value === null || value === undefined) ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  exportBtn.addEventListener('click', () => {
    const filtered = getFiltered();
    const headers = ['First Name','Last Name','Household','Status','Guest Name','Meal','Dietary','Welcome Party','Hotel','Notes'];
    const lines = [headers.join(',')];
    filtered.forEach(r => {
      const g = r.guest, rsvp = r.rsvp;
      lines.push([
        g.first_name, g.last_name, g.household || '', statusLabel(r.status),
        (rsvp && rsvp.guest_name) || '', (rsvp && rsvp.meal) || '', (rsvp && rsvp.dietary) || '',
        welcomePartyLabel(rsvp), (rsvp && rsvp.hotel) || '', (rsvp && rsvp.notes) || '',
      ].map(csvEscape).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rsvps.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    if(data.session){ showDashboard(data.session); } else { showLogin(); }
  });
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if(session){ showDashboard(session); } else { showLogin(); }
  });

})();
