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
    [[253,469], [270,558], [209,649], [235, 705], [338, 570], [298, 440]], // First area
    [[279,226], [473,348], [593,230], [628,252],  [558,333], [474,388], [351,353],[253,261]], // Second area
    [[946,803], [1042,706], [1083,520], [1037,380], [1085,368], [1117,600], [1071,741], [992,835]], // Third area
    [[1263,700], [1334,569], [1452,390], [1495,413], [1409,559], [1303,741]], // Fourth area
    [[1252,292], [1380,47], [1384,-35], [1535,-20], [1430,104], [1296,314]]  // Fifth area
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

  // Get progress pip elements
  const progressPips = document.querySelectorAll('.progress-pip');

  // Progress pip management
  function updateProgressPips(){
    progressPips.forEach((pip, index) => {
      pip.classList.remove('filled', 'success', 'failure');
      if(index < taps.length){
        pip.classList.add('filled');
      }
    });
  }

  function showPuzzleSuccess(){
    progressPips.forEach(pip => {
      pip.classList.remove('filled', 'failure');
      pip.classList.add('success');
    });
  }

  function showPuzzleFailure(){
    progressPips.forEach(pip => {
      pip.classList.remove('filled', 'success');
      pip.classList.add('failure');
    });
    // Reset after animation
    setTimeout(() => {
      progressPips.forEach(pip => {
        pip.classList.remove('failure');
      });
    }, 1000);
  }

  const img = document.getElementById('forest-img');

  // Helper: update SVG size to match image
  function updateSVGSize(){
    if(!img) return;
    
    // Get the actual intrinsic image dimensions
    const IMAGE_WIDTH = img.naturalWidth || 1920;
    const IMAGE_HEIGHT = img.naturalHeight || 1080;
    
    // Get the img element's bounding box (this includes the whole element, not just visible image)
    const imgRect = img.getBoundingClientRect();
    
    // Calculate how the image is actually displayed with object-fit: contain
    const imgAspect = IMAGE_WIDTH / IMAGE_HEIGHT;
    const containerAspect = imgRect.width / imgRect.height;
    
    let actualWidth, actualHeight, offsetX, offsetY;
    
    if (containerAspect > imgAspect) {
      // Container is wider - image is constrained by height, black bars on sides
      actualHeight = imgRect.height;
      actualWidth = actualHeight * imgAspect;
      offsetX = (imgRect.width - actualWidth) / 2;
      offsetY = 0;
    } else {
      // Container is taller - image is constrained by width, black bars on top/bottom
      actualWidth = imgRect.width;
      actualHeight = actualWidth / imgAspect;
      offsetX = 0;
      offsetY = (imgRect.height - actualHeight) / 2;
    }
    
    // Debug logging
    // console.log('SVG Update:', {
      // imgElementSize: `${imgRect.width.toFixed(1)}x${imgRect.height.toFixed(1)}`,
      // actualImageSize: `${actualWidth.toFixed(1)}x${actualHeight.toFixed(1)}`,
      // offset: `${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}`,
      // imgElementPos: `${imgRect.left.toFixed(1)}, ${imgRect.top.toFixed(1)}`
    // });
    
    // Set viewBox to the intrinsic image dimensions
    // Polygon coordinates are in this coordinate space
    svg.setAttribute('viewBox', `0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`);
    
    // CRITICAL: preserveAspectRatio='none' makes the viewBox stretch to fill the SVG exactly
    // Since we're sizing the SVG to match the displayed image's aspect ratio, this works perfectly
    svg.setAttribute('preserveAspectRatio', 'none');
    
    // Position SVG relative to the viewport (not the img element)
    // We need to account for both the img element position AND the internal offset
    const absoluteLeft = imgRect.left + offsetX;
    const absoluteTop = imgRect.top + offsetY;
    
    svg.style.position = 'fixed';
    svg.style.left = absoluteLeft + 'px';
    svg.style.top = absoluteTop + 'px';
    svg.style.width = actualWidth + 'px';
    svg.style.height = actualHeight + 'px';
    svg.style.pointerEvents = 'none';
    
    // Remove attribute dimensions to avoid conflicts
    svg.removeAttribute('width');
    svg.removeAttribute('height');
  }

  // Update SVG size on resize and when the image loads
  window.addEventListener('resize', updateSVGSize);
  window.addEventListener('orientationchange', updateSVGSize);
  if(img){
    img.addEventListener('load', updateSVGSize);
    // if already loaded, wait a bit for image-fit.js to run first
    if(img.complete){
      setTimeout(updateSVGSize, 50);
      setTimeout(updateSVGSize, 150);
    }
  }

  // Also update when the window loads (ensures all scripts have run)
  window.addEventListener('load', () => {
    setTimeout(updateSVGSize, 50);
  });

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
    
    // Update progress pips
    updateProgressPips();
    
    console.log('Puzzle tap:', noteName, '(', taps.length, '/', melodyNames.length, ')');

    if(taps.length >= melodyNames.length){
      // Compare sequence
      const ok = taps.join(',') === melodyNames.join(',');
      if(ok) {
        console.log('Puzzle solved! Sequence matched.');
        showPuzzleSuccess();
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
        showPuzzleFailure();
        // play failure sound
        setTimeout(() => playFeedback('puzzle-failed.mp3'), 800);
      }
      // reset taps for next attempt
      setTimeout(() => {
        taps = [];
        updateProgressPips();
      }, ok ? 2000 : 1200); // Wait longer for success to show green pips
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

  // initial sizing - call multiple times to ensure it catches after image-fit.js runs
  setTimeout(updateSVGSize, 30);
  setTimeout(updateSVGSize, 100);
  setTimeout(updateSVGSize, 200);

})();