// puzzle.js
// Simple melody player that uses pre-defined audio files (in ./sounds/)
// Exposes window.__puzzle with methods: start(), stop(), isPlaying(), playNote(index)

(function(){
  const soundBase = 'sounds/';
  // Define note files here (these should exist in sounds/ folder)
  const notes = {
    'c': 'puzzle-note-c.mp3',
    'd': 'puzzle-note-d.mp3',
    'eb': 'puzzle-note-eb.mp3',
    'g': 'puzzle-note-g.mp3',
    'ab': 'puzzle-note-ab.mp3'
  };

  // Melody sequence: [noteName, durationMs]
  // duration is used for scheduling the next note (rest included if needed)
  const melody = [
    ['c', 800], ['eb', 800], ['d', 800], ['g', 800], ['ab', 800], ['c', 1000]
  ];

  const audioPool = {}; // cached Audio objects by filename
  let playTimer = null;
  let currentIndex = 0;
  let playing = false;
  let loop = false;

  function preloadAll(){
    Object.values(notes).forEach(fn => {
      if(!audioPool[fn]){
        try{
          const a = new Audio(soundBase + fn);
          a.preload = 'auto';
          audioPool[fn] = a;
        }catch(e){
          console.warn('Failed to create Audio for', fn, e);
        }
      }
    });
  }

  function playNoteAtIndex(i){
    if(!melody[i]) return;
    const [name, dur] = melody[i];
    const file = notes[name];
    if(!file){ console.warn('Unknown note', name); scheduleNext(dur); return; }

    const audio = audioPool[file] || (audioPool[file] = new Audio(soundBase + file));
    // reset and play
    try{
      audio.currentTime = 0;
      const p = audio.play();
      if(p && p.catch) p.catch(()=>{});
    }catch(e){ /* ignore play errors */ }

    scheduleNext(dur);
  }

  function scheduleNext(dur){
    clearTimeout(playTimer);
    playTimer = setTimeout(()=>{
      currentIndex++;
      if(currentIndex >= melody.length){
        if(loop){ currentIndex = 0; playNoteAtIndex(currentIndex); }
        else { playing = false; currentIndex = 0; if(typeof onComplete === 'function') onComplete(); }
      } else {
        playNoteAtIndex(currentIndex);
      }
    }, dur);
  }

  let onComplete = null;

  function start(opts){
    if(playing) return;
    opts = opts || {};
    loop = !!opts.loop;
    currentIndex = typeof opts.startIndex === 'number' ? opts.startIndex : 0;
    onComplete = typeof opts.onComplete === 'function' ? opts.onComplete : null;
    preloadAll();
    playing = true;
    playNoteAtIndex(currentIndex);
  }

  function stop(){
    clearTimeout(playTimer);
    playTimer = null;
    // stop all playing audio
    Object.values(audioPool).forEach(a=>{
      try{ a.pause(); a.currentTime = 0; }catch(e){}
    });
    playing = false;
    currentIndex = 0;
  }

  function isPlaying(){ return playing; }

  function playNote(index){
    index = Math.max(0, Math.min(melody.length-1, index|0));
    stop();
    currentIndex = index;
    playing = true;
    playNoteAtIndex(currentIndex);
  }

  // expose API
  window.__puzzle = {
    start,
    stop,
    isPlaying,
    playNote,
    _melody: melody,
    _notes: notes
  };

  // Preload on script load so playback is ready when the user triggers it
  preloadAll();
  
  // Wire optional UI button if present
  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('puzzle-toggle');
    function updateButton(){
      if(!btn) return;
      const playingNow = isPlaying();
      btn.setAttribute('aria-pressed', playingNow ? 'true' : 'false');
      btn.textContent = playingNow ? '🎵 Puzzle: On' : '🎵 Puzzle: Off';
    }

    if(btn){
      updateButton();
      btn.addEventListener('click', (e)=>{
        e.preventDefault();
        if(isPlaying()){
          stop();
          updateButton();
        } else {
          start({ loop: false, onComplete: () => { updateButton(); } });
          updateButton();
        }
      });
    }
  });
})();