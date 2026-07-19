
const DB_KEYS = { subjects:'edupay_subjects', payments:'edupay_payments', receipts:'edupay_receipts', settings:'edupay_settings', activity:'edupay_activity' };
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];

function loadDB(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } }
function saveDB(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

let STATE = {
  subjects: loadDB(DB_KEYS.subjects, []),
  payments: loadDB(DB_KEYS.payments, []),
  receipts: loadDB(DB_KEYS.receipts, []),
  activity: loadDB(DB_KEYS.activity, []),
  settings: loadDB(DB_KEYS.settings, { studentName:'Student', nextSR:1, nextOR:1 })
};
function persist(part){
  if(part==='subjects') saveDB(DB_KEYS.subjects, STATE.subjects);
  if(part==='payments') saveDB(DB_KEYS.payments, STATE.payments);
  if(part==='receipts') saveDB(DB_KEYS.receipts, STATE.receipts);
  if(part==='activity') saveDB(DB_KEYS.activity, STATE.activity);
  if(part==='settings') saveDB(DB_KEYS.settings, STATE.settings);
}
function logActivity(text, icon){
  STATE.activity.unshift({ id:uid(), text, icon:icon||'⚡', ts:Date.now() });
  STATE.activity = STATE.activity.slice(0,30);
  persist('activity');
}

/* ---------- 2. UTILS ---------- */
function uid(){ return 'id_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function money(n){ return '৳'+Number(n||0).toLocaleString('en-IN'); }
function pad(n,len){ return String(n).padStart(len,'0'); }
function todayISO(){ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1,2)+'-'+pad(d.getDate(),2); }
function to12Hour(t){ // t = "HH:MM"
  if(!t) return '-';
  let [h,m] = t.split(':').map(Number);
  const ampm = h>=12 ? 'PM':'AM';
  h = h%12; if(h===0) h=12;
  return h+':'+pad(m,2)+' '+ampm;
}
function timeAgo(ts){
  const s = Math.floor((Date.now()-ts)/1000);
  if(s<60) return 'just now';
  if(s<3600) return Math.floor(s/60)+'m ago';
  if(s<86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}
function monthKey(m,y){ return y+'-'+pad(m,2); }
function monthLabel(m,y){ return MONTH_NAMES[m-1]+' '+y; }
function getMonthsBetween(startM,startY,endM,endY){
  const out=[];
  let m=startM, y=startY;
  let guard=0;
  while((y<endY || (y===endY && m<=endM)) && guard<600){
    out.push({m,y});
    m++; if(m>12){ m=1; y++; }
    guard++;
  }
  return out;
}
function ripple(e, el){
  const r = document.createElement('span'); r.className='ripple';
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.width = r.style.height = size+'px';
  r.style.left = (e.clientX - rect.left - size/2)+'px';
  r.style.top = (e.clientY - rect.top - size/2)+'px';
  el.appendChild(r);
  setTimeout(()=>r.remove(), 550);
}
document.addEventListener('click', function(e){
  const btn = e.target.closest('.btn, .icon-btn, .day-pill-btn, .tab-btn');
  if(btn){ btn.style.position = btn.style.position || 'relative'; btn.style.overflow='hidden'; ripple(e, btn); }
});

/* Toast */
function toast(msg, type, icon){
  type = type || 'info';
  const el = document.createElement('div');
  el.className = 'toast '+type;
  el.innerHTML = `<span class="toast-ic">${icon || (type==='success'?'✅':type==='error'?'⚠️':'ℹ️')}</span><span>${msg}</span>`;
  document.getElementById('toast-stack').appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),260); }, 3200);
}

/* ---------- 3. HEADER: CLOCK ---------- */
function tickClock(){
  const d = new Date();
  let h = d.getHours(); const m=d.getMinutes(), s=d.getSeconds();
  const ampm = h>=12?'PM':'AM'; h = h%12; if(h===0) h=12;
  document.getElementById('clockTime').textContent = `${h}:${pad(m,2)}:${pad(s,2)} ${ampm}`;
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const mons=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('clockDate').textContent = `${days[d.getDay()]}, ${d.getDate()} ${mons[d.getMonth()]} ${d.getFullYear()}`;
}
setInterval(tickClock,1000); tickClock();

/* Notification & profile dropdowns */
function toggleDropdown(id){
  const el = document.getElementById(id);
  document.querySelectorAll('.dropdown').forEach(dd=>{ if(dd.id!==id) dd.classList.remove('open'); });
  el.classList.toggle('open');
}
document.getElementById('btnNotif').addEventListener('click', e=>{ e.stopPropagation(); toggleDropdown('notifDropdown'); });
document.getElementById('btnProfile').addEventListener('click', e=>{ e.stopPropagation(); toggleDropdown('profileDropdown'); });
document.addEventListener('click', ()=>{ document.querySelectorAll('.dropdown').forEach(dd=>dd.classList.remove('open')); });

function renderNotifications(){
  const list = document.getElementById('notifList');
  const items = STATE.activity.slice(0,6);
  document.getElementById('notifDot').classList.toggle('show', items.length>0);
  if(!items.length){ list.innerHTML = '<div class="list-empty" style="padding:16px;">No notifications</div>'; return; }
  list.innerHTML = items.map(a=>`<div class="notif-item">${a.icon} ${a.text}<div class="notif-time">${timeAgo(a.ts)}</div></div>`).join('');
}

/* ---------- 4. NAVIGATION ---------- */
function goPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.toggle('active', n.dataset.page===page));
  closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
  if(page==='dashboard') renderDashboard();
  if(page==='subjects') renderSubjects();
  if(page==='payment') renderPaymentSubjectOptions();
  if(page==='status') renderStatus();
  if(page==='receipt') renderReceiptOptions();
}
document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.addEventListener('click', ()=>goPage(n.dataset.page)));

function openSidebar(){ document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarBackdrop').classList.add('show'); }
function closeSidebar(){ if(window.innerWidth<900){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarBackdrop').classList.remove('show'); } }
document.getElementById('btnHamburger').addEventListener('click', ()=>{
  document.getElementById('sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
});
document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);

/* Logout (just a friendly reset-view action, no real auth) */
function doLogout(){
  toast('Logged out. See you soon!','info','🚪');
  setTimeout(()=>goPage('dashboard'), 400);
}
document.getElementById('navLogout').addEventListener('click', doLogout);
document.getElementById('miLogout').addEventListener('click', doLogout);
document.getElementById('miAbout').addEventListener('click', ()=>goPage('about'));
document.getElementById('miEditName').addEventListener('click', ()=>{
  document.getElementById('studentNameInput').value = STATE.settings.studentName;
  openModal('nameModal');
});
document.getElementById('btnSaveName').addEventListener('click', ()=>{
  const v = document.getElementById('studentNameInput').value.trim();
  if(v){ STATE.settings.studentName = v; persist('settings'); applyProfile(); toast('Name updated','success'); }
  closeModal('nameModal');
});
function applyProfile(){
  const name = STATE.settings.studentName || 'Student';
  document.getElementById('profileNameTxt').textContent = name;
  document.getElementById('avatarInit').textContent = name.trim().charAt(0).toUpperCase() || 'S';
}

/* ---------- Modal helpers ---------- */
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', ()=>closeModal(el.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(ov=>ov.addEventListener('click', e=>{ if(e.target===ov) closeModal(ov.id); }));

let confirmCallback = null;
function askConfirm(title, msg, cb){
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  confirmCallback = cb;
  openModal('confirmModal');
}
document.getElementById('btnConfirmYes').addEventListener('click', ()=>{
  if(confirmCallback) confirmCallback();
  closeModal('confirmModal');
});

/* ==================================================================
   5. DASHBOARD
   ================================================================== */
function computeSubjectStats(subj){

    const now = new Date();

    const startDate = new Date(subj.startYear, subj.startMonth-1, 1);
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);

    let runningMonths = [];

    if(startDate <= currentDate){

        runningMonths = getMonthsBetween(
            subj.startMonth,
            subj.startYear,
            now.getMonth()+1,
            now.getFullYear()
        );

    }

    const paidSet = new Set();

    STATE.payments
        .filter(p=>p.subjectId===subj.id)
        .forEach(p=>{
            p.months.forEach(m=>{
                paidSet.add(monthKey(m.m,m.y));
            });
        });

    const dueMonths = runningMonths.filter(m=>{
        return !paidSet.has(monthKey(m.m,m.y));
    });

    const paidCount = runningMonths.filter(m =>
    paidSet.has(monthKey(m.m,m.y))
).length;

    const totalPaid = paidCount * Number(subj.salary);
    const totalDue = dueMonths.length * Number(subj.salary);

    let status="No Running Month";

    if(runningMonths.length){

        if(dueMonths.length===0)
            status="Paid";

        else if(paidCount===0)
            status="Due";

        else
            status="Partial";
    }

    return{

        running:runningMonths,

        dueMonths,

        paidCount,

        totalPaid,

        totalDue,

        status,

        current:runningMonths.length
            ? runningMonths[runningMonths.length-1]
            : {m:subj.startMonth,y:subj.startYear}

    };

}

function renderDashboard(){
  const subs = STATE.subjects;
  document.getElementById('statSubjects').textContent = subs.filter(s=>s.status==='Active').length;
  let overallPaid=0, overallDue=0;
  const subjBarsData=[];
  subs.forEach(s=>{
    const st = computeSubjectStats(s);
    overallPaid += st.totalPaid; overallDue += st.totalDue;
    subjBarsData.push({name:s.name, paid:st.totalPaid, total:st.totalPaid+st.totalDue});
  });
  const overallTotal = overallPaid+overallDue;
  document.getElementById('statOverall').textContent = money(overallTotal);
  document.getElementById('statDue').textContent = money(overallDue);
  document.getElementById('statPaid').textContent = money(overallPaid);
  document.getElementById('dashSubtitle').textContent = subs.length ? `You have ${subs.length} subject(s) tracked.` : `Add your first subject to get started.`;

  // progress ring
  const pct = overallTotal>0 ? Math.round((overallPaid/overallTotal)*100) : 0;
  const ring = document.getElementById('progressRing');
  ring.style.background = `conic-gradient(#f2b705 ${pct*3.6}deg, rgba(255,255,255,0.07) 0deg)`;
  document.getElementById('progressVal').textContent = pct+'%';

  // subject bars
  const barsEl = document.getElementById('subjectBars');
  if(!subjBarsData.length){ barsEl.innerHTML = '<div class="list-empty"><span class="em-ic">📭</span>No subjects yet</div>'; }
  else{
    barsEl.innerHTML = subjBarsData.map(b=>{
      const p = b.total>0 ? Math.round((b.paid/b.total)*100) : 0;
      return `<div class="bar-row"><div class="bar-row-top"><span>${escapeHtml(b.name)}</span><span>${p}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${p}%"></div></div></div>`;
    }).join('');
  }

  // monthly collection - last 6 months
  const now = new Date();
  const months6 = [];
  for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i, 1); months6.push({m:d.getMonth()+1,y:d.getFullYear()}); }
  const sums = months6.map(mm=>{
    let sum=0;
    STATE.payments.forEach(p=>{ if(p.date && p.date.slice(0,7)===`${mm.y}-${pad(mm.m,2)}`) sum+=Number(p.amount); });
    return sum;
  });
  const maxSum = Math.max(...sums, 1);
  document.getElementById('monthChart').innerHTML = months6.map((mm,i)=>{
    const h = Math.max(4, Math.round((sums[i]/maxSum)*100));
    return `<div class="month-col"><div class="month-bar" style="height:${h}%" title="${money(sums[i])}"></div><div class="month-lbl">${MONTH_NAMES[mm.m-1].slice(0,3)}</div></div>`;
  }).join('');

  // recent payments
  const recents = [...STATE.payments].sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);
  document.getElementById('recentPayments').innerHTML = recents.length ? recents.map(p=>{
    const s = subs.find(x=>x.id===p.subjectId);
    return `<div class="row-item"><div class="row-item-l"><div class="row-ic" style="background:var(--teal-soft); color:var(--teal);">💳</div><div><div class="truncate" style="font-weight:600;">${escapeHtml(s?s.name:'Subject')}</div><div style="color:var(--text-faint); font-size:.7rem;">${p.date}</div></div></div><div style="font-weight:700;">${money(p.amount)}</div></div>`;
  }).join('') : '<div class="list-empty"><span class="em-ic">💤</span>No payments yet</div>';

  // recent activity
  document.getElementById('recentActivity').innerHTML = STATE.activity.length ? STATE.activity.slice(0,6).map(a=>
    `<div class="row-item"><div class="row-item-l"><div class="row-ic" style="background:var(--gold-soft); color:var(--gold);">${a.icon}</div><div class="truncate">${escapeHtml(a.text)}</div></div><div style="color:var(--text-faint); font-size:.7rem;">${timeAgo(a.ts)}</div></div>`
  ).join('') : '<div class="list-empty"><span class="em-ic">🗒️</span>No activity yet</div>';

  // upcoming due
  const dueList = subs.map(s=>({s, st:computeSubjectStats(s)})).filter(x=>x.st.dueMonths.length>0);
  document.getElementById('upcomingDue').innerHTML = dueList.length ? dueList.slice(0,6).map(x=>
    `<div class="row-item"><div class="row-item-l"><div class="row-ic" style="background:var(--coral-soft); color:var(--coral);">⏳</div><div><div class="truncate" style="font-weight:600;">${escapeHtml(x.s.name)}</div><div style="color:var(--text-faint); font-size:.7rem;">${x.st.dueMonths.length} month(s) due</div></div></div><div style="font-weight:700; color:var(--coral);">${money(x.st.totalDue)}</div></div>`
  ).join('') : '<div class="list-empty"><span class="em-ic">🎉</span>All caught up</div>';

  renderNotifications();
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

document.querySelector('[data-action="quick-add-subject"]').addEventListener('click', ()=>{ goPage('subjects'); openSubjectModal(); });
document.querySelector('[data-action="quick-pay"]').addEventListener('click', ()=> goPage('payment'));
document.querySelector('[data-action="quick-receipt"]').addEventListener('click', ()=> goPage('receipt'));

/* ==================================================================
   6. SUBJECTS
   ================================================================== */
function populateDayCheckboxes(selected){
  selected = selected || [];
  document.getElementById('dayCheckboxes').innerHTML = DAY_NAMES.map(d=>`
    <label class="check-pill ${selected.includes(d)?'checked':''}" data-day="${d}">
      <input type="checkbox" value="${d}" ${selected.includes(d)?'checked':''}>
      <span>${d.slice(0,3)}</span>
    </label>`).join('');
  document.querySelectorAll('#dayCheckboxes .check-pill').forEach(p=>{
    p.addEventListener('click', e=>{
      e.preventDefault();
      const cb = p.querySelector('input');
      cb.checked = !cb.checked;
      p.classList.toggle('checked', cb.checked);
    });
  });
}
function populateMonthYearSelects(sm, sy){

    const ms = document.getElementById("subjStartMonth");
    const ys = document.getElementById("subjStartYear");

    ms.innerHTML = MONTH_NAMES.map((m,i)=>
        `<option value="${i+1}">${m}</option>`
    ).join("");

    let opts = "";

    const startYear = 2024;
    const endYear = new Date().getFullYear()+10;

    for(let y=startYear; y<=endYear; y++){
        opts += `<option value="${y}">${y}</option>`;
    }

    ys.innerHTML = opts;

    if(sm) ms.value = sm;
    if(sy) ys.value = sy;

}
document.getElementById('btnAutoGenDate').addEventListener('click', ()=>{
  const now = new Date();
  document.getElementById('subjStartMonth').value = now.getMonth()+1;
  document.getElementById('subjStartYear').value = now.getFullYear();
  toast('Set to current month & year','info','⚡');
});

function openSubjectModal(subj){
  document.getElementById('subjectModalTitle').textContent = subj ? 'Edit Subject' : 'Add Subject';
  document.getElementById('subjEditId').value = subj ? subj.id : '';
  document.getElementById('subjName').value = subj ? subj.name : '';
  document.getElementById('subjTeacher').value = subj ? subj.teacher : '';
  document.getElementById('subjSalary').value = subj ? subj.salary : '';
  document.getElementById('subjStart').value = subj ? subj.startTime : '';
  document.getElementById('subjEnd').value = subj ? subj.endTime : '';
  document.getElementById('subjStatus').value = subj ? subj.status : 'Active';
  populateDayCheckboxes(subj ? subj.days : []);
  populateMonthYearSelects(subj ? subj.startMonth : null, subj ? subj.startYear : null);
  openModal('subjectModal');
}
document.getElementById('btnAddSubject').addEventListener('click', ()=>openSubjectModal());

document.getElementById('btnSaveSubject').addEventListener('click', ()=>{
  const name = document.getElementById('subjName').value.trim();
  const teacher = document.getElementById('subjTeacher').value.trim();
  const salary = Number(document.getElementById('subjSalary').value);
  const start = document.getElementById('subjStart').value;
  const end = document.getElementById('subjEnd').value;
  const days = [...document.querySelectorAll('#dayCheckboxes input:checked')].map(i=>i.value);
  const startMonth = Number(document.getElementById('subjStartMonth').value);
  const startYear = Number(document.getElementById('subjStartYear').value);
  const status = document.getElementById('subjStatus').value;
  const editId = document.getElementById('subjEditId').value;

  if(!name){ toast('Subject name is required','error'); return; }
  if(!teacher){ toast('Teacher name is required','error'); return; }
  if(!salary || salary<=0){ toast('Enter a valid monthly salary','error'); return; }
  if(!days.length){ toast('Select at least one day','error'); return; }
  if(!start || !end){ toast('Select start and end time','error'); return; }
  if(end <= start){ toast('End time must be after start time','error'); return; }

  if(editId){
    const s = STATE.subjects.find(x=>x.id===editId);
    Object.assign(s, {name,teacher,salary,startTime:start,endTime:end,days,startMonth,startYear,status});
    logActivity(`Updated subject "${name}"`, '✏️');
    toast('Subject updated','success');
  } else {
    STATE.subjects.push({ id:uid(), name, teacher, salary, startTime:start, endTime:end, days, startMonth, startYear, status });
    logActivity(`Added subject "${name}"`, '➕');
    toast('Subject added','success');
  }
  persist('subjects');
  closeModal('subjectModal');
  renderSubjects(); renderDashboard();
});

function renderSubjects(){
  const search = (document.getElementById('subjSearch').value||'').toLowerCase();
  const filterStatus = document.getElementById('subjFilterStatus').value;
  const list = STATE.subjects.filter(s=>{
    const matchSearch = !search || s.name.toLowerCase().includes(search) || s.teacher.toLowerCase().includes(search);
    const matchStatus = !filterStatus || s.status===filterStatus;
    return matchSearch && matchStatus;
  });
  const el = document.getElementById('subjectList');
  if(!list.length){
    el.innerHTML = `<div class="glass card empty-state" style="grid-column:1/-1;"><div class="empty-ic">📚</div><div class="empty-title">No subjects found</div><div class="empty-sub">Add a subject to start tracking payments.</div><button class="btn btn-gold" onclick="openSubjectModal()">➕ Add Subject</button></div>`;
    return;
  }
  el.innerHTML = list.map(s=>{
    const st = computeSubjectStats(s);
    const dueLabel = st.dueMonths.length ? st.dueMonths.map(d=>monthLabel(d.m,d.y).slice(0,3)+' '+d.y).slice(0,3).join(', ') : 'None';
    return `
    <div class="glass card subject-card">
      <div class="subj-head">
        <div><div class="subj-name">${escapeHtml(s.name)}</div><div class="subj-teacher">👤 ${escapeHtml(s.teacher)}</div></div>
        <span class="chip ${s.status==='Active'?'chip-green':'chip-gray'}">${s.status}</span>
      </div>
      <div class="subj-meta">
        <div><span>Salary</span>${money(s.salary)}/mo</div>
        <div><span>Time</span>${to12Hour(s.startTime)} - ${to12Hour(s.endTime)}</div>
        <div><span>Started</span>${monthLabel(s.startMonth,s.startYear)}</div>
        <div><span>Current Month</span>${monthLabel(st.current.m,st.current.y)}</div>
        <div style="grid-column:1/-1;"><span>Paid Month(s)</span>${st.paidCount}</div>
        <div style="grid-column:1/-1;"><span>Due Month(s)</span>${st.dueMonths.length} ${st.dueMonths.length?'('+dueLabel+(st.dueMonths.length>3?'…':'')+')':''}</div>
      </div>
      <div class="days-row">${s.days.map(d=>`<span class="day-pill">${d.slice(0,3)}</span>`).join('')}</div>
      <div class="subj-actions">
        <button class="btn btn-sm" data-edit="${s.id}">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" data-del="${s.id}">🗑️ Delete</button>
        <button class="btn btn-sm btn-gold" data-pay="${s.id}">💳 Pay</button>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click', ()=>{
    const s = STATE.subjects.find(x=>x.id===b.dataset.edit); openSubjectModal(s);
  }));
  el.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>{
    const s = STATE.subjects.find(x=>x.id===b.dataset.del);
    askConfirm('Delete subject?', `This will permanently delete "${s.name}" and its payment history.`, ()=>{
      STATE.subjects = STATE.subjects.filter(x=>x.id!==s.id);
      STATE.payments = STATE.payments.filter(x=>x.subjectId!==s.id);
      persist('subjects'); persist('payments');
      logActivity(`Deleted subject "${s.name}"`, '🗑️');
      toast('Subject deleted','success');
      renderSubjects(); renderDashboard();
    });
  }));
  el.querySelectorAll('[data-pay]').forEach(b=>b.addEventListener('click', ()=>{
    goPage('payment');
    document.getElementById('paySubjectSelect').value = b.dataset.pay;
    document.getElementById('paySubjectSelect').dispatchEvent(new Event('change'));
  }));
}
document.getElementById('subjSearch').addEventListener('input', renderSubjects);
document.getElementById('subjFilterStatus').addEventListener('change', renderSubjects);

/* ==================================================================
   7. PAYMENT
   ================================================================== */
function renderPaymentSubjectOptions(){
  const sel = document.getElementById('paySubjectSelect');
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- choose subject --</option>' + STATE.subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)} — ${escapeHtml(s.teacher)}</option>`).join('');
  if(cur) sel.value = cur;
  document.getElementById('payDate').value = todayISO();
}
let selectedPayMonths = [];
document.getElementById('paySubjectSelect').addEventListener('change', function(){
  const id = this.value;
  const wrap = document.getElementById('payDetails');
  if(!id){ wrap.style.display='none'; return; }
  const s = STATE.subjects.find(x=>x.id===id);
  const st = computeSubjectStats(s);
  wrap.style.display='block';
  document.getElementById('payTeacher').textContent = s.teacher;
  document.getElementById('paySalary').textContent = money(s.salary);
  document.getElementById('payPaidCount').textContent = st.paidCount;
  document.getElementById('payDueCount').textContent = st.dueMonths.length;
  document.getElementById('payCurrentMonth').textContent = monthLabel(st.current.m, st.current.y);
  selectedPayMonths = [];
  const listEl = document.getElementById('payMonthList');

if(st.dueMonths.length === 0){

    listEl.innerHTML = `
    <div class="glass card" style="
        text-align:center;
        border:1px solid rgba(34,197,94,.35);
        background:rgba(34,197,94,.08);
    ">
        <div style="font-size:40px;">✅</div>

        <h3 style="margin:10px 0 6px;color:#22c55e;">
            Payment Up To Date
        </h3>

        <p style="color:#9ca3af;">
            All running months have been paid.
            <br>
            No dues remaining.
        </p>
    </div>`;

}else{

listEl.innerHTML = st.dueMonths.map(d=>{

    const key = monthKey(d.m,d.y);

    return `
    <div class="month-check-item"
         data-key="${key}"
         data-m="${d.m}"
         data-y="${d.y}">

        <span>${monthLabel(d.m,d.y)}</span>

        <input type="checkbox">

    </div>`;

}).join("");

listEl.querySelectorAll(".month-check-item").forEach(item => {

    item.addEventListener("click", () => {

        const key = item.dataset.key;

        const idx = selectedPayMonths.findIndex(x => x.key === key);

        const cb = item.querySelector("input");

        if (idx > -1) {

            selectedPayMonths.splice(idx, 1);

            cb.checked = false;

            item.classList.remove("checked");

        } else {

            selectedPayMonths.push({
                key,
                m: Number(item.dataset.m),
                y: Number(item.dataset.y)
            });

            cb.checked = true;

            item.classList.add("checked");

        }

        document.getElementById("payAmount").textContent =
            money(selectedPayMonths.length * s.salary);

    });

});

}

document.getElementById("payAmount").textContent = money(0);
})
document.getElementById("btnConfirmPay").addEventListener("click", () => {

    const id = document.getElementById("paySubjectSelect").value;

    const s = STATE.subjects.find(x => x.id === id);

    if (!s) {
        toast("Select a subject first", "error");
        return;
    }

    if (selectedPayMonths.length === 0) {
        toast("Select at least one unpaid month.", "error");
        return;
    }

    const date = document.getElementById("payDate").value || todayISO();
    const method = document.getElementById("payMethod").value;
    const notes = document.getElementById("payNotes").value.trim();

    // Already paid months
    const alreadyPaid = new Set(
        STATE.payments
            .filter(p => p.subjectId === s.id)
            .flatMap(p => p.months.map(m => monthKey(m.m, m.y)))
    );

    // Remove duplicate months
    const clean = selectedPayMonths.filter(
        m => !alreadyPaid.has(monthKey(m.m, m.y))
    );

    if (clean.length === 0) {
        toast("These months are already paid.", "error");
        return;
    }

    const amount = clean.length * Number(s.salary);

    const payment = {
        id: uid(),
        subjectId: s.id,
        months: clean.map(m => ({
            m: m.m,
            y: m.y
        })),
        amount,
        date,
        method,
        notes,
        createdAt: Date.now()
    };

    STATE.payments.push(payment);
    persist("payments");

    logActivity(`Paid ${money(amount)} for "${s.name}"`, "💳");

    // Auto receipt
    const rec = buildSubjectReceipt(s, payment);
    STATE.receipts.unshift(rec);
    persist("receipts");

    logActivity(`Receipt ${rec.receiptNo} generated`, "🧾");

    toast("Payment successful!", "success", "✅");

    // Reset UI
    selectedPayMonths = [];
    document.getElementById("payNotes").value = "";
    document.getElementById("payAmount").textContent = money(0);

    // Refresh all pages
    document.getElementById("paySubjectSelect")
        .dispatchEvent(new Event("change"));

    renderDashboard();
    renderSubjects();
    renderStatus();
    renderReceiptOptions();
});

/* ==================================================================
   8. STATUS
   ================================================================== */
let statusSort = {key:'name', dir:1};
function renderStatus(){
  const search = (document.getElementById('statusSearch').value||'').toLowerCase();
  const filter = document.getElementById('statusFilter').value;
  let rows = STATE.subjects.map(s=>{
    const st = computeSubjectStats(s);
    return { id:s.id, name:s.name, teacher:s.teacher, salary:s.salary, paid:st.totalPaid, due:st.totalDue, current:monthLabel(st.current.m,st.current.y), status:st.status };
  });
  rows = rows.filter(r=>{
    const matchSearch = !search || r.name.toLowerCase().includes(search) || r.teacher.toLowerCase().includes(search);
    const matchFilter = !filter || r.status===filter;
    return matchSearch && matchFilter;
  });
  rows.sort((a,b)=>{
    const k = statusSort.key;
    if(typeof a[k]==='number') return (a[k]-b[k])*statusSort.dir;
    return String(a[k]).localeCompare(String(b[k]))*statusSort.dir;
  });
  const totalPaid = rows.reduce((a,r)=>a+r.paid,0);
  const totalDue = rows.reduce((a,r)=>a+r.due,0);
  document.getElementById('statusTotalPaid').textContent = money(totalPaid);
  document.getElementById('statusTotalDue').textContent = money(totalDue);

  const body = document.getElementById('statusBody');
  if(!rows.length){ body.innerHTML = `<tr><td colspan="7"><div class="list-empty"><span class="em-ic">📭</span>No records found</div></td></tr>`; return; }
  const chipClass = {Paid:'chip-green', Partial:'chip-orange', Due:'chip-red'};
  body.innerHTML = rows.map(r=>`
    <tr>
      <td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.teacher)}</td><td>${money(r.salary)}</td>
      <td style="color:var(--teal); font-weight:600;">${money(r.paid)}</td>
      <td style="color:var(--coral); font-weight:600;">${money(r.due)}</td>
      <td>${r.current}</td>
      <td><span class="chip ${chipClass[r.status]}">${r.status}</span></td>
    </tr>`).join('');
}
document.getElementById('statusSearch').addEventListener('input', renderStatus);
document.getElementById('statusFilter').addEventListener('change', renderStatus);
document.querySelectorAll('#statusTable th[data-sort]').forEach(th=>th.addEventListener('click', ()=>{
  const key = th.dataset.sort;
  statusSort.dir = (statusSort.key===key) ? -statusSort.dir : 1;
  statusSort.key = key;
  renderStatus();
}));

/* ==================================================================
   9. RECEIPT + PDF
   ================================================================== */
document.querySelectorAll('.tab-btn[data-rtab]').forEach(t=>t.addEventListener('click', ()=>{
  document.querySelectorAll('.tab-btn[data-rtab]').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  ['subject','overall','history'].forEach(k=>document.getElementById('rtab-'+k).style.display = (k===t.dataset.rtab)?'block':'none');
  document.getElementById('receiptPreviewWrap').style.display='none';
  if(t.dataset.rtab==='history') renderReceiptHistory();
}));

function renderReceiptOptions(){
  const sSel = document.getElementById('rcSubjectSelect');
  sSel.innerHTML = '<option value="">-- choose subject --</option>' + STATE.subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  document.getElementById('rcPaymentSelect').innerHTML = '<option value="">-- choose payment --</option>';
  renderReceiptHistory();
}
document.getElementById('rcSubjectSelect').addEventListener('change', function(){
  const pSel = document.getElementById('rcPaymentSelect');
  const pays = STATE.payments.filter(p=>p.subjectId===this.value).sort((a,b)=>b.createdAt-a.createdAt);
  pSel.innerHTML = '<option value="">-- choose payment --</option>' + pays.map(p=>`<option value="${p.id}">${p.date} — ${money(p.amount)} (${p.months.map(m=>monthLabel(m.m,m.y)).join(', ')})</option>`).join('');
});

function nextReceiptNo(type){
  if(type==='subject'){ const n = STATE.settings.nextSR++; persist('settings'); return 'EDUPY-SR-'+pad(n,6); }
  const n = STATE.settings.nextOR++; persist('settings'); return 'EDUPY-OR-'+pad(n,6);
}
function buildSubjectReceipt(subj, payment){
  return {
    id:uid(), type:'subject', receiptNo: nextReceiptNo('subject'),
    subjectId:subj.id, subjectName:subj.name, teacher:subj.teacher,
    date:payment.date, months:payment.months, amount:payment.amount,
    method:payment.method, notes:payment.notes||'', createdAt:Date.now()
  };
}
document.getElementById('btnGenSubjectReceipt').addEventListener('click', ()=>{
  const sid = document.getElementById('rcSubjectSelect').value;
  const pid = document.getElementById('rcPaymentSelect').value;
  if(!sid || !pid){ toast('Select subject and payment record','error'); return; }
  const s = STATE.subjects.find(x=>x.id===sid);
  const p = STATE.payments.find(x=>x.id===pid);
  const rec = buildSubjectReceipt(s,p);
  STATE.receipts.unshift(rec); persist('receipts');
  logActivity(`Receipt ${rec.receiptNo} generated`,'🧾');
  toast('Receipt generated','success','🧾');
  showReceiptPreview(rec);
});
document.getElementById('btnGenOverallReceipt').addEventListener('click', ()=>{
  if(!STATE.subjects.length){ toast('Add subjects first','error'); return; }
  let totalPaid=0, totalDue=0;
  const rows = STATE.subjects.map(s=>{ const st=computeSubjectStats(s); totalPaid+=st.totalPaid; totalDue+=st.totalDue; return {name:s.name, teacher:s.teacher, paid:st.totalPaid, due:st.totalDue}; });
  const rec = { id:uid(), type:'overall', receiptNo: nextReceiptNo('overall'), date:todayISO(), rows, totalPaid, totalDue, createdAt:Date.now() };
  STATE.receipts.unshift(rec); persist('receipts');
  logActivity(`Overall receipt ${rec.receiptNo} generated`,'🧾');
  toast('Overall receipt generated','success','🧾');
  showReceiptPreview(rec);
});

function renderReceiptHistory(){
  const el = document.getElementById('receiptHistory');
  if(!STATE.receipts.length){ el.innerHTML = `<div class="glass card empty-state" style="grid-column:1/-1;"><div class="empty-ic">🧾</div><div class="empty-title">No receipts yet</div><div class="empty-sub">Generate your first receipt from Payment or Receipt page.</div></div>`; return; }
  el.innerHTML = STATE.receipts.map(r=>`
    <div class="glass card" style="cursor:pointer;" data-rid="${r.id}">
      <div class="stat-label">${r.type==='subject'?'Subject Receipt':'Overall Receipt'}</div>
      <div style="font-family:var(--font-m); font-weight:700; margin:6px 0;">${r.receiptNo}</div>
      <div style="font-size:.78rem; color:var(--text-dim);">${r.date}${r.subjectName?' • '+escapeHtml(r.subjectName):''}</div>
      <div style="font-weight:700; margin-top:6px;">${money(r.amount!==undefined ? r.amount : r.totalPaid)}</div>
    </div>`).join('');
  el.querySelectorAll('[data-rid]').forEach(c=>c.addEventListener('click', ()=>{
    const r = STATE.receipts.find(x=>x.id===c.dataset.rid);
    showReceiptPreview(r);
  }));
}

let currentReceipt = null;
function showReceiptPreview(rec){
  currentReceipt = rec;
  const wrap = document.getElementById('receiptPreviewWrap');
  wrap.style.display='block';
  const name = STATE.settings.studentName || 'Student';
  const now = new Date();
  if(rec.type==='subject'){
    document.getElementById('receiptPreview').innerHTML = `
      <div class="rc-head"><div class="rc-logo">EduPay Pico<small>Smart Coaching Payment Manager</small></div>
        <div class="rc-num">${rec.receiptNo}<br>${rec.date}</div></div>
      <div class="rc-grid">
        <div><span>Student</span>${escapeHtml(name)}</div>
        <div><span>Time</span>${now.toLocaleTimeString()}</div>
        <div><span>Subject</span>${escapeHtml(rec.subjectName)}</div>
        <div><span>Teacher</span>${escapeHtml(rec.teacher)}</div>
      </div>
      <table class="rc-table"><thead><tr><th>Month(s) Paid</th><th>Method</th><th>Amount</th></tr></thead>
        <tbody><tr><td>${rec.months.map(m=>monthLabel(m.m,m.y)).join(', ')}</td><td>${rec.method}</td><td>${money(rec.amount)}</td></tr>
        <tr class="rc-total-row"><td colspan="2">Total</td><td>${money(rec.amount)}</td></tr></tbody></table>
      ${rec.notes?`<div style="font-size:.78rem; margin-bottom:12px;"><b>Notes:</b> ${escapeHtml(rec.notes)}</div>`:''}
      <div class="rc-foot">Generated automatically by EduPay Pico</div>`;
  } else {
    document.getElementById('receiptPreview').innerHTML = `
      <div class="rc-head"><div class="rc-logo">EduPay Pico<small>Smart Coaching Payment Manager</small></div>
        <div class="rc-num">${rec.receiptNo}<br>${rec.date}</div></div>
      <div class="rc-grid"><div><span>Student</span>${escapeHtml(name)}</div><div><span>Time</span>${now.toLocaleTimeString()}</div></div>
      <table class="rc-table"><thead><tr><th>Subject</th><th>Teacher</th><th>Paid</th><th>Due</th></tr></thead>
        <tbody>${rec.rows.map(r=>`<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.teacher)}</td><td>${money(r.paid)}</td><td>${money(r.due)}</td></tr>`).join('')}
        <tr class="rc-total-row"><td colspan="2">Total</td><td>${money(rec.totalPaid)}</td><td>${money(rec.totalDue)}</td></tr></tbody></table>
      <div class="rc-foot">Generated automatically by EduPay Pico</div>`;
  }
  wrap.scrollIntoView({behavior:'smooth', block:'nearest'});
}

document.getElementById('btnPrintReceipt').addEventListener('click', ()=>{
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>${currentReceipt.receiptNo}</title><style>
    body{font-family:Arial,sans-serif; padding:30px; color:#20180a;}
    table{width:100%; border-collapse:collapse; margin:14px 0;} th,td{border:1px solid #e4d7ad; padding:8px; text-align:left; font-size:13px;}
    th{background:#f7edcc;} .h{display:flex; justify-content:space-between; border-bottom:2px dashed #e4d7ad; padding-bottom:10px; margin-bottom:10px;}
  </style></head><body>${document.getElementById('receiptPreview').innerHTML}</body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),300);
});

document.getElementById('btnDownloadPdf').addEventListener('click', ()=>{
  if(!currentReceipt) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const rec = currentReceipt;
  const name = STATE.settings.studentName || 'Student';
  let y = 60;
  doc.setFillColor(242,183,5); doc.rect(0,0,595,8,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(30,25,10);
  doc.text('EduPay Pico', 40, y);
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(120,105,60);
  doc.text('Smart Coaching Payment Manager', 40, y+14);
  doc.setFontSize(10); doc.setTextColor(60,50,20);
  doc.text(rec.receiptNo, 555, y-6, {align:'right'});
  doc.text(rec.date, 555, y+10, {align:'right'});
  y += 40;
  doc.setDrawColor(228,215,173); doc.setLineWidth(1); doc.line(40,y,555,y);
  y += 26;
  doc.setFontSize(10); doc.setTextColor(30,25,10);
  doc.text('Student: '+name, 40, y);
  if(rec.type==='subject'){
    doc.text('Subject: '+rec.subjectName, 320, y); y+=18;
    doc.text('Teacher: '+rec.teacher, 40, y);
    doc.text('Method: '+rec.method, 320, y); y+=26;
    doc.setFillColor(247,237,204); doc.rect(40,y,515,22,'F');
    doc.setFont('helvetica','bold'); doc.text('Month(s) Paid', 48, y+15); doc.text('Amount', 480, y+15);
    y += 22;
    doc.setFont('helvetica','normal');
    doc.text(rec.months.map(m=>MONTH_NAMES[m.m-1]+' '+m.y).join(', '), 48, y+16, {maxWidth:400});
    doc.text('Tk '+Number(rec.amount).toLocaleString('en-IN'), 480, y+16);
    y += 34;
    doc.setDrawColor(228,215,173); doc.line(40,y,555,y); y+=18;
    doc.setFont('helvetica','bold'); doc.text('Total: Tk '+Number(rec.amount).toLocaleString('en-IN'), 480, y, {align:'right'});
    if(rec.notes){ y+=24; doc.setFont('helvetica','normal'); doc.text('Notes: '+rec.notes, 40, y, {maxWidth:515}); }
  } else {
    y += 8;
    doc.setFillColor(247,237,204); doc.rect(40,y,515,22,'F');
    doc.setFont('helvetica','bold');
    doc.text('Subject',48,y+15); doc.text('Teacher',210,y+15); doc.text('Paid',380,y+15); doc.text('Due',470,y+15);
    y+=22; doc.setFont('helvetica','normal');
    rec.rows.forEach(r=>{
      doc.text(r.name,48,y+15,{maxWidth:150}); doc.text(r.teacher,210,y+15,{maxWidth:150});
      doc.text('Tk '+Number(r.paid).toLocaleString('en-IN'),380,y+15);
      doc.text('Tk '+Number(r.due).toLocaleString('en-IN'),470,y+15);
      y+=20;
    });
    y+=8; doc.setDrawColor(228,215,173); doc.line(40,y,555,y); y+=18;
    doc.setFont('helvetica','bold');
    doc.text('Total Paid: Tk '+Number(rec.totalPaid).toLocaleString('en-IN'), 40, y);
    doc.text('Total Due: Tk '+Number(rec.totalDue).toLocaleString('en-IN'), 320, y);
  }
  doc.setFontSize(8); doc.setTextColor(150,140,110); doc.setFont('helvetica','normal');
  doc.text('Generated automatically by EduPay Pico', 297, 800, {align:'center'});
  doc.save(rec.receiptNo+'.pdf');
  toast('PDF downloaded','success','⬇️');
});

/* ==================================================================
   10. ABOUT / BACKUP
   ================================================================== */
document.getElementById('btnExportJson').addEventListener('click', ()=>{
  const backup = { subjects:STATE.subjects, payments:STATE.payments, receipts:STATE.receipts, settings:STATE.settings, activity:STATE.activity, exportedAt:new Date().toISOString() };
  const blob = new Blob([JSON.stringify(backup,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'edupay-pico-backup-'+todayISO()+'.json';
  a.click();
  toast('Backup downloaded','success','⬇️');
});
document.getElementById('btnImportJsonTrigger').addEventListener('click', ()=>document.getElementById('importFileInput').click());
document.getElementById('importFileInput').addEventListener('change', function(){
  const file = this.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const data = JSON.parse(e.target.result);
      askConfirm('Import backup?', 'This will replace your current data with the imported file.', ()=>{
        STATE.subjects = data.subjects || [];
        STATE.payments = data.payments || [];
        STATE.receipts = data.receipts || [];
        STATE.activity = data.activity || [];
        STATE.settings = data.settings || STATE.settings;
        persist('subjects'); persist('payments'); persist('receipts'); persist('activity'); persist('settings');
        toast('Backup imported','success','⬆️');
        applyProfile(); renderDashboard(); renderSubjects();
      });
    }catch(err){ toast('Invalid JSON file','error'); }
  };
  reader.readAsText(file);
  this.value='';
});
document.getElementById('btnResetDb').addEventListener('click', ()=>{
  askConfirm('Reset database?', 'This permanently deletes all subjects, payments and receipts. This cannot be undone.', ()=>{
    STATE = { subjects:[], payments:[], receipts:[], activity:[], settings:{studentName:STATE.settings.studentName, nextSR:1, nextOR:1} };
    Object.values(DB_KEYS).forEach(k=>localStorage.removeItem(k));
    persist('subjects'); persist('payments'); persist('receipts'); persist('activity'); persist('settings');
    toast('Database reset','success','🗑️');
    renderDashboard(); renderSubjects();
  });
});

/* ==================================================================
   11. INIT
   ================================================================== */
applyProfile();
renderDashboard();
renderSubjects();
renderPaymentSubjectOptions();
renderStatus();
renderReceiptOptions();
