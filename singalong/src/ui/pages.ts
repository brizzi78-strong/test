/**
 * The Sing Along console, served as one self-contained document. Talks only
 * to this server's `/api/*`. Design tokens mirror the Cardinal palette used
 * across the other Cardinal apps.
 */

export const APP_PAGE: string = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Sing Along — guided music for memory care</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23A31B33'/%3E%3Ctext x='16' y='23' font-family='system-ui' font-size='20' font-weight='900' text-anchor='middle' fill='white'%3E%E2%99%AA%3C/text%3E%3C/svg%3E">
<style>
  :root{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#EFE7D3;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;
    --brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--warn:#9A6410;--warn-bg:#F6ECD6;
    --crit:#B23A3A;--crit-bg:#F6E1DE;--shadow:0 1px 2px rgba(23,35,63,.07),0 10px 26px -14px rgba(23,35,63,.24);
    --font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--maxw:980px;--r:13px;}
  @media (prefers-color-scheme:dark){:root{--paper:#101627;--surface:#172033;--surface-2:#1F2A42;--ink:#F3EEE1;
    --muted:#A9A28F;--line:#2B3855;--brand:#D8394A;--brand-strong:#E85562;--good:#4FBE86;--good-bg:#12321f;
    --warn:#D6A24A;--warn-bg:#33280f;--crit:#E07B6E;--crit-bg:#3a1d1a;--shadow:0 1px 2px rgba(0,0,0,.45),0 12px 32px -14px rgba(0,0,0,.65);}}
  :root[data-theme="light"]{--paper:#F7F2E6;--surface:#FFFDF7;--surface-2:#EFE7D3;--ink:#17233F;--muted:#6B6350;--line:#E2D9C3;--brand:#A31B33;--brand-strong:#7E1226;--good:#2E7D4F;--good-bg:#E4F0E8;--warn:#9A6410;--warn-bg:#F6ECD6;--crit:#B23A3A;--crit-bg:#F6E1DE;}
  :root[data-theme="dark"]{--paper:#101627;--surface:#172033;--surface-2:#1F2A42;--ink:#F3EEE1;--muted:#A9A28F;--line:#2B3855;--brand:#D8394A;--brand-strong:#E85562;--good:#4FBE86;--good-bg:#12321f;--warn:#D6A24A;--warn-bg:#33280f;--crit:#E07B6E;--crit-bg:#3a1d1a;}
  *{box-sizing:border-box;} body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font);line-height:1.45;}
  .wrap{max-width:var(--maxw);margin-inline:auto;padding:0 clamp(.8rem,3vw,1.4rem) 3rem;}
  header.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--paper) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);}
  .top-in{max-width:var(--maxw);margin-inline:auto;padding:.7rem clamp(.8rem,3vw,1.4rem);display:flex;align-items:center;gap:.6rem;}
  .logo{width:30px;height:30px;border-radius:8px;background:var(--brand);color:#fff;font-weight:900;display:grid;place-items:center;}
  h1{font-size:1.05rem;margin:0;font-weight:800;} h1 small{display:block;font-weight:600;font-size:.7rem;color:var(--muted);}
  .theme{margin-left:auto;background:transparent;border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:.35rem .55rem;cursor:pointer;}
  .banner{display:none;padding:.6rem .8rem;border-radius:10px;margin:.7rem 0;font-size:.86rem;}
  .banner.show{display:block;} .banner.err{background:var(--crit-bg);border:1px solid var(--crit);} .banner.ok{background:var(--good-bg);border:1px solid var(--good);}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);padding:1rem 1.1rem;margin:.85rem 0;}
  h2{font-size:1rem;margin:.1rem 0 .5rem;} .hint{color:var(--muted);font-size:.82rem;margin:.1rem 0 .7rem;}
  label{display:block;font-size:.72rem;font-weight:700;color:var(--muted);margin:.5rem 0 .18rem;}
  input,select,textarea{width:100%;padding:.5rem .55rem;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font:inherit;}
  textarea{resize:vertical;min-height:4.5rem;}
  input:focus,select:focus,textarea:focus{outline:2px solid var(--brand);outline-offset:1px;}
  .grid{display:grid;gap:.3rem .7rem;} .g3{grid-template-columns:1fr 1fr 1fr;} .g2{grid-template-columns:1fr 1fr;}
  @media(max-width:560px){.g3,.g2{grid-template-columns:1fr;}}
  .btn{background:var(--brand);color:#fff;border:0;border-radius:9px;padding:.55rem .9rem;font:inherit;font-weight:700;cursor:pointer;}
  .btn:hover{background:var(--brand-strong);} .btn.ghost{background:transparent;color:var(--brand);border:1px solid var(--line);}
  .btn.small{padding:.3rem .6rem;font-size:.78rem;} .btn.good{background:var(--good);} .btn.mut{background:transparent;color:var(--muted);border:1px solid var(--line);}
  .btn.warn{background:var(--warn);} .btn.crit{background:var(--crit);} .btn[disabled]{opacity:.5;cursor:not-allowed;}
  .tabs{display:flex;gap:.35rem;flex-wrap:wrap;margin:.6rem 0;}
  .tab{background:transparent;border:1px solid var(--line);border-radius:999px;padding:.35rem .8rem;font:inherit;font-weight:700;font-size:.82rem;color:var(--muted);cursor:pointer;}
  .tab.active{background:var(--brand);color:#fff;border-color:var(--brand);}
  .row{border:1px solid var(--line);border-radius:10px;padding:.55rem .7rem;margin:.35rem 0;background:var(--surface);}
  .row .t{font-weight:700;} .row .s{color:var(--muted);font-size:.82rem;}
  .pill{display:inline-block;font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:.12rem .45rem;border-radius:999px;margin:0 .2rem .2rem 0;}
  .pill.public_domain{background:var(--good-bg);color:var(--good);} .pill.facility_provided{background:var(--warn-bg);color:var(--warn);}
  .chips{display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0;}
  .chip{background:var(--surface-2);border:1px solid var(--line);border-radius:999px;padding:.12rem .5rem;font-size:.74rem;}
  .empty{color:var(--muted);font-size:.85rem;padding:.5rem 0;} .muted{color:var(--muted);}
  select.inline{width:auto;display:inline-block;padding:.3rem .4rem;font-size:.8rem;}
  .prompter{text-align:center;padding:2rem 1rem;}
  .prompter .song{font-size:1.5rem;font-weight:800;margin:0 0 .2rem;}
  .prompter .artist{color:var(--muted);margin:0 0 1rem;}
  .prompter .lyrics{white-space:pre-wrap;font-size:1.3rem;line-height:1.7;max-width:640px;margin:0 auto 1.2rem;}
  .prompter .progress{font-size:.8rem;color:var(--muted);margin-bottom:.6rem;}
  .engage-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:.4rem;max-width:640px;margin:0 auto;}
  @media(max-width:640px){.engage-grid{grid-template-columns:repeat(2,1fr);}}
  .insight-row{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding:.4rem 0;}
  .insight-row:last-child{border-bottom:0;}
  .score{font-family:var(--mono);font-weight:700;}
  .score.pos{color:var(--good);} .score.neg{color:var(--crit);}
</style>
</head>
<body>
<header class="top"><div class="top-in">
  <span class="logo" aria-hidden="true">♪</span>
  <h1>Sing Along<small id="facName">— set up your facility below</small></h1>
  <button class="theme" id="themeBtn" title="Theme">◐</button>
</div></header>

<div class="wrap">
  <div id="banner" class="banner"></div>

  <section class="card" id="setupCard">
    <h2>Your facility</h2>
    <div id="setupBody"></div>
  </section>

  <div id="mainArea" hidden>
    <div class="tabs" id="tabs">
      <button class="tab" data-tab="residents">Residents</button>
      <button class="tab" data-tab="library">Song library</button>
      <button class="tab" data-tab="playlists">Playlists</button>
      <button class="tab" data-tab="player">Run a session</button>
      <button class="tab" data-tab="history">History &amp; insights</button>
    </div>

    <section class="card tabpanel" id="panel-residents">
      <h2>Residents</h2>
      <p class="hint">Musical background only — era, genre, favorite artists, and freeform biographical notes. No clinical or care-plan data.</p>
      <form id="residentForm">
        <div class="grid g2">
          <div><label for="rName">Name</label><input id="rName" required></div>
          <div><label for="rEras">Preferred eras (comma-separated)</label><input id="rEras" placeholder="1940s, 1950s"></div>
          <div><label for="rGenres">Preferred genres (comma-separated)</label><input id="rGenres" placeholder="big band, gospel"></div>
          <div><label for="rArtists">Favorite artists (comma-separated)</label><input id="rArtists" placeholder="Frank Sinatra, Patsy Cline"></div>
        </div>
        <label for="rNotes">Notes (biographical)</label>
        <textarea id="rNotes" placeholder="Sang in a church choir for 40 years"></textarea>
        <button class="btn" type="submit" style="margin-top:.6rem">Add resident</button>
      </form>
      <div id="residentList" style="margin-top:1rem"></div>
    </section>

    <section class="card tabpanel" id="panel-library" hidden>
      <h2>Song library</h2>
      <p class="hint">This app never hosts or streams recordings — point <code>audioUrl</code> at a source the facility already has the right to play (a staff streaming account, a ripped CD on a shared drive, a physical device). Lyrics should be public-domain text or your own transcription.</p>
      <form id="songForm">
        <div class="grid g3">
          <div><label for="sTitle">Title</label><input id="sTitle" required></div>
          <div><label for="sArtist">Artist</label><input id="sArtist"></div>
          <div><label for="sEra">Era</label><input id="sEra" placeholder="1950s"></div>
        </div>
        <div class="grid g3">
          <div><label for="sTags">Tags (comma-separated)</label><input id="sTags" placeholder="gospel, upbeat"></div>
          <div><label for="sAudio">Audio URL (your own source)</label><input id="sAudio" type="url"></div>
          <div><label for="sSource">Source</label><select id="sSource"><option value="public_domain">Public domain</option><option value="facility_provided">Facility-provided</option></select></div>
        </div>
        <label for="sLyrics">Lyrics (for the prompter)</label>
        <textarea id="sLyrics"></textarea>
        <button class="btn" type="submit" style="margin-top:.6rem">Add song</button>
      </form>
      <div id="songList" style="margin-top:1rem"></div>
    </section>

    <section class="card tabpanel" id="panel-playlists" hidden>
      <h2>Playlists</h2>
      <div class="grid g2">
        <div><label for="plResident">Resident</label><select id="plResident"></select></div>
        <div><label for="plName">Playlist name</label><input id="plName" placeholder="Sunday sing-along"></div>
      </div>
      <button class="btn small" id="createPl" style="margin-top:.4rem">Create playlist</button>
      <div id="suggestBox" style="margin-top:1rem"></div>
      <div id="playlistList" style="margin-top:1rem"></div>
    </section>

    <section class="card tabpanel" id="panel-player" hidden>
      <h2>Run a session</h2>
      <div id="playerSetup">
        <div class="grid g3">
          <div><label for="pvResident">Resident</label><select id="pvResident"></select></div>
          <div><label for="pvPlaylist">Playlist</label><select id="pvPlaylist"></select></div>
          <div><label for="pvMoodBefore">Mood before</label><select id="pvMoodBefore"><option value="">—</option><option>calm</option><option>neutral</option><option>agitated</option><option>withdrawn</option></select></div>
        </div>
        <button class="btn" id="startSession" style="margin-top:.6rem">Start session</button>
      </div>
      <div id="playerRun" hidden></div>
    </section>

    <section class="card tabpanel" id="panel-history" hidden>
      <h2>History &amp; insights</h2>
      <label for="hResident">Resident</label>
      <select id="hResident"></select>
      <div id="insightsBox" style="margin-top:.8rem"></div>
      <h2 style="margin-top:1.2rem;font-size:.92rem">Past sessions</h2>
      <div id="sessionList"></div>
    </section>
  </div>
</div>

<script>
const $=(id)=>document.getElementById(id);
let facilityId=localStorage.getItem("sing.facilityId")||null;
let residents=[],songs=[],playlists=[];
let currentSession=null,currentPlaylist=null,currentSongIndex=0;

function banner(msg,kind){const b=$("banner");b.textContent=msg;b.className="banner show "+(kind||"");if(kind==="ok")setTimeout(()=>{if(b.textContent===msg)b.className="banner";},3500);}
async function api(method,path,body){
  const res=await fetch("/api"+path,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const j=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error((j.error&&j.error.message)||("HTTP "+res.status));
  return j;
}
const esc=(s)=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const csv=(s)=>s.split(",").map(x=>x.trim()).filter(Boolean);

function renderSetup(){
  if(!facilityId){
    $("setupBody").innerHTML='<p class="hint">Name your facility to start building song libraries and resident profiles.</p>'+
      '<form id="facForm"><label for="facInput">Facility name</label><input id="facInput" required placeholder="Cardinal Memory Care">'+
      '<button class="btn" style="margin-top:.6rem">Create</button></form>';
    $("facForm").onsubmit=async(e)=>{e.preventDefault();const name=$("facInput").value.trim();if(!name)return;
      try{const fac=await api("POST","/facilities",{name});facilityId=fac.id;localStorage.setItem("sing.facilityId",facilityId);localStorage.setItem("sing.facName",fac.name);banner("Created "+fac.name,"ok");boot();}catch(err){banner(err.message,"err");}};
  }else{
    $("setupBody").innerHTML='<p class="hint">Working in <strong id="fn"></strong>. <button class="btn mut small" id="switchFac">Switch facility</button></p>';
    $("fn").textContent=localStorage.getItem("sing.facName")||facilityId;
    $("switchFac").onclick=()=>{localStorage.removeItem("sing.facilityId");localStorage.removeItem("sing.facName");facilityId=null;boot();};
  }
}

async function loadAll(){
  [residents,songs,playlists]=await Promise.all([
    api("GET","/residents?facilityId="+encodeURIComponent(facilityId)),
    api("GET","/songs?facilityId="+encodeURIComponent(facilityId)),
    api("GET","/playlists?facilityId="+encodeURIComponent(facilityId)),
  ]);
  renderResidents(); renderSongs(); refreshResidentSelects();
  renderPlaylists();
}

// --- Residents ---
function renderResidents(){
  const opts=(r)=>[...(r.preferredEras||[]),...(r.preferredGenres||[]),...(r.favoriteArtists||[])];
  $("residentList").innerHTML=residents.length?residents.map(r=>
    '<div class="row"><div class="t">'+esc(r.name)+'</div>'+
    (opts(r).length?'<div class="chips">'+opts(r).map(o=>'<span class="chip">'+esc(o)+'</span>').join("")+'</div>':'')+
    (r.notes?'<div class="s">'+esc(r.notes)+'</div>':'')+
    '</div>').join(""):'<div class="empty">No residents yet.</div>';
}
$("residentForm").onsubmit=async(e)=>{
  e.preventDefault();
  const name=$("rName").value.trim(); if(!name){banner("Name is required.","err");return;}
  try{
    await api("POST","/residents",{facilityId,name,preferredEras:csv($("rEras").value),preferredGenres:csv($("rGenres").value),favoriteArtists:csv($("rArtists").value),notes:$("rNotes").value.trim()||undefined});
    $("residentForm").reset(); await loadAll(); banner("Resident added","ok");
  }catch(err){banner(err.message,"err");}
};

// --- Song library ---
function renderSongs(){
  $("songList").innerHTML=songs.length?songs.map(s=>
    '<div class="row"><div class="t">'+esc(s.title)+(s.artist?' — '+esc(s.artist):'')+'</div>'+
    '<div class="s">'+(s.era?esc(s.era)+' · ':'')+'<span class="pill '+s.source+'">'+s.source.replace("_"," ")+'</span></div>'+
    (s.tags&&s.tags.length?'<div class="chips">'+s.tags.map(t=>'<span class="chip">'+esc(t)+'</span>').join("")+'</div>':'')+
    '</div>').join(""):'<div class="empty">No songs yet.</div>';
}
$("songForm").onsubmit=async(e)=>{
  e.preventDefault();
  const title=$("sTitle").value.trim(); if(!title){banner("Title is required.","err");return;}
  try{
    await api("POST","/songs",{facilityId,title,artist:$("sArtist").value.trim()||undefined,era:$("sEra").value.trim()||undefined,
      tags:csv($("sTags").value),audioUrl:$("sAudio").value.trim()||undefined,source:$("sSource").value,lyrics:$("sLyrics").value.trim()||undefined});
    $("songForm").reset(); await loadAll(); banner("Song added","ok");
  }catch(err){banner(err.message,"err");}
};

// --- Shared resident selects ---
function refreshResidentSelects(){
  const optsHtml=residents.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join("")||'<option value="">— add a resident first —</option>';
  ["plResident","pvResident","hResident"].forEach(id=>{const sel=$(id);const prev=sel.value;sel.innerHTML=optsHtml;if(prev)sel.value=prev;});
}

// --- Playlists ---
async function renderPlaylists(){
  const rid=$("plResident").value;
  const mine=playlists.filter(p=>!rid||p.residentId===rid);
  $("playlistList").innerHTML=mine.length?mine.map(p=>{
    const names=p.songIds.map(id=>{const s=songs.find(x=>x.id===id);return s?s.title:id;});
    return '<div class="row"><div class="t">'+esc(p.name)+'</div><div class="s">'+(names.length?esc(names.join(", ")):'no songs yet')+'</div>'+
      '<div style="margin-top:.4rem"><select class="inline" data-pl="'+p.id+'"><option value="">add song…</option>'+
      songs.map(s=>'<option value="'+s.id+'">'+esc(s.title)+'</option>').join("")+'</select></div></div>';
  }).join(""):'<div class="empty">No playlists for this resident yet.</div>';
  document.querySelectorAll('select[data-pl]').forEach(sel=>{
    sel.onchange=async()=>{if(!sel.value)return;try{await api("POST","/playlists/"+sel.dataset.pl+"/songs",{songId:sel.value});await loadAll();banner("Added to playlist","ok");}catch(err){banner(err.message,"err");}};
  });
}
async function renderSuggestions(){
  const rid=$("plResident").value;
  if(!rid){$("suggestBox").innerHTML="";return;}
  try{
    const sugg=await api("GET","/residents/"+rid+"/suggestions?limit=5");
    $("suggestBox").innerHTML='<h2 style="font-size:.9rem">Suggested from the library</h2>'+
      (sugg.length?'<div class="chips">'+sugg.map(s=>'<span class="chip">'+esc(s.title)+(s.artist?' — '+esc(s.artist):'')+'</span>').join("")+'</div>':
        '<p class="hint">No matches yet — add songs tagged with this resident\\'s era, genre, or favorite artists.</p>');
  }catch(err){banner(err.message,"err");}
}
$("plResident").onchange=()=>{renderPlaylists();renderSuggestions();};
$("createPl").onclick=async()=>{
  const residentId=$("plResident").value, name=$("plName").value.trim();
  if(!residentId){banner("Pick a resident first.","err");return;}
  if(!name){banner("Playlist needs a name.","err");return;}
  try{await api("POST","/playlists",{facilityId,residentId,name});$("plName").value="";await loadAll();banner("Playlist created","ok");}catch(err){banner(err.message,"err");}
};

// --- Player (the sing-along prompter) ---
function refreshPlaylistSelect(){
  const rid=$("pvResident").value;
  const mine=playlists.filter(p=>p.residentId===rid);
  $("pvPlaylist").innerHTML='<option value="">— ad hoc, no playlist —</option>'+mine.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join("");
}
$("pvResident").onchange=refreshPlaylistSelect;

$("startSession").onclick=async()=>{
  const residentId=$("pvResident").value;
  if(!residentId){banner("Pick a resident first.","err");return;}
  const playlistId=$("pvPlaylist").value||undefined;
  const moodBefore=$("pvMoodBefore").value||undefined;
  try{
    currentSession=await api("POST","/sessions",{facilityId,residentId,playlistId,moodBefore});
    currentPlaylist=playlistId?playlists.find(p=>p.id===playlistId):null;
    currentSongIndex=0;
    $("playerSetup").hidden=true; $("playerRun").hidden=false;
    renderPlayerStep();
  }catch(err){banner(err.message,"err");}
};

function currentPlaylistSongs(){
  if(!currentPlaylist)return [];
  return currentPlaylist.songIds.map(id=>songs.find(s=>s.id===id)).filter(Boolean);
}

function renderPlayerStep(){
  const list=currentPlaylistSongs();
  const el=$("playerRun");
  if(!list.length){
    el.innerHTML='<div class="prompter"><p class="hint">No playlist songs — pick any song to sing.</p>'+
      '<div class="grid g2"><div><label for="adhocSong">Song</label><select id="adhocSong">'+songs.map(s=>'<option value="'+s.id+'">'+esc(s.title)+'</option>').join("")+'</select></div></div>'+
      '<button class="btn small" id="logAdhoc" style="margin-top:.6rem">Log this song</button></div>'+
      '<div style="text-align:center;margin-top:1rem"><button class="btn ghost" id="finishSession">Finish session</button></div>';
    $("logAdhoc").onclick=()=>logSong($("adhocSong").value);
    $("finishSession").onclick=finishSession;
    return;
  }
  if(currentSongIndex>=list.length){
    el.innerHTML='<div class="prompter"><h2>All songs done</h2>'+
      '<label for="moodAfter">Mood after</label><select id="moodAfter" style="max-width:220px;margin:0 auto"><option value="">—</option><option>calm</option><option>neutral</option><option>agitated</option><option>withdrawn</option></select>'+
      '<div style="margin-top:.8rem"><button class="btn" id="finishSession">Complete session</button></div></div>';
    $("finishSession").onclick=finishSession;
    return;
  }
  const song=list[currentSongIndex];
  el.innerHTML='<div class="prompter">'+
    '<div class="progress">Song '+(currentSongIndex+1)+' of '+list.length+'</div>'+
    '<div class="song">'+esc(song.title)+'</div>'+
    (song.artist?'<div class="artist">'+esc(song.artist)+'</div>':'')+
    (song.audioUrl?'<p><a class="btn ghost small" href="'+esc(song.audioUrl)+'" target="_blank" rel="noopener">Open audio ▶</a></p>':'<p class="hint">No audio source on file — sing from the lyrics, or play from the facility\\'s own device.</p>')+
    (song.lyrics?'<div class="lyrics">'+esc(song.lyrics)+'</div>':'<p class="hint">No lyrics on file for this song.</p>')+
    '<div class="engage-grid">'+
      '<button class="btn good small" data-e="sang_along">Sang along</button>'+
      '<button class="btn small" data-e="listened_attentively">Listened attentively</button>'+
      '<button class="btn small" data-e="moved_or_tapped">Moved / tapped</button>'+
      '<button class="btn mut small" data-e="no_visible_response">No response</button>'+
      '<button class="btn crit small" data-e="agitated">Agitated</button>'+
    '</div></div>';
  el.querySelectorAll("button[data-e]").forEach(b=>{b.onclick=()=>logSong(song.id,b.dataset.e);});
}

async function logSong(songId,engagement){
  if(!songId){banner("Pick a song.","err");return;}
  try{
    currentSession=await api("POST","/sessions/"+currentSession.id+"/log",{songId,engagement:engagement||"listened_attentively"});
    currentSongIndex++;
    renderPlayerStep();
  }catch(err){banner(err.message,"err");}
}

async function finishSession(){
  const moodAfter=$("moodAfter")?$("moodAfter").value||undefined:undefined;
  try{
    await api("POST","/sessions/"+currentSession.id+"/complete",{moodAfter});
    banner("Session complete","ok");
    currentSession=null;currentPlaylist=null;currentSongIndex=0;
    $("playerSetup").hidden=false; $("playerRun").hidden=true; $("playerRun").innerHTML="";
    $("pvMoodBefore").value="";
  }catch(err){banner(err.message,"err");}
}

// --- History & insights ---
$("hResident").onchange=renderHistory;
async function renderHistory(){
  const rid=$("hResident").value;
  if(!rid){$("insightsBox").innerHTML="";$("sessionList").innerHTML="";return;}
  try{
    const [insights,sessions]=await Promise.all([
      api("GET","/residents/"+rid+"/insights"),
      api("GET","/sessions?facilityId="+encodeURIComponent(facilityId)+"&residentId="+encodeURIComponent(rid)),
    ]);
    $("insightsBox").innerHTML=insights.length?insights.map(i=>{
      const cls=i.averageEngagement>0?"pos":i.averageEngagement<0?"neg":"";
      return '<div class="insight-row"><span>'+esc(i.songTitle)+' <span class="muted">('+i.timesPlayed+'x)</span></span><span class="score '+cls+'">'+i.averageEngagement.toFixed(1)+'</span></div>';
    }).join(""):'<p class="hint">Complete a few sessions to see which songs work best.</p>';
    $("sessionList").innerHTML=sessions.length?sessions.map(s=>
      '<div class="row"><div class="t">'+new Date(s.startedAt).toLocaleString()+' — <span class="pill '+(s.status==='completed'?'public_domain':'facility_provided')+'">'+s.status+'</span></div>'+
      '<div class="s">'+(s.moodBefore?'mood before: '+s.moodBefore+' · ':'')+(s.moodAfter?'mood after: '+s.moodAfter+' · ':'')+s.entries.length+' song(s) logged</div></div>'
    ).join(""):'<div class="empty">No sessions yet.</div>';
  }catch(err){banner(err.message,"err");}
}

// --- Tabs ---
document.querySelectorAll(".tab").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tabpanel").forEach(p=>p.hidden=true);
    btn.classList.add("active");
    $("panel-"+btn.dataset.tab).hidden=false;
    if(btn.dataset.tab==="playlists")renderSuggestions();
    if(btn.dataset.tab==="player")refreshPlaylistSelect();
    if(btn.dataset.tab==="history")renderHistory();
  };
});

$("themeBtn").onclick=()=>{const c=document.documentElement.getAttribute("data-theme");const n=c==="dark"?"light":c==="light"?"":"dark";if(n)document.documentElement.setAttribute("data-theme",n);else document.documentElement.removeAttribute("data-theme");};

async function boot(){
  renderSetup();
  const on=!!facilityId;
  $("mainArea").hidden=!on;
  $("facName").textContent = on ? "" : "— set up your facility below";
  if(!on)return;
  try{
    await loadAll();
    document.querySelector('.tab[data-tab="residents"]').classList.add("active");
    $("panel-residents").hidden=false;
  }catch(err){ banner(err.message,"err"); }
}
boot();
</script>
</body>
</html>`;
