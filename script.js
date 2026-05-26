const EMOJIS = ['🚀', '👽', '🛸', '🛰️', '🌌', '🌠', '🪐', '🌑'];
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = null;
let secondsElapsed = 0;
let isLocked = false;

// DOM Elements
const grid = document.getElementById('card-grid');
const movesEl = document.getElementById('moves-stat');
const pairsEl = document.getElementById('pairs-stat');
const timeEl = document.getElementById('time-stat');
const restartBtn = document.getElementById('restart-btn');
const winScreen = document.getElementById('win-screen');
const playAgainBtn = document.getElementById('play-again-btn');

// Fisher-Yates Shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
    grid.innerHTML = '';

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
        
        cardEl.addEventListener('click', () => handleCardClick(cardEl, card));
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
        winScreen.style.display = 'flex';
    }, 500);
}

// The restart button calls init()
restartBtn.addEventListener('click', init);
playAgainBtn.addEventListener('click', init);

// Start game
init();
