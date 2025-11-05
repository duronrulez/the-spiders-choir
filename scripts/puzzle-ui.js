// puzzle-ui.js
// Adds clickable polygons over the image. On click:
// - play the corresponding note
// - apply a brief distortion to the background image
// - record tap sequence; when 6 taps have been made, compare to melody and log success/failure

(function(){
  const container = document.querySelector('.image-wrap');
  if(!container) return;

  // Define the clickable areas as polygons with absolute coordinates
  const polygons = [
    // Example polygons - replace with your actual coordinates
    [[343,599], [360,688], [299,779], [325, 835], [428, 700], [388, 570]], // First area
    [[409,326], [603,448], [723,330], [758,352],  [688,433], [604,488], [481,453],[383,361]], // Second area
    [[1256,983], [1352,886], [1393,700], [1347,560], [1395,548], [1427,780], [1381,921], [1302,1015]], // Third area
    [[1673,850], [1744,719], [1862,540], [1905,563], [1819,709], [1713,891]], // Fourth area
    [[1622,352], [1750,117], [1854,15], [1905,40], [1800,164], [1666,374]]  // Fifth area
  ];

  // Note names in the same order as the puzzle's note map
  const noteOrder = ['c','d','eb','g','ab','c'];

  // Access the notes map and melody from the puzzle script (fallbacks provided)
  const notesMap = (window.__puzzle && window.__puzzle._notes) ? window.__puzzle._notes : {
    c: 'puzzle-note-c.mp3', d: 'puzzle-note-d.mp3', eb: 'puzzle-note-eb.mp3', 
    g: 'puzzle-note-g.mp3', ab: 'puzzle-note-ab.mp3'
  };
  const melodyNames = (window.__puzzle && window.__puzzle._melody) ? 
    window.__puzzle._melody.map(n=>n[0]) : ['c','eb','d','g','ab','c'];
  const soundBase = 'sounds/';

  // Create SVG overlay that will match the image size
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'puzzle-sprites');
  container.appendChild(svg);

  // Track taps
  let taps = [];

  const img = document.getElementById('forest-img');

  // Helper: update SVG size to match image
  function updateSVGSize(){
    if(!img) return;
    const imgRect = img.getBoundingClientRect();
    svg.setAttribute('width', imgRect.width);
    svg.setAttribute('height', imgRect.height);
    // Set viewBox to match image dimensions for 1:1 coordinate mapping
    svg.setAttribute('viewBox', `0 0 ${imgRect.width} ${imgRect.height}`);
    // Position SVG to exactly cover the image
    svg.style.position = 'absolute';
    svg.style.left = (imgRect.left - container.getBoundingClientRect().left) + 'px';
    svg.style.top = (imgRect.top - container.getBoundingClientRect().top) + 'px';
  }

  // Update SVG size on resize and when the image loads
  window.addEventListener('resize', updateSVGSize);
  window.addEventListener('orientationchange', updateSVGSize);
  if(img){
    img.addEventListener('load', updateSVGSize);
    // if already loaded
    if(img.complete) setTimeout(updateSVGSize, 20);
  }

  function playNoteFile(noteName){
    // console.log('Playing note:', noteName);
    const file = notesMap[noteName];
    if(!file) {
      console.warn('No file found for note:', noteName);
      return;
    }

    try {
      const a = new Audio(soundBase + file);
      a.volume = 0.9;
      
      // Play once loaded
      a.addEventListener('canplaythrough', () => {
        a.play().catch(e => console.error('Play failed:', e));
      });

      // Clean up when done
      a.addEventListener('ended', () => {
        a.remove();
      });

      // Start loading
      a.load();
    } catch(e) {
      console.error('Audio creation failed:', e);
    }
  }

  // Play an arbitrary feedback sound file from the sounds folder
  function playFeedback(filename){
    if(!filename) return;
    try{
      const a = new Audio(soundBase + filename);
      a.volume = 0.95;
      a.play().catch(e => {
        // try to load then play if immediate play fails
        try{ a.load(); a.play().catch(()=>{}); }catch(_){}
      });
      a.addEventListener('ended', ()=>{ try{ a.remove(); }catch(e){} });
    }catch(e){ console.error('Feedback audio error:', e); }
  }

  function triggerDistort(){
    const img = document.getElementById('forest-img');
    if(!img) return;
    img.classList.add('distort');
    setTimeout(()=> img.classList.remove('distort'), 420);
  }

  function onSpriteTap(noteName){
    playNoteFile(noteName);
    triggerDistort();
    taps.push(noteName);
    console.log('Puzzle tap:', noteName, '(', taps.length, '/', melodyNames.length, ')');

    if(taps.length >= melodyNames.length){
      // Compare sequence
      const ok = taps.join(',') === melodyNames.join(',');
      if(ok) {
        console.log('Puzzle solved! Sequence matched.');
        // Call the puzzle.js API if available. Use a safe check because puzzle.js
        // may not be loaded in some contexts (or may be blocked by autoplay policies).
        setTimeout(() => {
          if(window.__puzzle && typeof window.__puzzle.start === 'function'){
            window.__puzzle.start({ loop: false, onComplete: () => { setTimeout(() => playFeedback('puzzle-success.mp3'), 800); } });
          } else {
            console.warn('window.__puzzle.start is not available — playing success feedback only.');
            setTimeout(() => playFeedback('puzzle-success.mp3'), 800);
          }
        }, 1000);
      } else {
        console.log('Puzzle failed. Sequence did not match. Sequence was:', taps.join(', '), '. Expected:', melodyNames.join(', '));
        // play failure sound
        setTimeout(() => playFeedback('puzzle-failed.mp3'), 800);
      }
      // reset taps for next attempt
      taps = [];
    }
  }

  // Create polygon elements in the SVG
  polygons.forEach((points, i) => {
    const noteName = noteOrder[i % noteOrder.length];
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', points.map(p => p.join(',')).join(' '));
    poly.setAttribute('class', 'puzzle-sprite');
    poly.setAttribute('role', 'button');
    poly.setAttribute('tabindex', '0');
    poly.setAttribute('title', 'Puzzle note ' + (i+1));
    poly.setAttribute('aria-label', 'Puzzle note ' + (i+1));
    poly.dataset.note = noteName;
    // Give each polygon a subtle, staggered pulse to indicate interactivity.
    // We manage the animation cycle with pauses between glows
    try {
      const startAnimation = (element) => {
        const dur = 2 + Math.random() * 3; // 2-5s for the glow animation
        element.style.animationName = 'puzzle-pulse';
        element.style.animationDuration = dur + 's';
        element.style.animationIterationCount = '1';
        element.style.animationTimingFunction = 'ease-in-out';
        element.style.animationPlayState = 'running';
        
        // When animation ends, wait then restart
        const restartAfterDelay = () => {
          element.style.animationName = 'none';
          const restPeriod = 10000 + (Math.random() * 5000); // 10-15s rest
          setTimeout(() => startAnimation(element), restPeriod);
        };
        
        element.addEventListener('animationend', restartAfterDelay, { once: true });
      };
      
      // Initial staggered start
      const initialDelay = 60 + (i * 2) + (Math.random() * .8); // stagger + small jitter
      setTimeout(() => startAnimation(poly), initialDelay * 1000);
      
    } catch(e) { /* ignore if styling fails */ }

    // Handle both click and keyboard activation
    poly.addEventListener('click', (e)=>{
      e.stopPropagation();
      onSpriteTap(noteName);
    });
    poly.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        onSpriteTap(noteName);
      }
    });

    svg.appendChild(poly);
  });

  // initial sizing
  setTimeout(updateSVGSize, 30);

})();