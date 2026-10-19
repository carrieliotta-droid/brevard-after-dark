(() => {
  'use strict';
  const events = window.HALLOWEEN_EVENTS || [];
  const SNAPSHOT_TODAY = '2026-10-18';
  const state = { date: 'upcoming', audience: 'all', search: '', freeOnly: false, favoritesOnly: false, sort: 'date' };
  const saved = new Set(JSON.parse(localStorage.getItem('brevard-after-dark-favorites') || '[]'));
  const $ = (selector) => document.querySelector(selector);
  const list = $('#eventList');
  const template = $('#eventTemplate');
  const markers = $('#mapMarkers');

  const normalized = events.map((event, index) => ({...event, index, end: event.end || event.date}));
  const dateAtNoon = value => new Date(`${value}T12:00:00`);
  const formatDate = value => dateAtNoon(value).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
  const shortDate = value => dateAtNoon(value).toLocaleDateString('en-US', {month:'short', day:'numeric'});

  function dateMatch(event) {
    if (state.date === 'all') return true;
    if (state.date === 'halloween') return event.date <= '2026-10-31' && event.end >= '2026-10-31';
    if (state.date === 'weekend') return event.date <= '2026-10-25' && event.end >= '2026-10-23';
    return event.end >= SNAPSHOT_TODAY;
  }
  function audienceMatch(event) {
    if (state.audience === 'all') return true;
    return event.tags.includes(state.audience);
  }
  function textMatch(event) {
    const haystack = `${event.name} ${event.city} ${event.venue} ${event.description} ${event.tags.join(' ')}`.toLowerCase();
    return haystack.includes(state.search.toLowerCase().trim());
  }
  function filteredEvents() {
    const matches = normalized.filter(event => dateMatch(event) && audienceMatch(event) && textMatch(event) && (!state.freeOnly || event.free) && (!state.favoritesOnly || saved.has(event.id)));
    return matches.sort((a,b) => {
      if (state.sort === 'north') return a.y - b.y || a.date.localeCompare(b.date);
      if (state.sort === 'price') return Number(b.free) - Number(a.free) || a.date.localeCompare(b.date);
      return a.date.localeCompare(b.date) || a.name.localeCompare(b.name);
    });
  }
  function labelForDate() {
    return {upcoming:'upcoming and ongoing',weekend:'October 23–25',halloween:'Halloween day',all:'all verified 2026 dates'}[state.date];
  }
  function render() {
    const visible = filteredEvents();
    list.replaceChildren();
    markers.replaceChildren();
    $('#resultCount').textContent = visible.length;
    $('#favoriteCount').textContent = saved.size;
    $('#activeSummary').textContent = `Showing ${labelForDate()} · ${state.audience === 'all' ? 'all audiences' : state.audience} ${state.freeOnly ? '· free only' : ''}`;
    $('#emptyState').hidden = visible.length !== 0;

    visible.forEach((event, position) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('.event-card');
      card.id = `event-${event.id}`;
      card.dataset.id = event.id;
      const date = dateAtNoon(event.date);
      fragment.querySelector('.month').textContent = date.toLocaleDateString('en-US',{month:'short'});
      fragment.querySelector('.day').textContent = date.getDate();
      fragment.querySelector('.weekday').textContent = date.toLocaleDateString('en-US',{weekday:'short'});
      fragment.querySelector('.event-meta').textContent = `${event.city} · ${event.tags.map(t=>t.replace('adult','adults')).join(' · ')}`;
      fragment.querySelector('h3').textContent = event.name;
      fragment.querySelector('.description').textContent = event.description;
      fragment.querySelector('.time').textContent = event.time;
      fragment.querySelector('.venue').textContent = event.venue;
      fragment.querySelector('.price').textContent = event.price;
      const source = fragment.querySelector('.source-link');
      source.href = event.source;
      source.setAttribute('aria-label', `Check details for ${event.name}`);
      const saveButton = fragment.querySelector('.save-button');
      updateSaveButton(saveButton,event);
      saveButton.addEventListener('click',()=>toggleSaved(event.id));
      list.appendChild(fragment);

      const marker = document.createElement('button');
      marker.className = 'map-marker';
      marker.type = 'button';
      marker.textContent = position + 1;
      marker.style.top = `${event.y}%`;
      marker.style.left = `${42 + ((event.index * 17) % 18)}%`;
      marker.title = `${event.name} — ${event.city}`;
      marker.setAttribute('aria-label', `Show ${event.name} in the event list`);
      marker.addEventListener('click',()=>focusEvent(event.id,marker));
      markers.appendChild(marker);
    });
    renderItinerary();
  }
  function updateSaveButton(button,event){
    const isSaved = saved.has(event.id);
    button.classList.toggle('saved',isSaved);
    button.setAttribute('aria-pressed',String(isSaved));
    button.innerHTML = `<span>${isSaved ? '♥' : '♡'}</span> ${isSaved ? 'Saved' : 'Save'}`;
  }
  function toggleSaved(id){
    saved.has(id) ? saved.delete(id) : saved.add(id);
    localStorage.setItem('brevard-after-dark-favorites',JSON.stringify([...saved]));
    render();
  }
  function focusEvent(id, marker){
    document.querySelectorAll('.map-marker').forEach(m=>m.classList.remove('active'));
    marker.classList.add('active');
    const card = $(`#event-${CSS.escape(id)}`);
    if (!card) return;
    card.classList.add('highlighted');
    card.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>card.classList.remove('highlighted'),1500);
  }
  function renderItinerary(){
    const container = $('#itineraryList');
    const chosen = normalized.filter(e=>saved.has(e.id)).sort((a,b)=>a.date.localeCompare(b.date));
    if (!chosen.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-portrait">♡</div><h3>No engagements yet.</h3><p>Save an event and it will materialize here.</p></div>';
      return;
    }
    container.innerHTML = chosen.map(e=>`<article class="saved-item"><p>${shortDate(e.date)} · ${e.time}</p><h3>${e.name}</h3><p>${e.city} · ${e.venue}</p><button type="button" data-remove="${e.id}">Remove</button></article>`).join('');
    container.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>toggleSaved(button.dataset.remove)));
  }
  function openItinerary(){
    $('#itinerary').classList.add('open'); $('#itinerary').setAttribute('aria-hidden','false'); $('#favoritesButton').setAttribute('aria-expanded','true'); $('#scrim').hidden=false; $('#closeItinerary').focus();
  }
  function closeItinerary(){
    $('#itinerary').classList.remove('open'); $('#itinerary').setAttribute('aria-hidden','true'); $('#favoritesButton').setAttribute('aria-expanded','false'); $('#scrim').hidden=true; $('#favoritesButton').focus();
  }
  function resetFilters(){
    Object.assign(state,{date:'upcoming',audience:'all',search:'',freeOnly:false,favoritesOnly:false,sort:'date'});
    $('#searchInput').value=''; $('#freeOnly').checked=false; $('#favoritesOnly').checked=false; $('#sortSelect').value='date';
    document.querySelectorAll('[data-date]').forEach(b=>b.classList.toggle('active',b.dataset.date==='upcoming'));
    document.querySelectorAll('[data-audience]').forEach(b=>b.classList.toggle('active',b.dataset.audience==='all'));
    render();
  }
  function summon(){
    const candidates = filteredEvents();
    if (!candidates.length) return;
    const event = candidates[Math.floor(Math.random()*candidates.length)];
    $('#summonContent').innerHTML = `<p class="summon-detail">${formatDate(event.date)} · ${event.time}<br>${event.city} · ${event.venue}</p><h2>${event.name}</h2><p class="summon-description">${event.description}</p><p class="summon-detail">${event.price}</p><a href="${event.source}" target="_blank" rel="noopener">Consult the source ↗</a><button class="save-button ${saved.has(event.id)?'saved':''}" id="summonSave" type="button">${saved.has(event.id)?'♥ Saved':'♡ Save'}</button>`;
    $('#summonSave').addEventListener('click',()=>{toggleSaved(event.id); summon();});
    $('#summonDialog').showModal();
  }

  async function trackPageView(){
    if (!location.protocol.startsWith('http')) return;
    const sessionKey = 'brevard-after-dark-visit-counted';
    const isNewSession = !sessionStorage.getItem(sessionKey);
    const analyticsOrigin = location.hostname.endsWith('pages.dev')
      ? ''
      : 'https://brevard-after-dark.pages.dev';
    try {
      const endpoint = isNewSession ? '/api/track' : '/api/stats';
      const response = await fetch(`${analyticsOrigin}${endpoint}`, {
        method: isNewSession ? 'POST' : 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) return;
      const data = await response.json();
      if (Number.isFinite(data.count)) $('#visitCount').textContent = data.count.toLocaleString();
      if (isNewSession) sessionStorage.setItem(sessionKey, 'yes');
    } catch {
      // Analytics never blocks the event guide.
    }
  }

  $('#searchInput').addEventListener('input',e=>{state.search=e.target.value;render();});
  $('#dateFilters').addEventListener('click',e=>{if(!e.target.dataset.date)return; state.date=e.target.dataset.date; document.querySelectorAll('[data-date]').forEach(b=>b.classList.toggle('active',b===e.target)); render();});
  $('#audienceFilters').addEventListener('click',e=>{if(!e.target.dataset.audience)return; state.audience=e.target.dataset.audience; document.querySelectorAll('[data-audience]').forEach(b=>b.classList.toggle('active',b===e.target)); render();});
  $('#freeOnly').addEventListener('change',e=>{state.freeOnly=e.target.checked;render();});
  $('#favoritesOnly').addEventListener('change',e=>{state.favoritesOnly=e.target.checked;render();});
  $('#sortSelect').addEventListener('change',e=>{state.sort=e.target.value;render();});
  $('#clearFilters').addEventListener('click',resetFilters);
  $('#favoritesButton').addEventListener('click',openItinerary);
  $('#closeItinerary').addEventListener('click',closeItinerary);
  $('#scrim').addEventListener('click',closeItinerary);
  $('#clearItinerary').addEventListener('click',()=>{saved.clear();localStorage.removeItem('brevard-after-dark-favorites');render();});
  $('#copyItinerary').addEventListener('click',async()=>{
    const chosen=normalized.filter(e=>saved.has(e.id)).sort((a,b)=>a.date.localeCompare(b.date));
    const text=chosen.map(e=>`${formatDate(e.date)} — ${e.name}\n${e.time} · ${e.venue}, ${e.city}\n${e.source}`).join('\n\n');
    try{await navigator.clipboard.writeText(text);$('#copyItinerary').textContent='Copied!';setTimeout(()=>$('#copyItinerary').textContent='Copy itinerary',1600);}catch{window.prompt('Copy your itinerary:',text);}
  });
  $('#summonButton').addEventListener('click',summon);
  $('#closeDialog').addEventListener('click',()=>$('#summonDialog').close());
  $('#scrollToEvents').addEventListener('click',()=>$('#events').scrollIntoView({behavior:'smooth'}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#itinerary').classList.contains('open'))closeItinerary();});
  render();
  trackPageView();
})();
