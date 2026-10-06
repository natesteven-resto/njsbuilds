/**
 * The Midwest Job — Client-side app
 * UI is a renderer and input router only.
 * Engine is the authority. Never hardcode outcomes here.
 */

'use strict';

// ─── API ─────────────────────────────────────────────────────────────────────

// API base URL is configurable for deployment.
// When served via Next.js, API routes are at /api/midwest/...
// When running the local Express server, they're at /api/...
const API_BASE = (typeof MIDWEST_API_BASE !== 'undefined' && MIDWEST_API_BASE) ? MIDWEST_API_BASE : '/api/midwest';

const api = {
  async get(path) {
    // Remap /api/X -> API_BASE/X
    const fullPath = path.startsWith('/api/') ? API_BASE + path.slice(4) : path;
    const r = await fetch(fullPath);
    return r.json();
  },
  async post(path, body) {
    const fullPath = path.startsWith('/api/') ? API_BASE + path.slice(4) : path;
    const r = await fetch(fullPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  },
};

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  activeScreen: 'mail',
  mailDraft: { to: '', subject: '', body: '' }, // persisted in localStorage
  devClockMs: null,
  operation: null,
};

// Draft persistence
function saveDraft() {
  localStorage.setItem('mj_draft', JSON.stringify(state.mailDraft));
}
function loadDraft() {
  try {
    const d = localStorage.getItem('mj_draft');
    if (d) state.mailDraft = JSON.parse(d);
  } catch {}
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg, type = 'info', ms = 3500) {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function navigate(screen) {
  state.activeScreen = screen;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.screen === screen));
  document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === `screen-${screen}`));
  document.getElementById('topbar-title').textContent = screenTitle(screen);
  renderScreen(screen);
}

function screenTitle(s) {
  const titles = {
    mail: 'Mail',
    contacts: 'Contacts',
    files: 'Files',
    notes: 'Notes',
    plan: 'Plan',
    crew: 'Crew',
    operation: 'Operation',
    dev: 'Dev Controls',
  };
  return titles[s] || s;
}

// ─── Screen Router ─────────────────────────────────────────────────────────────

async function renderScreen(screen) {
  switch (screen) {
    case 'mail':      await renderMail();      break;
    case 'contacts':  await renderContacts();  break;
    case 'files':     await renderFiles();     break;
    case 'notes':     await renderNotes();     break;
    case 'plan':      await renderPlan();      break;
    case 'crew':      await renderCrew();      break;
    case 'operation': await renderOperation(); break;
    case 'dev':       await renderDev();       break;
  }
}

// ─── Mail ─────────────────────────────────────────────────────────────────────

async function renderMail() {
  const el = document.getElementById('screen-mail');
  el.innerHTML = `<div class="screen-title">Mail</div><div id="mail-list"></div>`;
  const list = document.getElementById('mail-list');
  const data = await api.get('/api/mail');
  if (!data.ok) { list.innerHTML = `<div class="empty-state">Error loading mail.</div>`; return; }

  if (!data.threads.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">✉</div>No messages.</div>`;
    return;
  }

  list.innerHTML = data.threads.map(t => {
    const last = t.lastMessage;
    const ts = last ? fmtTimestamp(last.timestamp) : '';
    return `
    <div class="card" onclick="showMailThread('${t.id}')">
      <div class="card-row">
        ${t.unread ? '<div class="unread-dot"></div>' : '<div style="width:8px"></div>'}
        <div style="flex:1;min-width:0">
          <div class="card-title">${escHtml(t.contactLabel)}</div>
          <div class="card-meta">${last ? escHtml(last.subject) : '—'} · ${ts}</div>
        </div>
        <div class="card-chevron">›</div>
      </div>
    </div>`;
  }).join('');

  // Compose button
  el.insertAdjacentHTML('beforeend', `
    <div style="margin-top:20px">
      <button class="btn btn-primary" onclick="showCompose()">✍ New Message</button>
    </div>
  `);
}

async function showMailThread(threadId) {
  const el = document.getElementById('screen-mail');
  const data = await api.get(`/api/mail/${threadId}`);
  if (!data.ok) { toast('Error loading thread', 'error'); return; }

  const { thread } = data;
  const msgs = thread.messages.map(m => {
    const isPlayer = m.from === 'player';
    const fromLabel = isPlayer ? 'You' : thread.contactLabel;
    const hasAuthored = m.body.includes('[AUTHORED]');

    return `
    <div class="message-block">
      <div class="message-from ${isPlayer ? 'player-msg' : ''}">
        <span class="sender">${escHtml(fromLabel)}</span>
        <span>${fmtTimestamp(m.timestamp)}</span>
      </div>
      ${hasAuthored ? `<div class="authored-label">AUTHORED FIXTURE</div>` : ''}
      <div class="message-body">${escHtml(m.body)}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="screen-title">Mail — Thread</div>
    <button class="back-btn" onclick="renderMail(); document.getElementById('topbar-title').textContent='Mail'">← Back to Inbox</button>
    <div class="detail-header">
      <h2>${escHtml(thread.contactLabel)}</h2>
      <div class="detail-meta">${thread.messages.length} messages</div>
    </div>
    ${msgs}
    <div class="composer" id="reply-composer">
      <div class="composer-header">Reply</div>
      <div class="composer-body-wrap" style="padding:14px 16px">
        <textarea class="composer-body" id="reply-body" placeholder="Write a reply..." rows="5" style="width:100%;min-height:100px">${escHtml(state.mailDraft.body || '')}</textarea>
      </div>
      <div class="composer-footer">
        <button class="btn btn-primary" onclick="sendReply('${thread.withContactId}', '${escHtml(thread.messages[0]?.subject || 'Re:')}')">Send →</button>
        <span style="font-size:12px;color:var(--text-mute);margin-left:8px">Draft auto-saves</span>
      </div>
    </div>
  `;

  const bodyEl = document.getElementById('reply-body');
  bodyEl.addEventListener('input', () => {
    state.mailDraft.body = bodyEl.value;
    saveDraft();
  });
}

function showCompose() {
  loadDraft();
  const el = document.getElementById('screen-mail');
  el.innerHTML = `
    <div class="screen-title">New Message</div>
    <button class="back-btn" onclick="renderMail()">← Back to Inbox</button>
    <div class="composer">
      <div class="composer-header">Compose</div>
      <div class="composer-field">
        <span class="composer-field-label">To</span>
        <select id="compose-to">
          <option value="">— select contact —</option>
          <option value="mack">Mack</option>
          <option value="eli">Eli</option>
          <option value="danny">Danny</option>
          <option value="nora">Nora</option>
          <option value="jules">Jules</option>
        </select>
      </div>
      <div class="composer-field">
        <span class="composer-field-label">Subject</span>
        <input type="text" id="compose-subject" placeholder="Subject" value="${escHtml(state.mailDraft.subject || '')}">
      </div>
      <textarea class="composer-body" id="compose-body" placeholder="Write your message...">${escHtml(state.mailDraft.body || '')}</textarea>
      <div class="composer-footer">
        <button class="btn btn-primary" onclick="sendComposedMail()">Send →</button>
        <span style="font-size:12px;color:var(--text-mute);margin-left:8px">Draft auto-saves</span>
      </div>
    </div>
  `;

  const toEl = document.getElementById('compose-to');
  const subEl = document.getElementById('compose-subject');
  const bodyEl = document.getElementById('compose-body');

  if (state.mailDraft.to) toEl.value = state.mailDraft.to;

  toEl.addEventListener('change', () => { state.mailDraft.to = toEl.value; saveDraft(); });
  subEl.addEventListener('input', () => { state.mailDraft.subject = subEl.value; saveDraft(); });
  bodyEl.addEventListener('input', () => { state.mailDraft.body = bodyEl.value; saveDraft(); });
}

async function sendComposedMail() {
  const to = document.getElementById('compose-to').value;
  const subject = document.getElementById('compose-subject').value;
  const body = document.getElementById('compose-body').value;

  if (!to || !subject.trim() || !body.trim()) {
    toast('Fill in all fields before sending.', 'error');
    return;
  }

  const btn = document.querySelector('#screen-mail .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const data = await api.post('/api/mail/send', { to, subject, body });
  btn.disabled = false;
  btn.textContent = 'Send →';

  if (!data.ok) {
    toast(data.error || 'Send failed.', 'error');
    return;
  }

  // Clear draft
  state.mailDraft = { to: '', subject: '', body: '' };
  saveDraft();

  toast(data.hired ? `${to} joined the crew!` : 'Message sent. Response received.', data.hired ? 'success' : 'info');

  // Show the thread with response
  const threads = await api.get('/api/mail');
  const thread = threads.threads?.find(t => t.withContactId === to);
  if (thread) showMailThread(thread.id);
  else renderMail();

  // Update mail badge
  updateMailBadge();
}

async function sendReply(contactId, originalSubject) {
  const body = document.getElementById('reply-body').value;
  if (!body.trim()) { toast('Write a message first.', 'error'); return; }

  const btn = document.querySelector('#reply-composer .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const data = await api.post('/api/mail/send', {
    to: contactId,
    subject: originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`,
    body,
  });

  btn.disabled = false;
  btn.textContent = 'Send →';

  if (!data.ok) { toast(data.error, 'error'); return; }

  state.mailDraft.body = '';
  saveDraft();

  toast(data.hired ? `${contactId} joined the crew!` : 'Sent.', data.hired ? 'success' : 'info');

  // Reload thread
  const threads = await api.get('/api/mail');
  const thread = threads.threads?.find(t => t.withContactId === contactId);
  if (thread) showMailThread(thread.id);

  updateMailBadge();
}

async function updateMailBadge() {
  const data = await api.get('/api/mail');
  const badge = document.getElementById('badge-mail');
  if (badge) {
    const unread = data.threads?.filter(t => t.unread).length || 0;
    badge.textContent = unread > 0 ? unread : '';
    badge.style.display = unread > 0 ? '' : 'none';
  }
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

async function renderContacts() {
  const el = document.getElementById('screen-contacts');
  el.innerHTML = `<div class="screen-title">Contacts</div><div id="contacts-list"></div>`;
  const list = document.getElementById('contacts-list');
  const data = await api.get('/api/contacts');
  if (!data.ok) { list.innerHTML = `<div class="empty-state">Error.</div>`; return; }

  list.innerHTML = data.contacts.map(c => `
    <div class="card" onclick="showContact('${c.id}')">
      <div class="card-row">
        <div style="flex:1">
          <div class="card-title">${escHtml(c.handle)}</div>
          <div class="card-meta">${c.knownRoles.map(r => `<span class="tag tag-role">${r}</span>`).join(' ')} ${c.referredBy ? `· via ${c.referredBy}` : ''}</div>
        </div>
        <div class="card-chevron">›</div>
      </div>
    </div>
  `).join('');
}

async function showContact(id) {
  const el = document.getElementById('screen-contacts');
  const data = await api.get(`/api/contacts/${id}`);
  if (!data.ok) { toast('Error', 'error'); return; }

  const c = data.contact;
  el.innerHTML = `
    <div class="screen-title">Contacts — Detail</div>
    <button class="back-btn" onclick="renderContacts()">← Back to Contacts</button>
    <div class="contact-profile">
      <div class="contact-handle">${escHtml(c.handle)}</div>
      <div class="contact-summary">${escHtml(c.reputationSummary)}</div>
      <div class="contact-tags">
        ${c.knownRoles.map(r => `<span class="tag tag-role">${r}</span>`).join('')}
        ${c.referredBy ? `<span class="tag tag-available">via ${c.referredBy}</span>` : ''}
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-mute);padding:8px 0;font-family:var(--mono)">
      [PLACEHOLDER: Contact photo — ${escHtml(c.handle)}.jpg]
    </div>
    <button class="btn btn-secondary" onclick="composeToContact('${c.id}', '${escHtml(c.handle)}')">✍ Send Message</button>
  `;
}

function composeToContact(id, handle) {
  state.mailDraft.to = id;
  state.mailDraft.subject = `Opportunity`;
  saveDraft();
  navigate('mail');
  setTimeout(showCompose, 50);
}

// ─── Files ────────────────────────────────────────────────────────────────────

async function renderFiles() {
  const el = document.getElementById('screen-files');
  el.innerHTML = `<div class="screen-title">Files</div><div id="files-list"></div>`;
  const list = document.getElementById('files-list');
  const data = await api.get('/api/files');
  if (!data.ok) { list.innerHTML = `<div class="empty-state">Error.</div>`; return; }

  if (!data.files.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div>No files received yet.</div>`;
    return;
  }

  list.innerHTML = data.files.map(f => `
    <div class="card" onclick="showFile('${f.id}')">
      <div class="card-row">
        <div style="flex:1">
          <div class="card-title">${escHtml(f.title)}</div>
          <div class="card-meta">Source: ${escHtml(f.source)}</div>
        </div>
        <div class="card-chevron">›</div>
      </div>
    </div>
  `).join('');
}

async function showFile(id) {
  const el = document.getElementById('screen-files');
  const data = await api.get(`/api/files/${id}`);
  if (!data.ok) { toast(data.error, 'error'); return; }

  const f = data.file;
  el.innerHTML = `
    <div class="screen-title">Files — Document</div>
    <button class="back-btn" onclick="renderFiles()">← Back to Files</button>
    <div class="detail-header">
      <h2>${escHtml(f.title)}</h2>
      <div class="detail-meta">Source: ${escHtml(f.source)}</div>
    </div>
    <div class="file-placeholder">[PLACEHOLDER: Scanned document image — ${escHtml(f.id)}.png]</div>
    <div class="file-content">${escHtml(f.content)}</div>
  `;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

let notesTimer = null;

async function renderNotes() {
  const el = document.getElementById('screen-notes');
  const data = await api.get('/api/notes');
  const notes = data.ok ? (data.notes || '') : '';

  el.innerHTML = `
    <div class="screen-title">Notes</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <span style="font-size:12px;color:var(--text-mute);font-family:var(--mono)" id="notes-status">Auto-saves on blur</span>
    </div>
    <textarea id="notes-textarea" placeholder="Write notes here. Auto-saves when you click away.">${escHtml(notes)}</textarea>
  `;

  const ta = document.getElementById('notes-textarea');
  ta.addEventListener('blur', saveNotes);
  ta.addEventListener('input', () => {
    document.getElementById('notes-status').textContent = 'Unsaved…';
    clearTimeout(notesTimer);
    notesTimer = setTimeout(saveNotes, 2000);
  });
}

async function saveNotes() {
  const ta = document.getElementById('notes-textarea');
  if (!ta) return;
  const status = document.getElementById('notes-status');
  if (status) status.textContent = 'Saving…';
  const data = await api.post('/api/notes', { notes: ta.value });
  if (status) status.textContent = data.ok ? 'Saved' : 'Error saving';
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

async function renderPlan() {
  const el = document.getElementById('screen-plan');
  el.innerHTML = `<div class="screen-title">Plan</div><div id="plan-body"></div>`;
  const body = document.getElementById('plan-body');

  const data = await api.get('/api/plan');
  if (!data.ok) { body.innerHTML = `<div class="empty-state">Error.</div>`; return; }

  const { currentPlan, availablePhases, crew } = data;

  const planVersion = currentPlan ? `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-bottom:16px">Current plan: <strong>v${currentPlan.version}</strong> — drafted ${fmtTimestamp(currentPlan.draftedAt)}</div>` : '';

  const crewOptions = crew.map(c => `<option value="${c.id}">${escHtml(c.handle)}</option>`).join('');

  const phaseRows = availablePhases.map((p, i) => {
    const planPhase = currentPlan?.phases.find(ph => ph.phaseId === p.id);
    const assignedIds = planPhase?.assignedCrew ?? p.defaultAssignedCrew;
    const notes = planPhase?.notes ?? '';
    const fallback = currentPlan?.fallbackOrders?.[p.id] ?? '';

    return `
    <div class="phase-planner">
      <div class="phase-planner-header">
        <span class="phase-num">${i + 1}</span>
        <strong>${escHtml(p.name)}</strong>
        <span style="font-size:12px;color:var(--text-mute);margin-left:4px">${p.durationMinutes}min</span>
      </div>
      <div class="phase-planner-body">
        <div class="form-group">
          <label class="form-label">Assigned Crew</label>
          <select class="form-select" id="phase-crew-${p.id}" multiple size="2">
            ${crewOptions}
          </select>
          ${crew.length === 0 ? '<div style="font-size:12px;color:var(--text-mute);margin-top:4px">No crew hired yet — recruit first.</div>' : ''}
        </div>
        <div class="form-group">
          <label class="form-label">Phase Notes</label>
          <textarea class="form-textarea" id="phase-notes-${p.id}" rows="2" placeholder="Notes for this phase...">${escHtml(notes)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Fallback Orders</label>
          <input class="form-input" id="phase-fallback-${p.id}" placeholder="Fallback instruction if phase fails..." value="${escHtml(fallback)}">
        </div>
      </div>
    </div>`;
  }).join('');

  body.innerHTML = `
    ${planVersion}
    ${phaseRows}
    <div style="margin-top:16px">
      <button class="btn btn-primary" onclick="submitPlan()">Submit Plan to Engine →</button>
    </div>
    <div id="plan-result" style="margin-top:14px"></div>
  `;

  // Pre-select assigned crew
  availablePhases.forEach(p => {
    const planPhase = currentPlan?.phases.find(ph => ph.phaseId === p.id);
    const assigned = planPhase?.assignedCrew ?? p.defaultAssignedCrew;
    const sel = document.getElementById(`phase-crew-${p.id}`);
    if (sel) {
      Array.from(sel.options).forEach(opt => {
        opt.selected = assigned.includes(opt.value);
      });
    }
  });
}

async function submitPlan() {
  const data = await api.get('/api/plan');
  if (!data.ok) return;

  const phases = data.availablePhases.map(p => {
    const sel = document.getElementById(`phase-crew-${p.id}`);
    const assignedCrew = sel ? Array.from(sel.selectedOptions).map(o => o.value) : [];
    const notes = document.getElementById(`phase-notes-${p.id}`)?.value ?? '';
    return { phaseId: p.id, assignedCrew, notes };
  });

  const fallbackOrders = {};
  data.availablePhases.forEach(p => {
    fallbackOrders[p.id] = document.getElementById(`phase-fallback-${p.id}`)?.value ?? '';
  });

  const result = await api.post('/api/plan/update', { phases, fallbackOrders });
  const resultEl = document.getElementById('plan-result');

  if (result.ok) {
    resultEl.innerHTML = `<div class="card" style="border-color:var(--green)"><div class="card-row"><span style="color:var(--green-br)">✓ Plan v${result.plan.version} accepted by engine.</span></div></div>`;
    toast('Plan submitted.', 'success');
  } else {
    resultEl.innerHTML = `<div class="card" style="border-color:var(--red-br)"><div class="card-row"><span style="color:var(--red-br)">✗ ${escHtml(result.error)}</span></div></div>`;
    toast(result.error, 'error');
  }
}

// ─── Crew ─────────────────────────────────────────────────────────────────────

async function renderCrew() {
  const el = document.getElementById('screen-crew');
  el.innerHTML = `<div class="screen-title">Crew</div><div id="crew-list"></div>`;
  const list = document.getElementById('crew-list');

  const crewData = await api.get('/api/crew');
  if (!crewData.ok) { list.innerHTML = `<div class="empty-state">Error.</div>`; return; }

  if (!crewData.crew.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div>No crew hired yet.<br><br>Send recruitment emails from Mail.</div>`;
    return;
  }

  list.innerHTML = crewData.crew.map(c => {
    const statusClass = c.status === 'available' ? 'tag-status-available' : c.status === 'on-task' ? 'tag-status-ontask' : 'tag-status-stressed';
    return `
    <div class="card" onclick="showCrewMember('${c.contactId}')">
      <div class="card-row">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="card-title">${escHtml(c.handle)}</div>
            <span class="tag ${statusClass}">${c.status}</span>
          </div>
          <div class="card-meta" style="margin-top:4px">
            ${c.roles.map(r => `<span class="tag tag-role">${r}</span>`).join(' ')}
            ${c.activeTasks.length ? ` · Task completes ${fmtTimestamp(c.activeTasks[0].completesAt)}` : ''}
          </div>
        </div>
        <div class="card-chevron">›</div>
      </div>
    </div>`;
  }).join('');
}

async function showCrewMember(crewId) {
  const el = document.getElementById('screen-crew');
  const crewData = await api.get('/api/crew');
  const member = crewData.crew?.find(c => c.contactId === crewId);
  if (!member) { toast('Not found', 'error'); return; }

  const tasksData = await api.get('/api/tasks');
  const availTasks = tasksData.tasks?.filter(t => t.status === 'available') ?? [];

  const statusClass = member.status === 'available' ? 'tag-status-available' : member.status === 'on-task' ? 'tag-status-ontask' : 'tag-status-stressed';

  el.innerHTML = `
    <div class="screen-title">Crew — ${escHtml(member.handle)}</div>
    <button class="back-btn" onclick="renderCrew()">← Back to Crew</button>
    <div class="contact-profile">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div class="contact-handle">${escHtml(member.handle)}</div>
        <span class="tag ${statusClass}">${member.status}</span>
      </div>
      <div class="contact-summary">${escHtml(member.reputationSummary)}</div>
      <div class="contact-tags">
        ${member.roles.map(r => `<span class="tag tag-role">${r}</span>`).join('')}
        <span class="tag tag-available">Rate: $${member.agreedRate}/day</span>
      </div>
    </div>

    <div class="divider"></div>

    <div style="font-family:var(--mono);font-size:11px;text-transform:uppercase;color:var(--text-dim);margin-bottom:10px">Assign Task</div>
    <div class="form-group">
      <select class="form-select" id="task-select-${crewId}">
        <option value="">— select task —</option>
        ${availTasks.map(t => `<option value="${t.id}">${escHtml(t.title)} (${t.durationDays}d${t.requiredRole ? ', req: ' + t.requiredRole : ''})</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-secondary" onclick="assignTask('${crewId}')">Assign →</button>

    <div class="divider"></div>

    <div style="font-family:var(--mono);font-size:11px;text-transform:uppercase;color:var(--text-dim);margin-bottom:10px">Query</div>
    <div class="query-box">
      <input class="form-input" id="crew-query-${crewId}" placeholder="Ask ${escHtml(member.handle)} a question…">
      <button class="btn btn-secondary" onclick="queryCrewMember('${crewId}')">Ask →</button>
    </div>
    <div id="crew-answer-${crewId}" style="margin-top:12px"></div>

    ${member.activeTasks.length ? `
    <div class="divider"></div>
    <div style="font-family:var(--mono);font-size:11px;text-transform:uppercase;color:var(--text-dim);margin-bottom:10px">Active Tasks</div>
    ${member.activeTasks.map(t => `
      <div class="card"><div class="card-row"><span class="tag tag-inprogress">In Progress</span><span style="margin-left:8px;font-size:13px">${escHtml(t.taskId)}</span><span style="margin-left:auto;font-size:12px;color:var(--text-dim)">Completes ${fmtTimestamp(t.completesAt)}</span></div></div>
    `).join('')}` : ''}
  `;

  document.getElementById(`crew-query-${crewId}`)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') queryCrewMember(crewId);
  });
}

async function assignTask(crewId) {
  const sel = document.getElementById(`task-select-${crewId}`);
  const taskId = sel?.value;
  if (!taskId) { toast('Select a task first.', 'warn'); return; }

  const data = await api.post('/api/tasks/assign', { taskId, crewId });
  if (data.ok) {
    toast(`Task assigned. Completes ${fmtTimestamp(data.scheduledTask.completesAt)}.`, 'success');
    showCrewMember(crewId);
  } else {
    toast(data.error, 'error');
  }
}

async function queryCrewMember(crewId) {
  const input = document.getElementById(`crew-query-${crewId}`);
  const q = input?.value?.trim();
  if (!q) return;

  const data = await api.get(`/api/crew/${crewId}/query?q=${encodeURIComponent(q)}`);
  const answerEl = document.getElementById(`crew-answer-${crewId}`);
  if (!answerEl) return;

  if (data.ok) {
    const hasAuthored = data.answer.includes('[AUTHORED]') || data.answer.includes('[MOCK]');
    answerEl.innerHTML = `
      <div class="message-block">
        <div class="message-from">
          <span class="sender">${escHtml(crewId)}</span>
          <span>${fmtTimestamp(Date.now())}</span>
        </div>
        ${hasAuthored ? `<div class="authored-label">AUTHORED FIXTURE</div>` : ''}
        <div class="message-body">${escHtml(data.answer)}</div>
      </div>`;
  } else {
    answerEl.innerHTML = `<div style="color:var(--red-br);font-size:13px;padding:8px 0">${escHtml(data.error)}</div>`;
  }
}

// ─── Operation ────────────────────────────────────────────────────────────────

async function renderOperation() {
  const el = document.getElementById('screen-operation');
  el.innerHTML = `<div class="screen-title">Operation</div><div id="op-body"></div>`;
  const body = document.getElementById('op-body');

  const data = await api.get('/api/operation/state');
  if (!data.ok) { body.innerHTML = `<div class="empty-state">Error.</div>`; return; }

  const { operation, aftermath, currentPhase } = data;

  if (operation.status === 'not_started' || operation.status === 'planning') {
    body.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-row">
          <div>
            <div class="card-title">Operation not started</div>
            <div class="card-meta">Draft a plan and hire crew first.</div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="startOperation()">Launch Operation →</button>
      <div id="op-start-error" style="margin-top:10px;color:var(--red-br);font-size:13px"></div>
    `;
    return;
  }

  if (operation.status === 'completed' || operation.status === 'aborted') {
    renderAftermath(body, operation, aftermath);
    return;
  }

  // In progress
  renderOperationActive(body, operation, currentPhase);
}

function renderOperationActive(body, operation, currentPhase) {
  const phases = ['phase_approach', 'phase_entry', 'phase_interior', 'phase_extraction'];
  const phaseNames = {
    phase_approach: 'Approach',
    phase_entry: 'Entry',
    phase_interior: 'Interior',
    phase_extraction: 'Extraction',
  };

  const phasePills = phases.map(pid => {
    const done = operation.completedPhases.includes(pid);
    const active = operation.currentPhaseId === pid;
    return `<div class="phase-pill ${done ? 'done' : active ? 'active' : ''}">${phaseNames[pid] || pid}</div>`;
  }).join('');

  const radioEntries = operation.radioLog.map(r => `
    <div class="radio-entry type-${r.type}">
      <span class="radio-ts">${fmtTimestamp(r.timestamp)}</span>
      <span class="radio-sender">${escHtml(r.fromCrewId)}</span>
      <span class="radio-msg">${escHtml(r.message)}</span>
    </div>
  `).join('') || `<div style="color:var(--text-mute);font-size:12px;padding:8px 0">No radio traffic yet.</div>`;

  body.innerHTML = `
    <div class="phase-status-bar">${phasePills}</div>

    ${currentPhase ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-row">
        <div>
          <div class="card-title">Current Phase: ${escHtml(currentPhase.name)}</div>
          ${currentPhase.abstractChallenge ? `<div class="card-meta">${escHtml(currentPhase.abstractChallenge)}</div>` : ''}
        </div>
      </div>
    </div>` : ''}

    <div class="radio-feed">
      <div class="radio-header">
        <div class="radio-pulse"></div>
        Radio Feed
      </div>
      <div class="radio-body" id="radio-body">${radioEntries}</div>
    </div>

    <div class="command-panel">
      <div class="command-panel-title">Command</div>
      <div class="command-buttons">
        <button class="btn btn-secondary btn-mono" onclick="issueCommand('ask_status', 'Status check?')">Ask Status</button>
        <button class="btn btn-secondary btn-mono" onclick="issueCommand('hold', 'Hold position.')">Hold</button>
        <button class="btn btn-primary btn-mono" onclick="issueCommand('continue', 'Continue.')">Continue →</button>
        <button class="btn btn-secondary btn-mono" onclick="issueCommand('regroup', 'Regroup.')">Regroup</button>
        <button class="btn btn-danger btn-mono" onclick="confirmAbort()">Abort</button>
      </div>
    </div>
    <div id="op-error" style="color:var(--red-br);font-size:13px;margin-top:6px"></div>
  `;
}

function renderAftermath(body, operation, aftermath) {
  const outcomeType = aftermath?.outcomeType ?? operation.status;
  const isCompleted = outcomeType === 'completed';

  const crewStatuses = aftermath?.crewStatus
    ? Object.entries(aftermath.crewStatus).map(([id, status]) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-weight:600;font-family:var(--mono);font-size:13px">${id}</span>
          <span class="tag ${status === 'ok' ? 'tag-status-available' : status === 'stressed' ? 'tag-status-stressed' : 'tag-status-stressed'}">${status}</span>
        </div>`).join('')
    : '';

  const radioEntries = operation.radioLog.map(r => `
    <div class="radio-entry type-${r.type}">
      <span class="radio-ts">${fmtTimestamp(r.timestamp)}</span>
      <span class="radio-sender">${escHtml(r.fromCrewId)}</span>
      <span class="radio-msg">${escHtml(r.message)}</span>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="aftermath-block">
      <div class="aftermath-outcome ${isCompleted ? 'completed' : 'aborted'}">
        ${isCompleted ? '✓ OPERATION COMPLETED' : '✗ OPERATION ABORTED'}
      </div>
      ${aftermath ? `
        <div style="font-size:14px;line-height:1.65;color:var(--text);margin-bottom:16px">${escHtml(aftermath.primaryConsequence)}</div>
        <div style="font-family:var(--mono);font-size:11px;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px">Crew Status</div>
        ${crewStatuses}
        <div style="margin-top:12px;font-family:var(--mono);font-size:12px;color:var(--text-dim)">
          Finances after: $${aftermath.financesAfter.toLocaleString()}
          ${aftermath.knowledgeLeaked ? ' · <span style="color:var(--red-br)">Knowledge leaked</span>' : ''}
        </div>
      ` : ''}
    </div>

    <div class="radio-feed">
      <div class="radio-header">Radio Log — Full</div>
      <div class="radio-body">${radioEntries || '<div style="color:var(--text-mute);font-size:12px">No radio entries.</div>'}</div>
    </div>
  `;
}

async function startOperation() {
  const data = await api.post('/api/operation/start', {});
  const errEl = document.getElementById('op-start-error');
  if (!data.ok) {
    if (errEl) errEl.textContent = data.error;
    toast(data.error, 'error');
    return;
  }
  toast('Operation launched.', 'success');
  renderOperation();
}

async function issueCommand(command, defaultText) {
  const data = await api.post('/api/operation/command', { command, playerText: defaultText });
  const errEl = document.getElementById('op-error');

  if (!data.ok) {
    if (errEl) errEl.textContent = data.error;
    toast(data.error, 'error');
    return;
  }

  // Append new radio entries
  const radioBody = document.getElementById('radio-body');
  if (radioBody && data.radioEntries?.length) {
    data.radioEntries.forEach(r => {
      const div = document.createElement('div');
      div.className = `radio-entry type-${r.type}`;
      div.innerHTML = `
        <span class="radio-ts">${fmtTimestamp(r.timestamp)}</span>
        <span class="radio-sender">${escHtml(r.fromCrewId)}</span>
        <span class="radio-msg">${escHtml(r.message)}</span>
      `;
      radioBody.appendChild(div);
      radioBody.scrollTop = radioBody.scrollHeight;
    });
  }

  // If operation ended, re-render
  if (data.operation.status === 'completed' || data.operation.status === 'aborted') {
    setTimeout(() => renderOperation(), 800);
  } else {
    // Update phase pills
    renderOperation();
  }
}

function confirmAbort() {
  if (confirm('Abort the operation? This cannot be undone.')) {
    issueCommand('abort', 'Abort now.');
  }
}

// ─── Dev Panel ────────────────────────────────────────────────────────────────

async function renderDev() {
  const el = document.getElementById('screen-dev');
  const clockData = await api.get('/api/dev/clock');
  const gameTime = clockData.ok ? clockData.gameTimeFormatted : 'unknown';

  el.innerHTML = `
    <div id="dev-panel">
      <div id="dev-panel-header">DEV CONTROLS — NOT GAME UI</div>
      <div class="dev-panel-body">
        <div class="dev-clock-display">Current game time: ${escHtml(gameTime)}</div>

        <div class="dev-row">
          <label>Advance clock by</label>
          <input type="number" class="dev-input" id="dev-hours" value="48" min="1" max="9999">
          <label>hours</label>
          <button class="btn btn-secondary btn-mono" onclick="devAdvanceClock()">Advance →</button>
        </div>
        <div id="dev-advance-result" style="font-family:var(--mono);font-size:12px;color:#8b8b30;margin-bottom:12px"></div>

        <div class="divider" style="border-color:#3a3a1a"></div>

        <div class="dev-row">
          <button class="btn btn-danger" onclick="devReset()">🗑 Reset Campaign</button>
          <span style="font-family:var(--mono);font-size:11px;color:#8b8b30">Destructive — clears all progress</span>
        </div>

        <div class="divider" style="border-color:#3a3a1a"></div>
        <div style="font-family:var(--mono);font-size:11px;color:#6b6b20;margin-top:4px">
          NL Adapter: Fixture-based only. Free-form NL input not supported.<br>
          Dialogue labeled [AUTHORED] or [MOCK] — not AI-generated in real time.<br>
          Engine rules are authoritative. Frontend never hardcodes outcomes.
        </div>
      </div>
    </div>
  `;
}

async function devAdvanceClock() {
  const hours = parseFloat(document.getElementById('dev-hours').value);
  if (!hours || hours <= 0) { toast('Enter a valid number of hours.', 'warn'); return; }

  const data = await api.post('/api/dev/advance-clock', { hours });
  const resultEl = document.getElementById('dev-advance-result');

  if (data.ok) {
    resultEl.textContent = `→ ${data.newTimeFormatted} | Tasks resolved: ${data.tasksResolved}`;
    toast(`Clock advanced ${hours}h. ${data.tasksResolved} task(s) completed.`, 'success');
    if (data.tasksResolved > 0) toast('Check Files — new attachments available.', 'info', 4000);
    renderDev();
  } else {
    toast(data.error, 'error');
  }
}

async function devReset() {
  if (!confirm('RESET CAMPAIGN: All progress will be deleted. Continue?')) return;
  const data = await api.post('/api/dev/reset', {});
  if (data.ok) {
    toast('Campaign reset.', 'success');
    navigate('mail');
  } else {
    toast(data.error, 'error');
  }
}

// ─── Clock display ────────────────────────────────────────────────────────────

async function updateClockDisplay() {
  const data = await api.get('/api/dev/clock');
  const el = document.getElementById('sidebar-clock');
  if (el && data.ok) {
    const d = new Date(data.gameTime);
    el.textContent = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtTimestamp(epochMs) {
  if (!epochMs) return '';
  const d = new Date(epochMs);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  loadDraft();

  // Nav click handlers
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.screen));
  });

  // Initial screen
  navigate('mail');

  // Clock update every 30s
  updateClockDisplay();
  setInterval(updateClockDisplay, 30000);

  // Mail badge refresh
  updateMailBadge();
  setInterval(updateMailBadge, 60000);
}

document.addEventListener('DOMContentLoaded', init);
