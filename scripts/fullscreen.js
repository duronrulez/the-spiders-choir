// fullscreen.js
// Simple fullscreen toggle script

(function(){
  
  // Wire optional UI button if present
  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('fullscreen-toggle');

    if(btn){
      btn.addEventListener('click', (e)=>{
        e.preventDefault();
        
        document.querySelector('html').requestFullscreen().catch(err=>{
          console.error('Fullscreen request failed:', err);
        });
      });
    }
  });
})();