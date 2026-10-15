/* EventHub - login, add events, join/leave, search & filter (data saved in localStorage) */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
const page = document.body.dataset.page;
const FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="600" height="360" fill="#cfe9ec"/><text x="300" y="190" font-size="28" text-anchor="middle" fill="#1a1a2e" font-family="Arial">EventHub</text></svg>');

/* ---------- Login ---------- */
let user = store.get("eh_user", null);
if (page === "login" && user) location.replace("events.html");
if (page !== "login" && !user) location.replace("login.html");

/* ---------- Layout (nav + footer) ---------- */
function renderLayout() {
  const links = [["index.html","Home","home"],["events.html","Events","events"],["about.html","About","about"],["contact.html","Contact","contact"]];
  const nav = document.createElement("nav");
  nav.innerHTML = `<h2>EventHub</h2><div class="links">${
    user ? links.map(l => `<a href="${l[0]}" class="${l[2]===page?"active":""}">${l[1]}</a>`).join("") : ""}
    ${user ? `<span class="user-box">Hi, ${esc(user.name)} <button id="logout">Log out</button></span>` : ""}</div>`;
  document.body.prepend(nav);
  const f = document.createElement("footer");
  f.innerHTML = "<p>© 2026 EventHub. All rights reserved.</p>";
  document.body.append(f);
  $("#logout")?.addEventListener("click", () => { localStorage.removeItem("eh_user"); location.href = "login.html"; });
}
renderLayout();

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
  document.body.append(t); setTimeout(() => t.remove(), 2400);
}
function setErr(input, errEl, msg) { input.classList.toggle("invalid", !!msg); errEl.textContent = msg || ""; return !msg; }
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

if (page === "login") {
  $("#loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const n = $("#lName"), m = $("#lEmail");
    const a = setErr(n, $("#nErr"), n.value.trim().length < 2 ? "Please enter your name (at least 2 characters)." : "");
    const b = setErr(m, $("#eErr"), !emailOk(m.value.trim()) ? "Please enter a valid email, like you@example.com." : "");
    if (!a || !b) return;
    store.set("eh_user", { name: n.value.trim(), email: m.value.trim().toLowerCase() });
    location.href = "events.html";
  });
}

if (page === "contact") {
  $("#contactForm").addEventListener("submit", e => {
    e.preventDefault();
    const t = $("#cMsg");
    if (!setErr(t, $("#cErr"), t.value.trim().length < 5 ? "Please write a short message." : "")) return;
    const all = store.get("eh_messages", []); all.push({ from: user.email, text: t.value.trim(), at: Date.now() });
    store.set("eh_messages", all); t.value = ""; toast("Message sent. Thank you!");
  });
}

/* ---------- Events data ---------- */
const inDays = (d, h) => { const x = new Date(Date.now() + d * 864e5); x.setHours(h, 0, 0, 0); const p = n => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())}T${p(x.getHours())}:00`; };
function loadEvents() {
  let list = store.get("eh_events", null);
  if (!list) {
    list = [
      { id: "s1", title: "Programming Workshop", img: "images/programming.jpg", place: "Computer Lab 3", time: inDays(5, 14), desc: "Learn programming fundamentals and improve your coding skills.", owner: "admin", ownerName: "EventHub Team", attendees: [] },
      { id: "s2", title: "Career Talk", img: "images/career.jpeg", place: "Main Auditorium", time: inDays(9, 10), desc: "Learn about career opportunities in the technology industry.", owner: "admin", ownerName: "EventHub Team", attendees: [] },
      { id: "s3", title: "Sports Day", img: "images/sport.jpeg", place: "University Field", time: inDays(14, 8), desc: "Join your friends and enjoy our university sports day.", owner: "admin", ownerName: "EventHub Team", attendees: [] }
    ];
    store.set("eh_events", list);
  }
  return list;
}
let events = loadEvents();
const save = () => store.set("eh_events", events);
const fmt = t => new Date(t).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
const isPast = e => new Date(e.time) < new Date();

function card(e) {
  const joined = e.attendees.includes(user.email), mine = e.owner === user.email, past = isPast(e);
  const n = e.attendees.length;
  return `<article class="event-card" data-id="${e.id}">
    <div class="pic"><img src="${esc(e.img || FALLBACK)}" alt="${esc(e.title)}" data-act="view" onerror="this.onerror=null;this.src='${FALLBACK}'">
      <span class="badge ${past ? "past" : ""}">${past ? "Ended" : new Date(e.time).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</span></div>
    <div class="body"><h3>${esc(e.title)}</h3>
      <p class="meta">📍 ${esc(e.place)}</p><p class="meta">🕒 ${fmt(e.time)}</p><p class="meta">👥 ${n} going</p>
      <p class="desc">${esc(e.desc)}</p>
      <div class="actions">
        <button data-act="join" class="${joined ? "joined" : ""}" ${past ? "disabled" : ""}>${joined ? "Joined ✓" : "Join event"}</button>
        <button data-act="view" class="ghost">Details</button>
        ${mine ? '<button data-act="del" class="danger">Delete</button>' : ""}
      </div></div></article>`;
}

/* ---------- Modal ---------- */
const modal = document.createElement("div");
modal.className = "modal"; modal.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true"></div>';
document.body.append(modal);
const box = $(".modal-box", modal);
const openModal = html => { box.innerHTML = html; modal.classList.add("open"); box.querySelector("input,button")?.focus(); };
const closeModal = () => modal.classList.remove("open");
modal.addEventListener("click", e => { if (e.target === modal || e.target.dataset.close !== undefined) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

function showDetail(id) {
  const e = events.find(x => x.id === id); if (!e) return;
  const joined = e.attendees.includes(user.email), past = isPast(e);
  openModal(`<img class="detail-img" src="${esc(e.img || FALLBACK)}" alt="" onerror="this.onerror=null;this.src='${FALLBACK}'">
    <h2>${esc(e.title)}</h2><p class="meta">📍 ${esc(e.place)}</p><p class="meta">🕒 ${fmt(e.time)}</p>
    <p class="meta">👥 ${e.attendees.length} going · Hosted by ${esc(e.ownerName)}</p>
    <p>${esc(e.desc).replace(/\n/g, "<br>")}</p>
    <div class="modal-actions"><button class="ghost" data-close>Close</button>
    <button id="mJoin" class="${joined ? "joined" : ""}" ${past ? "disabled" : ""}>${joined ? "Joined ✓ (click to leave)" : "Join event"}</button></div>`);
  $("#mJoin").onclick = () => { toggleJoin(id); showDetail(id); };
}

function toggleJoin(id) {
  const e = events.find(x => x.id === id); if (!e || isPast(e)) return;
  const i = e.attendees.indexOf(user.email);
  i < 0 ? e.attendees.push(user.email) : e.attendees.splice(i, 1);
  save(); toast(i < 0 ? `You joined: ${e.title}` : `You left: ${e.title}`); render();
}

function confirmDelete(id) {
  const e = events.find(x => x.id === id); if (!e) return;
  openModal(`<h2>Delete this event?</h2><p>“${esc(e.title)}” will be removed for everyone.</p>
    <div class="modal-actions"><button class="ghost" data-close>Cancel</button><button class="danger" id="yesDel">Delete event</button></div>`);
  $("#yesDel").onclick = () => { events = events.filter(x => x.id !== id); save(); closeModal(); toast("Event deleted"); render(); };
}

/* ---------- Add event ---------- */
let imgData = "";
function resizeImage(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = () => { const im = new Image(); im.onerror = rej;
      im.onload = () => { const s = Math.min(1, 800 / im.width), c = document.createElement("canvas");
        c.width = im.width * s; c.height = im.height * s; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.75)); };
      im.src = r.result; };
    r.readAsDataURL(file);
  });
}
function openAdd() {
  imgData = "";
  openModal(`<h2>Add a new event</h2><form id="addForm" class="form" novalidate>
    <label>Event title<input id="fTitle" maxlength="60" placeholder="e.g. Hackathon 2026"><small class="error"></small></label>
    <label>Event picture<input id="fImg" type="file" accept="image/*"><span class="hint">JPG or PNG, shown on the event card.</span>
      <img id="fPrev" class="preview" alt="Picture preview"><small class="error"></small></label>
    <label>Description<textarea id="fDesc" rows="3" maxlength="500" placeholder="What is this event about?"></textarea><small class="error"></small></label>
    <div class="row"><label>Place<input id="fPlace" placeholder="e.g. Hall A"><small class="error"></small></label>
    <label>Date and time<input id="fTime" type="datetime-local"><small class="error"></small></label></div>
    <div class="modal-actions"><button type="button" class="ghost" data-close>Cancel</button><button type="submit">Publish event</button></div></form>`);
  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  $("#fTime").min = now.toISOString().slice(0, 16);
  $("#fImg").onchange = async ev => {
    const f = ev.target.files[0], err = ev.target.parentNode.querySelector(".error"); err.textContent = ""; imgData = "";
    $("#fPrev").style.display = "none"; if (!f) return;
    if (!f.type.startsWith("image/")) { err.textContent = "Please choose an image file."; ev.target.value = ""; return; }
    try { imgData = await resizeImage(f); $("#fPrev").src = imgData; $("#fPrev").style.display = "block"; }
    catch { err.textContent = "Could not read that image. Try another one."; }
  };
  $("#addForm").onsubmit = ev => {
    ev.preventDefault();
    const f = { t: $("#fTitle"), d: $("#fDesc"), p: $("#fPlace"), w: $("#fTime") };
    const chk = (el, bad, msg) => setErr(el, el.parentNode.querySelector(".error"), bad ? msg : "");
    const ok = [chk(f.t, !f.t.value.trim(), "Please enter a title."),
      chk(f.d, f.d.value.trim().length < 10, "Please write at least 10 characters."),
      chk(f.p, !f.p.value.trim(), "Please enter a place."),
      chk(f.w, !f.w.value || new Date(f.w.value) < new Date(), "Please choose a future date and time.")];
    const imgErr = $("#fImg").parentNode.querySelector(".error");
    if (!imgData) { imgErr.textContent = "Please upload an event picture."; ok.push(false); }
    if (ok.includes(false)) return;
    events.unshift({ id: "e" + Date.now(), title: f.t.value.trim(), img: imgData, place: f.p.value.trim(), time: f.w.value,
      desc: f.d.value.trim(), owner: user.email, ownerName: user.name, attendees: [user.email] });
    if (!save()) { events.shift(); imgErr.textContent = "Storage is full. Try a smaller picture or delete old events."; return; }
    closeModal(); toast("Event published!"); render();
  };
}

/* ---------- Render & interaction ---------- */
let filter = "all", query = "";
function render() {
  if (page === "home") {
    const up = events.filter(e => !isPast(e)).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 3);
    $("#featured").innerHTML = up.length ? up.map(card).join("") : '<p class="empty">No upcoming events yet. <a href="events.html">Add one</a>.</p>';
  }
  if (page === "events") {
    const q = query.toLowerCase();
    const list = events.filter(e =>
      (filter === "all" || (filter === "upcoming" && !isPast(e)) || (filter === "joined" && e.attendees.includes(user.email)) || (filter === "mine" && e.owner === user.email)) &&
      (!q || (e.title + e.place + e.desc).toLowerCase().includes(q)))
      .sort((a, b) => a.time.localeCompare(b.time));
    $("#eventList").innerHTML = list.length ? list.map(card).join("") : '<p class="empty">No events found. Try another search or add a new event.</p>';
  }
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.closest(".event-card")?.dataset.id;
  ({ join: toggleJoin, view: showDetail, del: confirmDelete })[b.dataset.act]?.(id);
});
if (page === "events") {
  $("#addBtn").onclick = openAdd;
  $("#search").oninput = e => { query = e.target.value.trim(); render(); };
  $("#filters").onclick = e => { const c = e.target.closest(".chip"); if (!c) return;
    filter = c.dataset.f; document.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x === c)); render(); };
}
render();
