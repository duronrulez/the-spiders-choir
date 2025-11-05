// Spider eyes management
const eyePairs = document.querySelectorAll('.eye-pair');
let eyeIntervals = [];

// Define safe points for eye placement [x, y, scale] as percentages
// scale is relative to base size (1.0 = 100%, 0.5 = 50%, 1.5 = 150%)

const safePoints = [
  // closest to screen
  [6.2, 66.1, 1],  
  [8.3, 46.5, 1],
  [16.9, 39.1, 1],  
  [8.3, 29.8, 1], 
  [13.6, 26.8, 1],  
  [16.7, 71, 1],   
  [8.3, 86.7, 1], 
  [69.1, 87.4, 1],  
  [80.4, 83.8, 1],  
  [87.7, 80.4, 1],   
  [94.8, 87.7, 1],   
  [98.2, 77.0, 1], 
  [90.2, 72.1, 1],  
  [85.8, 65.5, 1], 
  [84.1, 41.3, 1],   
  [78.4, 37.1, 1],  
  [83.0, 27.7, 1], 
  [80.4, 17.7, 1],  

  // middle depth
  [25, 71.9, 0.8],  
  [24.1, 67.6, 0.8],  
  [24.8, 50, 0.8],  
  [25.6, 42.7, 0.8],  
  [30, 44, 0.8],  
  [28.7, 29.3, 0.8],  
  [62.5, 66.7, 0.8],  
  [67.9, 66.5, 0.8],  
  [64.1, 53.6, 0.8],  
  [66, 48.1, 0.8],  
  [92, 48.4, 0.8],  
  [95.7, 63.6, 0.8],  
  [90.9, 66.4, 0.8],  

  // farthest back
  [36.6, 65.8, 0.5],  
  [37.9, 56, 0.5],  
  [40.0, 53.9, 0.5],  
  [58.7, 65.4, 0.5],  
  [55.2, 64.6, 0.5],  
  [57.4, 57.8, 0.5],  
  [51.9, 64.2, 0.5],  
  [53.2, 58.9, 0.5],  
  [45.2, 63.7, 0.5],  
];

// Click coordinate tracking
function handleClick(e) {
  const rect = e.target.getBoundingClientRect();
  const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
  const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
  const xPixels = e.clientX - rect.left;
  const yPixels = e.clientY - rect.top;
  console.log(`Click coordinates: ${xPixels.toFixed(0)}px,${yPixels.toFixed(0)}px (${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%)`);
}

// Add click listener to the image container
document.querySelector('.image-wrap').addEventListener('click', handleClick);

function randomInRange(min, max){
  return min + Math.random() * (max - min);
}

function positionEye(eye){
  // pick a random safe point and add some randomness
  const point = safePoints[Math.floor(Math.random() * safePoints.length)];
  const x = point[0] + randomInRange(-2, 2); // ±2% variation
  const y = point[1] + randomInRange(-2, 2);
  const scale = point[2] * randomInRange(0.95, 1.05); // ±5% scale variation
  
  eye.style.left = x + '%';
  eye.style.top = y + '%';
  eye.style.transform = `scale(${scale})`;
}

function showEye(eye){
  positionEye(eye);
  eye.classList.add('visible');
}

function hideEye(eye){
  eye.classList.remove('visible');
}

function blinkEye(eye){
  if(!eye.classList.contains('visible')) return;
  eye.classList.add('blink');
  setTimeout(()=> eye.classList.remove('blink'), 180);
}

function startEyeCycle(){
  // clear any existing intervals
  eyeIntervals.forEach(clearInterval);
  eyeIntervals = [];

  // randomly show 1-3 pairs of eyes
  const numEyes = 1 + Math.floor(Math.random() * 3);
  eyePairs.forEach((eye, i) => {
    if(i < numEyes) showEye(eye);
    else hideEye(eye);
  });

  // schedule random blinks while eyes are visible
  const blinkInterval = setInterval(() => {
    eyePairs.forEach(eye => {
      if(eye.classList.contains('visible') && Math.random() < 0.1) {
        blinkEye(eye);
      }
    });
  }, 2000 + Math.random() * 3000);
  eyeIntervals.push(blinkInterval);

  // occasionally reposition visible eyes
  const repositionInterval = setInterval(() => {
    if(Math.random() < 0.2) { // 20% chance every 8-15s
      eyePairs.forEach(eye => {
        if(eye.classList.contains('visible')) {
          positionEye(eye);
        }
      });
    }
  }, 8000 + Math.random() * 7000);
  eyeIntervals.push(repositionInterval);

  // Schedule fade out after 4-7 seconds
  setTimeout(() => {
    eyePairs.forEach(eye => {
      if(eye.classList.contains('visible')) {
        eye.classList.add('fade-out');
        setTimeout(() => {
          hideEye(eye);
          eye.classList.remove('fade-out');
        }, 2000); // matches CSS transition duration
      }
    });

    // Schedule next appearance after 5-15 seconds from fade out
    setTimeout(() => {
      startEyeCycle();
    }, 5000 + Math.random() * 10000);
  }, 4000 + Math.random() * 3000);
}

// start the eye cycle after a short delay
setTimeout(startEyeCycle, 2000 + Math.random() * 3000);

// expose functions for external use
window.__spiderEyes = {
  start: startEyeCycle
};