/* =========================================================
   MARA HORIZON TRUST — app.js
   A client-side data layer that simulates the platform's backend
   using localStorage. This keeps the whole build a static site
   (deployable anywhere) while making every feature in the brief
   actually work in the browser: accounts, vacancies, applications,
   document uploads (metadata), statuses, and notifications.

   NOTE FOR PRODUCTION: localStorage is per-browser, not a real
   database — swap MHT.store for real API calls (with a server,
   auth, and file storage) when you're ready to go live. Everything
   here is written so that swap only touches this one file.
   ========================================================= */

const MHT = (() => {

  const KEYS = {
    jobs: 'mht_jobs',
    users: 'mht_users',
    profiles: 'mht_profiles',
    applications: 'mht_applications',
    notifications: 'mht_notifications',
    session: 'mht_session',
    seeded: 'mht_seeded_v1'
  };

  /* ---------- low-level store ---------- */
  const store = {
    get(key, fallback){
      try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
      catch(e){ return fallback; }
    },
    set(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  };

  function uid(prefix){
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }
  function refNumber(prefix, n){
    return `${prefix}-2026-${String(n).padStart(4,'0')}`;
  }
  function todayISO(offsetDays=0){
    const d = new Date(); d.setDate(d.getDate()+offsetDays);
    return d.toISOString().slice(0,10);
  }
  function formatDate(iso){
    if(!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  }
  function daysLeft(iso){
    const diff = Math.ceil((new Date(iso) - new Date()) / 86400000);
    return diff;
  }

  /* ---------- seed data ---------- */
  function seed(){
    if(store.get(KEYS.seeded, false)) return;

    const jobs = [
      { category:'Wildlife Officer', title:'Wildlife Protection Officer', location:'Maasai Mara Conservancy, Kenya', type:'Full-time',
        summary:'Lead daily anti-poaching patrols and coordinate with community scouts across the conservancy.',
        requirements:['Diploma in Wildlife Management or related field','3+ years field experience','Valid firearm handling certificate','Fluent in Swahili and English'] },
      { category:'Game Ranger', title:'Senior Game Ranger', location:'Serengeti Ecosystem, Tanzania', type:'Full-time',
        summary:'Monitor wildlife populations, manage ranger patrol schedules, and lead guest game drives.',
        requirements:['Certificate in Ecotourism or Wildlife Management','2+ years ranger experience','Basic first-aid certification','Valid driving licence'] },
      { category:'Driver', title:'Safari Vehicle Driver', location:'Amboseli, Kenya', type:'Contract',
        summary:'Operate 4x4 safari vehicles for guest transfers and game drives, maintaining vehicle logs.',
        requirements:['Valid Class B/C driving licence','5+ years professional driving experience','Clean driving record','Basic vehicle maintenance knowledge'] },
      { category:'Mechanic', title:'Fleet Maintenance Mechanic', location:'Narok, Kenya', type:'Full-time',
        summary:'Maintain and repair a fleet of safari vehicles and generators across camp sites.',
        requirements:['Trade certificate in Automotive Mechanics','3+ years experience with 4x4 diesel engines','Own basic toolset','Willing to be based on-site'] },
      { category:'Security', title:'Camp Security Officer', location:'Ngorongoro, Tanzania', type:'Full-time',
        summary:'Oversee perimeter security and guest safety protocols at a luxury tented camp.',
        requirements:['Certificate in Security Management','Prior security or military background preferred','Night-shift availability','Good communication skills'] },
      { category:'Administrator', title:'Camp Administrator', location:'Bwindi, Uganda', type:'Full-time',
        summary:'Manage day-to-day camp administration, staff rosters, and supplier coordination.',
        requirements:['Diploma in Business Administration','2+ years administrative experience','Proficient in MS Office','Strong organisational skills'] },
      { category:'Accountant', title:'Finance & Accounts Officer', location:'Nairobi, Kenya (Head Office)', type:'Full-time',
        summary:'Handle payroll, supplier payments, and monthly financial reporting for field operations.',
        requirements:['Bachelor\'s degree in Finance or Accounting','CPA(K) Part II or above','3+ years accounting experience','Experience with QuickBooks or similar'] },
      { category:'Tour Guide', title:'Certified Safari Guide', location:'Maasai Mara Conservancy, Kenya', type:'Full-time',
        summary:'Lead game drives and walking safaris, sharing conservation knowledge with guests.',
        requirements:['KPSGA Silver certification or above','3+ years guiding experience','Excellent guest-facing communication','Wildlife identification proficiency'] },
      { category:'Hospitality', title:'Lodge Guest Relations Host', location:'Zanzibar, Tanzania', type:'Seasonal',
        summary:'Welcome guests, manage check-in/out, and coordinate with kitchen and housekeeping teams.',
        requirements:['Diploma in Hospitality Management','2+ years in a guest-facing lodge role','Fluent English, French an advantage','Flexible with shift schedules'] },
      { category:'Conservation Specialist', title:'Community Conservation Officer', location:'Kigali, Rwanda', type:'Full-time',
        summary:'Design and run community outreach programmes that link livelihoods to conservation outcomes.',
        requirements:['Degree in Conservation, Environmental Science or related','3+ years community programme experience','Grant reporting experience an advantage','Fluent Kinyarwanda and English'] },
      { category:'Conservation Specialist', title:'Wildlife Research Assistant', location:'Tsavo, Kenya', type:'Contract',
        summary:'Support ongoing large-mammal monitoring surveys and maintain the research database.',
        requirements:['Degree in Zoology, Ecology or related field','Experience with GPS/telemetry data an advantage','Comfortable with extended field camps','Attention to data accuracy'] },
      { category:'Other', title:'Camp Chef', location:'Murchison Falls, Uganda', type:'Full-time',
        summary:'Plan and prepare meals for guests and staff at a remote tented safari camp.',
        requirements:['Certificate in Culinary Arts','4+ years professional kitchen experience','Experience cooking in remote/off-grid settings','Food hygiene certification'] },
    ];

    const seededJobs = jobs.map((j,i) => ({
      id: uid('job'),
      ref: refNumber('MHT', i+1),
      ...j,
      deadline: todayISO(14 + (i % 5) * 7),
      posted: todayISO(-(i % 10)),
      status: 'open',
      postedBy: 'employer_demo'
    }));
    store.set(KEYS.jobs, seededJobs);

    const users = [
      { id:'employer_demo', role:'employer', name:'Naiya Sekento', org:'Mara Horizon Trust — Conservancy Partnerships', email:'employer@marahorizontrust.org', phone:'+254 700 000111', password:'employer123', createdAt:todayISO(-40) },
      { id:'admin_demo', role:'admin', name:'System Administrator', org:'Mara Horizon Trust', email:'admin@marahorizontrust.org', phone:'+254 700 000222', password:'admin123', createdAt:todayISO(-90) },
    ];
    store.set(KEYS.users, users);
    store.set(KEYS.profiles, {});
    store.set(KEYS.applications, []);
    store.set(KEYS.notifications, {});
    store.set(KEYS.seeded, true);
  }

  /* ---------- collections ---------- */
  const jobs = {
    all(){ return store.get(KEYS.jobs, []); },
    open(){ return jobs.all().filter(j => j.status === 'open'); },
    byId(id){ return jobs.all().find(j => j.id === id); },
    create(data){
      const list = jobs.all();
      const item = { id:uid('job'), ref:refNumber('MHT', list.length+1), status:'open', posted:todayISO(), ...data };
      list.unshift(item); store.set(KEYS.jobs, list); return item;
    },
    update(id, patch){
      const list = jobs.all().map(j => j.id === id ? { ...j, ...patch } : j);
      store.set(KEYS.jobs, list);
    },
    remove(id){ store.set(KEYS.jobs, jobs.all().filter(j => j.id !== id)); },
    byEmployer(userId){ return jobs.all().filter(j => j.postedBy === userId); },
    categories(){ return [...new Set(jobs.all().map(j => j.category))].sort(); }
  };

  const users = {
    all(){ return store.get(KEYS.users, []); },
    byEmail(email){ return users.all().find(u => u.email.toLowerCase() === email.toLowerCase()); },
    byId(id){ return users.all().find(u => u.id === id); },
    create(data){
      const list = users.all();
      if(list.some(u => u.email.toLowerCase() === data.email.toLowerCase())) return { error:'An account with this email already exists.' };
      const item = { id:uid('user'), createdAt:todayISO(), ...data };
      list.push(item); store.set(KEYS.users, list); return { user:item };
    },
    remove(id){ store.set(KEYS.users, users.all().filter(u => u.id !== id)); }
  };

  const profiles = {
    get(userId){ return store.get(KEYS.profiles, {})[userId] || null; },
    save(userId, data){
      const all = store.get(KEYS.profiles, {});
      all[userId] = { ...(all[userId]||{}), ...data };
      store.set(KEYS.profiles, all);
      return all[userId];
    }
  };

  const notifications = {
    forUser(userId){ return (store.get(KEYS.notifications, {})[userId] || []).sort((a,b)=> b.date.localeCompare(a.date)); },
    push(userId, message){
      const all = store.get(KEYS.notifications, {});
      if(!all[userId]) all[userId] = [];
      all[userId].unshift({ id:uid('note'), message, date:new Date().toISOString(), read:false });
      store.set(KEYS.notifications, all);
    },
    markAllRead(userId){
      const all = store.get(KEYS.notifications, {});
      (all[userId]||[]).forEach(n => n.read = true);
      store.set(KEYS.notifications, all);
    },
    unreadCount(userId){ return notifications.forUser(userId).filter(n => !n.read).length; }
  };

  const STATUS_FLOW = ['Received','Under Review','Shortlisted','Interview','Hired'];

  const applications = {
    all(){ return store.get(KEYS.applications, []); },
    byUser(userId){ return applications.all().filter(a => a.userId === userId); },
    byJob(jobId){ return applications.all().filter(a => a.jobId === jobId); },
    hasApplied(userId, jobId){ return applications.all().some(a => a.userId===userId && a.jobId===jobId); },
    create(data){
      const list = applications.all();
      const item = { id:uid('app'), ref:refNumber('MHT-APP', list.length+1), appliedAt:new Date().toISOString(), status:'Received', ...data };
      list.unshift(item); store.set(KEYS.applications, list);
      const job = jobs.byId(data.jobId);
      notifications.push(data.userId, `Your application for "${job ? job.title : 'a vacancy'}" (Ref. ${item.ref}) was received.`);
      return item;
    },
    updateStatus(id, status){
      const list = applications.all();
      const item = list.find(a => a.id === id);
      if(!item) return;
      item.status = status;
      store.set(KEYS.applications, list);
      const job = jobs.byId(item.jobId);
      notifications.push(item.userId, `Update: your application for "${job ? job.title : 'a vacancy'}" (Ref. ${item.ref}) is now "${status}".`);
    }
  };

  /* ---------- auth / session ---------- */
  const auth = {
    session(){ return store.get(KEYS.session, null); },
    currentUser(){
      const s = auth.session();
      return s ? users.byId(s.userId) : null;
    },
    register({ role, name, email, phone, password }){
      const res = users.create({ role, name, email, phone, password });
      if(res.error) return res;
      store.set(KEYS.session, { userId: res.user.id });
      return { user: res.user };
    },
    login(email, password){
      const u = users.byEmail(email);
      if(!u || u.password !== password) return { error:'Incorrect email or password.' };
      store.set(KEYS.session, { userId:u.id });
      return { user:u };
    },
    logout(){ localStorage.removeItem(KEYS.session); },
    requireRole(role){
      const u = auth.currentUser();
      return u && u.role === role ? u : null;
    }
  };

  /* ---------- misc utils ---------- */
  function toast(message, kind=''){
    let host = document.getElementById('toastHost');
    if(!host){ host = document.createElement('div'); host.id='toastHost'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' '+kind : '');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function timeAgo(iso){
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if(s < 60) return 'just now';
    if(s < 3600) return Math.floor(s/60) + 'm ago';
    if(s < 86400) return Math.floor(s/3600) + 'h ago';
    return Math.floor(s/86400) + 'd ago';
  }

  function statusBadgeClass(status){
    const map = {
      'Received':'badge-received','Under Review':'badge-review','Shortlisted':'badge-shortlisted',
      'Interview':'badge-interview','Hired':'badge-hired','Rejected':'badge-rejected'
    };
    return map[status] || 'badge-received';
  }

  /* ---------- nav auth-aware UI ---------- */
  function paintAuthNav(){
    const slot = document.getElementById('navAuthSlot');
    if(!slot) return;
    const u = auth.currentUser();
    if(!u){
      slot.innerHTML = `<a href="profile.html">Sign in</a>`;
      return;
    }
    const dash = u.role === 'admin' ? 'admin.html' : u.role === 'employer' ? 'employer.html' : 'profile.html';
    slot.innerHTML = `<a href="${dash}">${u.name.split(' ')[0]} · ${u.role[0].toUpperCase()+u.role.slice(1)}</a>`;
  }

  function initNavToggle(){
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('mainNav');
    if(!toggle || !nav) return;
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  function initReveal(){
    const items = document.querySelectorAll('.reveal');
    if(!items.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold:.15 });
    items.forEach(el => io.observe(el));
  }

  function fileMeta(file){
    if(!file) return null;
    const kb = file.size / 1024;
    const size = kb > 1024 ? (kb/1024).toFixed(1)+' MB' : Math.round(kb)+' KB';
    return { name:file.name, size, type:file.type };
  }

  function init(){
    seed();
    initNavToggle();
    initReveal();
    paintAuthNav();
  }

  return {
    jobs, users, profiles, notifications, applications, auth,
    toast, timeAgo, formatDate, daysLeft, statusBadgeClass, fileMeta,
    STATUS_FLOW, init, paintAuthNav
  };
})();

document.addEventListener('DOMContentLoaded', MHT.init);
