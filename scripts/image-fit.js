(function(){
  const img = document.getElementById('forest-img');
  if(!img) return;

  function adjust(){
    try{
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      
      // Use contain mode to show full image with black bars (letterboxing/pillarboxing)
      // instead of cropping the image
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.position = 'absolute';
      img.style.left = '50%';
      img.style.top = '50%';
      img.style.transform = 'translate(-50%, -50%)';
      img.classList.add('contain-mode');
      
      // Force hardware acceleration on tablets
      img.style.webkitTransform = 'translate(-50%, -50%) translateZ(0)';
      img.style.backfaceVisibility = 'hidden';
      img.style.webkitBackfaceVisibility = 'hidden';
      
    }catch(e){ 
      console.error('Image adjust error:', e);
    }
  }

  img.addEventListener('load', adjust);
  window.addEventListener('resize', adjust);
  window.addEventListener('orientationchange', adjust);
  
  // run once if already loaded
  if(img.complete) setTimeout(adjust, 20);
  // Also run after a delay to ensure proper rendering on tablets
  setTimeout(adjust, 100);
})();