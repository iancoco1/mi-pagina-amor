const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// -------------------
// AUDIO
// -------------------
const audioNormal = document.getElementById('miAudio'); // pista normal
audioNormal.volume = 0.5;
audioNormal.loop = true;

const audioSecret = new Audio("THEWKND.mp3"); // pista secreta
audioSecret.volume = 0.5;
audioSecret.loop = true;

function playAudio() {
    audioNormal.play().catch(e => console.log("Autoplay bloqueado:", e));
    window.removeEventListener('click', playAudio);
    window.removeEventListener('touchstart', playAudio);
}

window.addEventListener('click', playAudio);
window.addEventListener('touchstart', playAudio);

// -------------------
// DPI y Escala
// -------------------
let dpr = window.devicePixelRatio || 1;

// Funciones de color
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}
function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
function interpolateColor(color1, color2, factor) {
    const [r1, g1, b1] = hexToRgb(color1);
    const [r2, g2, b2] = hexToRgb(color2);
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (g2 - g1));
    return rgbToHex(r, g, b);
}

// -------------------
// Variables de animación
// -------------------
const stars = [];
const shootingStars = [];
const fallingElements = [];

// Versión normal
let phrases = [
    "Te Amo Wendy",
    "MI CHINITA HERMOSA",
    "Eres preciosa mi amor",
    "FELIZ PRIMER AÑO MI AMOR",
    "Me encantas demasiado mi vida",
    "te amo más que a nada mi amor"
];
let images = [
    'https://png.pngtree.com/png-vector/20220619/ourmid/pngtree-sparkling-star-vector-icon-glitter-star-shape-png-image_5228522.png'
];
let heartImages = [
    '1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png'
];
let backgroundColors = ["#0a0a23", "#0c0004ff"];

// Versión secreta
const secretPhrases = [
     "Encontraste este secreto 🤭",
     "En mi mundo solo eres tú 🌎❤️",
     "Cada día te admiro más 🌟",
     "26 de septiembre de 2024 📅",
     "Estoy muy orgulloso de ti 🥰",
     "Nuestro amor es infinito ♾️💖",
     "Me pierdo en tus abrazos y en tus besos 🤗",
     "Cada día contigo es mágico ✨",
     "Tú y yo contra el mundo 💪🌍",
     "Mi corazón es tuyo 💘"
];
const secretHeartImages = [
    '11.png','12.png','13.png','14.png','15.png','16.png',
    '17.png','18.png','19.png','20.png','21.png','22.png','23.png'
];
const secretBackgroundColors = ["#FF8000", "#FF9933"];

const textColorsCycle = ['#FFD700','#FFA500','#ADFF2F','#00FFFF','#FF69B4','#FFFFFF','#9932CC'];
let currentColorIndex = 0;
let nextColorIndex = 1;
let transitionProgress = 0;
const transitionSpeed = 0.005;

let cameraX = 0;
let cameraY = 0;
let zoomLevel = 1;
const focalLength = 300;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// -------------------
// Easter egg
// -------------------
let tapCount = 0;
let secretMode = false;

function triggerSecretMode() {
    secretMode = true;
    // Cambiar frases, imágenes, colores
    phrases = [...secretPhrases];
    heartImages = [...secretHeartImages];
    backgroundColors = [...secretBackgroundColors];

    // Cambiar música
    audioNormal.pause();
    audioNormal.currentTime = 0;
    audioSecret.play().catch(e => console.log("Autoplay bloqueado (secreto):", e));
}

// -------------------
// Canvas
// -------------------
function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.imageSmoothingEnabled = true;

    stars.length = 0;
    for (let i = 0; i < 300; i++) {
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * 1.5 + 0.5,
            alpha: Math.random(),
            delta: (Math.random() * 0.02) + 0.005
        });
    }
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    gradient.addColorStop(0, backgroundColors[0]);
    gradient.addColorStop(1, backgroundColors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawStars() {
    stars.forEach(star => {
        star.alpha += star.delta;
        if (star.alpha <= 0 || star.alpha >= 1) star.delta *= -1;
        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function createShootingStar() {
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight / 2;
    shootingStars.push({
        x: startX,
        y: startY,
        length: Math.random() * 300 + 100,
        speed: Math.random() * 4 + 2,
        angle: Math.PI / 4,
        opacity: 1
    });
}

function drawShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        const endX = s.x - Math.cos(s.angle) * s.length;
        const endY = s.y - Math.sin(s.angle) * s.length;
        const gradient = ctx.createLinearGradient(s.x, s.y, endX, endY);
        gradient.addColorStop(0, `rgba(255,255,255,${s.opacity})`);
        gradient.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= 0.01;
        if (s.opacity <= 0) shootingStars.splice(i,1);
    }
}

function createFallingElement() {
    const rand = Math.random();
    let type;
    if (rand < 0.6) type = 'phrase';
    else if (rand < 0.8) type = 'image';
    else type = 'heart';

    const minZ = focalLength * 1.5;
    const maxZ = focalLength * 5;
    const z = minZ + Math.random() * (maxZ - minZ);

    const worldPlaneWidth = (window.innerWidth / focalLength) * maxZ;
    const worldPlaneHeight = (window.innerHeight / focalLength) * maxZ;
    const bufferFactor = 1.1;
    const spawnRangeX = worldPlaneWidth * bufferFactor;
    const spawnRangeY = worldPlaneHeight * bufferFactor;

    const x = ((Math.random() + Math.random() - 1) * 0.5) * spawnRangeX;
    const y = ((Math.random() + Math.random() - 1) * 0.5) * spawnRangeY;

    let content, baseSize;
    if (type === 'phrase') {
        content = phrases[Math.floor(Math.random() * phrases.length)];
        baseSize = 30;
    } else if (type === 'heart') {
        content = new Image();
        content.src = heartImages[Math.floor(Math.random() * heartImages.length)];
        baseSize = 50;
    } else {
        content = new Image();
        content.src = images[Math.floor(Math.random() * images.length)];
        baseSize = 50;
    }

    fallingElements.push({type, content, x, y, z, baseSize, speedZ: Math.random()*2+0.5});
}

function drawFallingElements() {
    const currentTextColor = interpolateColor(textColorsCycle[currentColorIndex], textColorsCycle[nextColorIndex], transitionProgress);
    for (let i = fallingElements.length - 1; i >= 0; i--) {
        const el = fallingElements[i];
        el.z -= el.speedZ * zoomLevel;
        if (el.z <= 0) { fallingElements.splice(i,1); createFallingElement(); continue; }

        const perspectiveScale = focalLength / el.z;
        const minDisplaySize = 5;
        let size = el.baseSize * perspectiveScale * zoomLevel;
        size = Math.max(minDisplaySize, size);

        const opacity = Math.max(0, Math.min(1, perspectiveScale));
        const displayX = (el.x - cameraX) * perspectiveScale + window.innerWidth/2;
        const displayY = (el.y - cameraY) * perspectiveScale + window.innerHeight/2;

        ctx.save();
        ctx.globalAlpha = opacity;

        if (el.type === 'phrase') {
            ctx.fillStyle = currentTextColor;
            ctx.font = `${Math.max(10,size)}px 'Dancing Script', cursive`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const blurAmount = Math.max(0.5, Math.min(5, size/10));
            ctx.shadowColor = currentTextColor;
            ctx.shadowBlur = blurAmount;
            ctx.fillText(el.content, displayX, displayY);
            ctx.shadowBlur = 0;
        } else if ((el.type === 'image' || el.type === 'heart') && el.content.complete && el.content.naturalHeight !== 0) {
            ctx.drawImage(el.content, displayX-size/2, displayY-size/2, size, size);
        }

        ctx.restore();

        if ((displayX + size/2 < 0 || displayX - size/2 > window.innerWidth ||
            displayY + size/2 < 0 || displayY - size/2 > window.innerHeight) && el.z > focalLength) {
            fallingElements.splice(i,1);
            createFallingElement();
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    drawBackground();
    drawStars();
    drawShootingStars();
    drawFallingElements();

    transitionProgress += transitionSpeed;
    if (transitionProgress >= 1) {
        transitionProgress = 0;
        currentColorIndex = nextColorIndex;
        nextColorIndex = (nextColorIndex+1) % textColorsCycle.length;
    }
}

// -------------------
// Eventos Mouse y Touch
// -------------------
canvas.addEventListener('wheel', (e)=>{e.preventDefault(); zoomLevel += (e.deltaY<0?0.1:-0.1); zoomLevel=Math.max(0.1,Math.min(zoomLevel,5));},{passive:false});
canvas.addEventListener('mousedown',(e)=>{isDragging=true; lastMouseX=e.clientX; lastMouseY=e.clientY; canvas.style.cursor='grabbing';});
canvas.addEventListener('mousemove',(e)=>{if(!isDragging) return; const dx=e.clientX-lastMouseX; const dy=e.clientY-lastMouseY; cameraX-=dx/zoomLevel; cameraY-=dy/zoomLevel; lastMouseX=e.clientX; lastMouseY=e.clientY;});
canvas.addEventListener('mouseup',()=>{isDragging=false; canvas.style.cursor='grab';});
canvas.addEventListener('mouseleave',()=>{isDragging=false; canvas.style.cursor='default';});

let touchStartDist = 0;
canvas.addEventListener('touchstart',(e)=>{ 
    if(e.touches.length===1){
        isDragging=true; lastMouseX=e.touches[0].clientX; lastMouseY=e.touches[0].clientY;
        tapCount++;
        if (tapCount >= 12 && !secretMode) triggerSecretMode();
    } else if(e.touches.length===2){
        const dx=e.touches[0].clientX-e.touches[1].clientX; 
        const dy=e.touches[0].clientY-e.touches[1].clientY; 
        touchStartDist=Math.sqrt(dx*dx+dy*dy);
    }
}, {passive:false});

canvas.addEventListener('touchmove',(e)=>{
    if(e.touches.length===1&&isDragging){
        const dx=e.touches[0].clientX-lastMouseX; 
        const dy=e.touches[0].clientY-lastMouseY; 
        cameraX-=dx/zoomLevel; cameraY-=dy/zoomLevel; 
        lastMouseX=e.touches[0].clientX; lastMouseY=e.touches[0].clientY;
    }else if(e.touches.length===2){
        const dx=e.touches[0].clientX-e.touches[1].clientX; 
        const dy=e.touches[0].clientY-e.touches[1].clientY; 
        const newDist=Math.sqrt(dx*dx+dy*dy); 
        if(touchStartDist>0){
            const scaleAmount=(newDist-touchStartDist)*0.005; 
            zoomLevel=Math.max(0.1,Math.min(zoomLevel+scaleAmount,5));
        } 
        touchStartDist=newDist;
    }
}, {passive:false});

canvas.addEventListener('touchend',()=>{isDragging=false; touchStartDist=0;});

window.addEventListener('resize', resizeCanvas);

// -------------------
// Inicialización
// -------------------
document.fonts.ready.then(()=>{
    resizeCanvas();
    animate();
    setInterval(createShootingStar,500);
    for(let i=0;i<50;i++) createFallingElement();
    setInterval(createFallingElement,500);
});

document.body.style.margin='0';
document.body.style.padding='0';
document.documentElement.style.margin='0';
document.documentElement.style.padding='0';
document.body.style.overflow='hidden';
canvas.style.cursor='grab';