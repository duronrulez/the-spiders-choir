/* lightning.js
   Externalized lightning + thunder logic extracted from index.html.
   - Preloads thunder files in ./sounds/
   - Triggers randomized lightning strikes and plays a random thunder with delay
   - Schedules a 2s fadeout at the track midpoint (when available) or after 15s
*/
(function(){
  // Simple lightning effect: toggles a full-page flash and a brief image "strike".
  const flash = document.getElementById('flash');
  const img = document.getElementById('forest-img');

  // preload thunder sounds (expects files in ./sounds/)
  const thunderFiles = [
    'sounds/thunder1.mp3',
    'sounds/thunder2.mp3',
    'sounds/thunder3.mp3'
  ];
  const thunderAudios = thunderFiles.map(src => {
    try{
      const a = new Audio(src);
      a.preload = 'auto';
      a.volume = 0.55; // reasonable default
      return a;
    }catch(e){
      return null;
    }
  }).filter(Boolean);

  function doStrike(){
    const duration = 90 + Math.floor(Math.random() * 130); // ~90-220ms (subtler)
    // single quick flash
    flash.classList.add('flash-on');
    if(img) img.classList.add('strike');

    // remove after duration (plus a tiny buffer)
    setTimeout(()=>{
      flash.classList.remove('flash-on');
    }, duration);
    setTimeout(()=>{
      if(img) img.classList.remove('strike');
    }, duration + 80);

    // schedule thunder after a short, randomized delay (simulate distance)
    playThunder();
  }

  function playThunder(){
    if(!thunderAudios.length) return;
    const chosen = thunderAudios[Math.floor(Math.random() * thunderAudios.length)];
    // delay between flash and thunder in ms (0.6s - 2.2s)
    const delay = 100 + Math.random() * 800;
    setTimeout(()=>{
      try{
        // restore initial volume if we changed it previously
        if(typeof chosen._initialVolume === 'undefined') chosen._initialVolume = chosen.volume ?? 0.55;
        chosen.volume = chosen._initialVolume;

        // clear any previous fade timers/intervals
        if(chosen._fadeTimer){ clearTimeout(chosen._fadeTimer); chosen._fadeTimer = null; }
        if(chosen._fadeInterval){ clearInterval(chosen._fadeInterval); chosen._fadeInterval = null; }

        chosen.currentTime = 0;
        const p = chosen.play();
        if(p && p.catch) p.catch(()=>{});

        // schedule fade: prefer midpoint of track if available, otherwise 15s after start
        const scheduleFade = () => {
          // fade settings
          const fadeMs = 2000; // fade time
          const startVol = (typeof chosen._initialVolume === 'number') ? chosen._initialVolume : chosen.volume || 0.55;
          const steps = Math.max(6, Math.ceil(fadeMs / 60));
          // clear any existing interval
          if(chosen._fadeInterval){ clearInterval(chosen._fadeInterval); chosen._fadeInterval = null; }
          let step = 0;
          chosen._fadeInterval = setInterval(()=>{
            step++;
            const t = step / steps;
            const newVol = Math.max(0, startVol * (1 - t));
            chosen.volume = newVol;
            if(step >= steps){
              clearInterval(chosen._fadeInterval);
              chosen._fadeInterval = null;
            }
          }, fadeMs / steps);
        };

        const scheduleBasedOnDuration = () => {
          let fadeStartMs = 15000; // fallback
          if(isFinite(chosen.duration) && chosen.duration > 0){
            // start fade at midpoint of the track
            fadeStartMs = (chosen.duration * 1000) / 2;
          }
          // ensure fadeStartMs non-negative
          fadeStartMs = Math.max(0, fadeStartMs);
          // if fadeStartMs is very small (short tracks), start fade after 1s instead
          if(fadeStartMs < 1000) fadeStartMs = Math.min(1000, fadeStartMs);

          // schedule fade timer (store so we can clear if needed)
          if(chosen._fadeTimer){ clearTimeout(chosen._fadeTimer); }
          chosen._fadeTimer = setTimeout(()=>{
            chosen._fadeTimer = null;
            scheduleFade();
          }, fadeStartMs);
        };

        // If duration is already known, schedule immediately; otherwise wait for metadata, with a 15s fallback
        if(isFinite(chosen.duration) && chosen.duration > 0){
          scheduleBasedOnDuration();
        } else {
          const onMeta = () => {
            chosen.removeEventListener('loadedmetadata', onMeta);
            // clear any fallback timer if set
            if(chosen._fadeTimer){ clearTimeout(chosen._fadeTimer); chosen._fadeTimer = null; }
            scheduleBasedOnDuration();
          };
          chosen.addEventListener('loadedmetadata', onMeta);
          // fallback: if metadata never arrives, schedule based on 15s
          if(chosen._fadeTimer) clearTimeout(chosen._fadeTimer);
          chosen._fadeTimer = setTimeout(()=>{
            chosen._fadeTimer = null;
            scheduleFade();
          }, 15000);
        }

        // cleanup on end so intervals/timers are removed and volume restored
        const onEnd = () => {
          if(chosen._fadeTimer){ clearTimeout(chosen._fadeTimer); chosen._fadeTimer = null; }
          if(chosen._fadeInterval){ clearInterval(chosen._fadeInterval); chosen._fadeInterval = null; }
          try{ chosen.volume = chosen._initialVolume ?? 0.55; }catch(e){}
          chosen.removeEventListener('ended', onEnd);
        };
        chosen.addEventListener('ended', onEnd);

      }catch(e){/* ignore playback errors */}
    }, delay);
  }

  function randomLightning(){
    // sometimes double-strike for realism
    doStrike();
    if(Math.random() < 0.12){
      setTimeout(doStrike, 120 + Math.random() * 200);
    }
    scheduleNext();
  }

  function scheduleNext(){
    // schedule next between ~10s and ~60s (rarer, less intrusive)
    const next = 10000 + Math.random() * 60000;
    console.log('Next lightning in', Math.round(next/1000), 's');
    setTimeout(randomLightning, next);
  }

  // start after a short randomized delay so it doesn't flash immediately on load
  setTimeout(scheduleNext, 800 + Math.random() * 1600);

  // Ambient rain support (uses Web Audio API for gapless looping; falls back to HTMLAudio)
  const rainSrc = 'sounds/forest-rain.mp3';
  let rainPlaying = false;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let rainBuffer = null;
  let rainSource = null;
  let rainGain = null;
  const rainTargetVolume = 0.18;

  // fallback HTMLAudio (kept for environments without Web Audio)
  let rainFallback = null;

  async function initRain(){
    if(audioCtx && rainBuffer) return;
    if(!AudioCtx){
      // no Web Audio, prepare HTMLAudio fallback
      if(rainFallback) return;
      try{ rainFallback = new Audio(rainSrc); rainFallback.loop = true; rainFallback.preload = 'auto'; rainFallback.volume = 0; }catch(e){ rainFallback = null; }
      return;
    }

    if(!audioCtx) audioCtx = new AudioCtx();
    try{
      const resp = await fetch(rainSrc);
      const ab = await resp.arrayBuffer();
      rainBuffer = await audioCtx.decodeAudioData(ab.slice(0));
    }catch(e){
      // decoding failed, fall back
      rainBuffer = null;
      if(!rainFallback){ try{ rainFallback = new Audio(rainSrc); rainFallback.loop = true; rainFallback.preload = 'auto'; rainFallback.volume = 0; }catch(e){ rainFallback = null; } }
    }
  }

  async function startRain(){
    await initRain();
    // Web Audio path
    if(rainBuffer && audioCtx){
      try{
        if(audioCtx.state === 'suspended'){
          // resume on user gesture or attempt
          audioCtx.resume().catch(()=>{});
        }
        // stop existing source if any
        if(rainSource){ try{ rainSource.stop(); }catch(e){}; rainSource.disconnect(); rainSource = null; }
        rainGain = audioCtx.createGain();
        rainGain.gain.setValueAtTime(0, audioCtx.currentTime);
        rainGain.connect(audioCtx.destination);

        rainSource = audioCtx.createBufferSource();
        rainSource.buffer = rainBuffer;
        rainSource.loop = true;
        rainSource.connect(rainGain);
        rainSource.start(0);

        // fade in to target over 1.5s
        const now = audioCtx.currentTime;
        rainGain.gain.cancelScheduledValues(now);
        rainGain.gain.setValueAtTime(0, now);
        rainGain.gain.linearRampToValueAtTime(rainTargetVolume, now + 1.5);

        rainPlaying = true;
        updateRainButton();
        return Promise.resolve();
      }catch(e){ /* fall through to fallback */ }
    }

    // fallback HTMLAudio
    if(!rainFallback){ try{ rainFallback = new Audio(rainSrc); rainFallback.loop = true; rainFallback.preload = 'auto'; rainFallback.volume = 0; }catch(e){ rainFallback = null; } }
    if(rainFallback){
      let p;
      try{ p = rainFallback.play(); }catch(e){ p = Promise.reject(e); }
      rainPlaying = true; updateRainButton();
      if(p && typeof p.then === 'function'){
        p.then(()=>{
          // fade in with intervals
          const steps = 15; const dur = 1500; let s = 0;
          if(rainFallback._fadeInterval) clearInterval(rainFallback._fadeInterval);
          rainFallback._fadeInterval = setInterval(()=>{
            s++; rainFallback.volume = Math.min(rainTargetVolume, (s/steps) * rainTargetVolume);
            if(s>=steps){ clearInterval(rainFallback._fadeInterval); rainFallback._fadeInterval = null; }
          }, dur/steps);
        }).catch(()=>{ rainPlaying = false; updateRainButton(); });
      }
      return p;
    }
    return Promise.resolve(false);
  }

  function stopRain(){
    // Web Audio path
    if(rainSource && rainGain && audioCtx){
      try{
        const now = audioCtx.currentTime;
        rainGain.gain.cancelScheduledValues(now);
        rainGain.gain.setValueAtTime(rainGain.gain.value, now);
        rainGain.gain.linearRampToValueAtTime(0, now + 0.7);
        // stop after fade
        setTimeout(()=>{
          try{ rainSource.stop(); }catch(e){}
          try{ rainSource.disconnect(); }catch(e){}
          rainSource = null;
          try{ rainGain.disconnect(); }catch(e){}
          rainGain = null;
          rainPlaying = false; updateRainButton();
        }, 800);
      }catch(e){ rainPlaying = false; updateRainButton(); }
      return;
    }

    // fallback HTMLAudio
    if(rainFallback){
      if(rainFallback._fadeInterval) clearInterval(rainFallback._fadeInterval);
      const steps = 8; const dur = 700; let s = 0; const start = rainFallback.volume || rainTargetVolume;
      rainFallback._fadeInterval = setInterval(()=>{
        s++; rainFallback.volume = Math.max(0, start * (1 - s/steps));
        if(s>=steps){ clearInterval(rainFallback._fadeInterval); rainFallback._fadeInterval = null; try{ rainFallback.pause(); }catch(e){}; rainPlaying = false; updateRainButton(); }
      }, dur/steps);
    }
  }

  function toggleRain(){
    if(rainPlaying) stopRain(); else startRain();
  }

  function updateRainButton(){
    try{
      const btn = document.getElementById('rain-toggle');
      if(!btn) return;
      btn.setAttribute('aria-pressed', rainPlaying ? 'true' : 'false');
      btn.textContent = rainPlaying ? '🌧️ Rain: On' : '🌧️ Rain: Off';
    }catch(e){}
  }

  // attempt to autoplay rain; if blocked, user can toggle via button/console
  try{ startRain(); }catch(e){}

  // wire optional UI button if present
  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('rain-toggle');
    if(btn){
      updateRainButton();
      btn.addEventListener('click', (e)=>{ e.preventDefault(); toggleRain(); });
    }
  });

  // expose a manual trigger for testing from the console: window.__lightning.strike()
  window.__lightning = Object.assign(window.__lightning || {}, { strike: doStrike, playThunder, rain: { start: startRain, stop: stopRain, toggle: toggleRain, isPlaying: ()=>rainPlaying } });
})();
