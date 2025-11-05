(function(){
  const img = document.getElementById('forest-img');
  if(!img) return;

  function adjust(){
    try{
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      // If the image intrinsic width is smaller than the viewport width, avoid upscaling.
      if(iw > 0 && iw < vw){
        // Use contain so image fits without upscaling and is centered
        img.style.width = 'auto';
        img.style.height = '100vh';
        img.style.objectFit = 'contain';
        img.style.position = 'relative';
        img.style.left = '50%';
        img.style.transform = 'translateX(-50%)';
        // mark that the image is centered using translateX so animations can preserve it
        img.classList.add('contain-mode');
      } else {
        // Use cover to fill and crop as before
        img.style.width = '100vw';
        img.style.height = '100vh';
        img.style.objectFit = 'cover';
        img.style.position = '';
        img.style.left = '';
        img.style.transform = '';
        img.classList.remove('contain-mode');
      }
    }catch(e){ /* ignore */ }
  }

  img.addEventListener('load', adjust);
  window.addEventListener('resize', adjust);
  // run once if already loaded
  if(img.complete) setTimeout(adjust, 20);
})();