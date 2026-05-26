// Web Audio API Context and SoundManager
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let bgMusicInterval;
let isMuted = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    SoundManager.startMusic();
}

const SoundManager = {
    playTone: (freq, type, duration, vol = 0.1) => {
        if (isMuted || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    playPad: (freq, duration, vol = 0.02) => {
        if (isMuted || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + duration * 0.2);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime + duration * 0.8);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    flip: () => SoundManager.playTone(800, 'sine', 0.1, 0.02),
    match: () => {
        SoundManager.playTone(523.25, 'sine', 0.1, 0.03); // C5
        setTimeout(() => SoundManager.playTone(659.25, 'sine', 0.2, 0.03), 100); // E5
        setTimeout(() => SoundManager.playTone(783.99, 'sine', 0.3, 0.03), 200); // G5
    },
    mismatch: () => {
        SoundManager.playTone(200, 'sawtooth', 0.15, 0.02);
        setTimeout(() => SoundManager.playTone(150, 'sawtooth', 0.25, 0.02), 150);
    },
    win: () => {
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, i) => {
            setTimeout(() => SoundManager.playTone(freq, 'square', 0.2, 0.03), i * 150);
        });
    },
    startMusic: () => {
        if (bgMusicInterval || isMuted) return;
        
        // Soft constant ambient space tune (Am - F - C - G progression)
        const chords = [
            [220.00, 261.63, 329.63], // Am
            [174.61, 220.00, 261.63], // F
            [261.63, 329.63, 392.00], // C
            [196.00, 246.94, 293.66]  // G
        ];
        
        let measure = 0;
        
        const playChord = () => {
            if (isMuted || !audioCtx) return;
            const currentChord = chords[measure % chords.length];
            
            // Play chord notes (4.2s duration to overlap smoothly with next 4s interval)
            currentChord.forEach(freq => {
                SoundManager.playPad(freq, 4.2, 0.025); 
            });
            
            measure++;
        };

        // Start immediately
        playChord();
        
        // Loop every 4 seconds
        bgMusicInterval = setInterval(playChord, 4000);
    },
    toggleMute: () => {
        isMuted = !isMuted;
        const muteBtn = document.getElementById('mute-btn');
        if (isMuted) {
            if (bgMusicInterval) {
                clearInterval(bgMusicInterval);
                bgMusicInterval = null;
            }
            muteBtn.textContent = '🔈 Off';
            muteBtn.style.opacity = '0.5';
        } else {
            initAudio(); // Also resumes if needed
            muteBtn.textContent = '🔊 On';
            muteBtn.style.opacity = '1';
        }
    }
};

const EMOJIS = ['🚀', '👽', '🛸', '🛰️', '🌌', '🌠', '🪐', '🌑'];
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = null;
let secondsElapsed = 0;
let isLocked = false;

// High Scores
let bestTime = localStorage.getItem('memoryBestTime');
let bestMoves = localStorage.getItem('memoryBestMoves');

// DOM Elements
const grid = document.getElementById('card-grid');
const movesEl = document.getElementById('moves-stat');
const pairsEl = document.getElementById('pairs-stat');
const timeEl = document.getElementById('time-stat');
const restartBtn = document.getElementById('restart-btn');
const winScreen = document.getElementById('win-screen');
const playAgainBtn = document.getElementById('play-again-btn');
const muteBtn = document.getElementById('mute-btn');
const bestMovesEl = document.getElementById('best-moves');
const bestTimeEl = document.getElementById('best-time');
const starsContainer = document.getElementById('stars-container');
const particlesContainer = document.getElementById('particles-container');
const winTitle = winScreen.querySelector('h2');

// Fisher-Yates Shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateBestScoresUI() {
    bestMovesEl.textContent = `Best Moves: ${bestMoves ? bestMoves : '--'}`;
    bestTimeEl.textContent = `Best Time: ${bestTime ? bestTime + 's' : '--'}`;
}

function checkHighScores() {
    let newRecord = false;
    if (!bestTime || secondsElapsed < parseInt(bestTime)) {
        bestTime = secondsElapsed;
        localStorage.setItem('memoryBestTime', bestTime);
        newRecord = true;
    }
    if (!bestMoves || moves < parseInt(bestMoves)) {
        bestMoves = moves;
        localStorage.setItem('memoryBestMoves', bestMoves);
        newRecord = true;
    }
    updateBestScoresUI();
    return newRecord;
}

function createStars() {
    starsContainer.innerHTML = '';
    
    // Create static twinkling stars
    for (let i = 0; i < 70; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        star.style.top = `${Math.random() * 100}vh`;
        star.style.left = `${Math.random() * 100}vw`;
        
        const size = Math.random() * 3 + 1; // 1px to 4px
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        star.style.setProperty('--base-opacity', Math.random() * 0.5 + 0.2);
        star.style.setProperty('--duration', `${Math.random() * 3 + 2}s`);
        star.style.animationDelay = `${Math.random() * 5}s`;
        
        starsContainer.appendChild(star);
    }

    // Create shooting stars
    for (let i = 0; i < 8; i++) {
        const shootingStar = document.createElement('div');
        shootingStar.classList.add('shooting-star');
        
        // Start mostly from top-right quadrant
        shootingStar.style.top = `${Math.random() * 50 - 20}vh`; 
        shootingStar.style.left = `${Math.random() * 80 + 20}vw`; 
        
        shootingStar.style.setProperty('--duration', `${Math.random() * 3 + 4}s`);
        shootingStar.style.animationDelay = `${Math.random() * 10}s`;
        
        starsContainer.appendChild(shootingStar);
    }
}

function createParticles() {
    particlesContainer.innerHTML = '';
    const colors = ['#9D4EDD', '#00F5D4', '#FFF'];
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Center origin
        p.style.left = '50%';
        p.style.top = '50%';
        
        // Random target translation in a circle
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 300 + 50;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        // Use calc to shift 50% back and add translation
        p.style.setProperty('--tx', `calc(-50% + ${tx}px)`);
        p.style.setProperty('--ty', `calc(-50% + ${ty}px)`);
        
        particlesContainer.appendChild(p);
    }
}

function init() {
    // Reset state variables
    clearInterval(timer);
    timer = null;
    secondsElapsed = 0;
    moves = 0;
    matchedPairs = 0;
    flippedCards = [];
    isLocked = false;

    // Update UI
    movesEl.textContent = `Moves: ${moves}`;
    pairsEl.textContent = `Pairs: ${matchedPairs}/8`;
    timeEl.textContent = `Time: 0s`;
    winScreen.style.display = 'none';
    winTitle.textContent = 'You Won!';
    grid.innerHTML = '';
    particlesContainer.innerHTML = '';
    
    updateBestScoresUI();
    createStars();

    // Create cards array (16 total) and shuffle with Fisher-Yates
    cards = [...EMOJIS, ...EMOJIS];
    shuffleArray(cards);
    
    // Map to objects for easier handling
    cards = cards.map((emoji, index) => ({ id: index, emoji }));

    renderCards();
}

function renderCards() {
    cards.forEach((card) => {
        const cardEl = document.createElement('div');
        cardEl.classList.add('card');
        cardEl.dataset.id = card.id;
        
        // Random tilt angle between -20deg and 20deg for the drop animation
        const randomTilt = Math.floor(Math.random() * 41) - 20;
        cardEl.style.setProperty('--tilt', `${randomTilt}deg`);
        
        cardEl.innerHTML = `
            <div class="card-inner">
                <div class="card-back">?</div>
                <div class="card-front">${card.emoji}</div>
            </div>
        `;
        
        cardEl.addEventListener('click', () => {
            initAudio(); // Required to bypass browser autoplay policies
            handleCardClick(cardEl, card);
        });
        grid.appendChild(cardEl);
    });
}

function handleCardClick(cardEl, cardData) {
    // Skip if locked, already flipped, or matched
    if (isLocked) return;
    if (cardEl.classList.contains('flipped')) return;
    if (cardEl.classList.contains('matched')) return;

    // Start timer on first card click
    if (!timer) {
        timer = setInterval(() => {
            secondsElapsed++;
            timeEl.textContent = `Time: ${secondsElapsed}s`;
        }, 1000);
    }

    cardEl.classList.add('flipped');
    SoundManager.flip(); // Play flip sound
    
    flippedCards.push({ el: cardEl, data: cardData });

    if (flippedCards.length === 2) {
        moves++;
        movesEl.textContent = `Moves: ${moves}`;
        checkForMatch();
    }
}

function checkForMatch() {
    isLocked = true; // Use locked = true during the check to prevent extra clicks
    const [card1, card2] = flippedCards;

    if (card1.data.emoji === card2.data.emoji) {
        // Match found
        setTimeout(() => {
            card1.el.classList.add('matched');
            card2.el.classList.add('matched');
            SoundManager.match(); // Play match sound
            
            matchedPairs++;
            pairsEl.textContent = `Pairs: ${matchedPairs}/8`;
            flippedCards = [];
            isLocked = false;
            
            // Show #win-screen when matched === 8
            if (matchedPairs === 8) {
                handleWin();
            }
        }, 300);
    } else {
        // No match - after 900ms remove .flipped from both
        SoundManager.mismatch(); // Play mismatch sound
        setTimeout(() => {
            card1.el.classList.remove('flipped');
            card2.el.classList.remove('flipped');
            flippedCards = [];
            isLocked = false;
        }, 900);
    }
}

function handleWin() {
    clearInterval(timer);
    setTimeout(() => {
        SoundManager.win(); // Play win sound
        createParticles(); // Explode particles
        
        const newRecord = checkHighScores();
        if (newRecord) {
            winTitle.textContent = 'New Record! 🏆';
        } else {
            winTitle.textContent = 'You Won!';
        }
        
        winScreen.style.display = 'flex';
    }, 500);
}

// Ensure audio context is started on first interaction with buttons too
restartBtn.addEventListener('click', () => {
    initAudio();
    init();
});
playAgainBtn.addEventListener('click', () => {
    initAudio();
    init();
});
muteBtn.addEventListener('click', () => {
    // Need to make sure audioCtx is created if user hits mute first
    if (!audioCtx && !isMuted) initAudio();
    SoundManager.toggleMute();
});

// Start game
init();
