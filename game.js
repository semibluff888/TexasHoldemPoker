// ===== Texas Hold'em Poker Game =====

// Game Constants
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
// Hand ranks are evaluated using numeric scores in evaluateFiveCards()

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const STARTING_CHIPS = 1000;

// ===== Sound Manager =====
const SoundManager = {
    // Sound URLs from free sources (Mixkit - royalty-free)
    sounds: {
        cardDeal: 'SOUND/card_deal.mp3',
        cardFlip: 'SOUND/card_deal.mp3',
        chips: 'SOUND/chips.mp3',
        check: 'SOUND/check.mp3',
        fold: 'SOUND/fold.mp3',
        win: 'SOUND/win.mp3',
        // win: 'SOUND/win2.wav',
        yourTurn: 'SOUND/ding.mp3',
        allIn: 'SOUND/all in.mp3'
    },

    // Background music (lofi/chill)
    musicUrl: 'SOUND/Jazz at Mladost Club - Blue Monk.mp3',

    // Audio elements cache
    audioCache: {},
    musicElement: null,

    // State
    musicEnabled: true,
    sfxEnabled: true,
    volume: 0.5,

    // Initialize the sound manager
    init() {
        // Pre-load sounds
        for (const [name, url] of Object.entries(this.sounds)) {
            this.audioCache[name] = new Audio(url);
            this.audioCache[name].volume = this.volume;
        }

        // Setup background music
        this.musicElement = new Audio(this.musicUrl);
        this.musicElement.loop = true;
        this.musicElement.volume = this.volume * 0.5; // Music volume factor

        // Setup UI controls
        this.setupControls();
    },

    // Setup UI control event listeners
    setupControls() {
        const musicBtn = document.getElementById('btn-music');
        const sfxBtn = document.getElementById('btn-sfx');
        const volumeSlider = document.getElementById('volume-slider');

        if (musicBtn) {
            musicBtn.addEventListener('click', () => this.toggleMusic());
        }

        if (sfxBtn) {
            sfxBtn.addEventListener('click', () => this.toggleSfx());
        }

        if (volumeSlider) {
            volumeSlider.value = this.volume * 100;
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }
    },

    // Toggle background music
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        const btn = document.getElementById('btn-music');

        if (this.musicEnabled) {
            btn.classList.remove('muted');
            btn.textContent = '🎵';
            // Restore volume (music was playing silently)
            if (this.musicElement) {
                this.musicElement.volume = this.volume * 0.5;
            }
        } else {
            btn.classList.add('muted');
            btn.textContent = '🎵';
            // Mute by setting volume to 0 (music keeps playing)
            if (this.musicElement) {
                this.musicElement.volume = 0;
            }
        }
    },

    // Toggle sound effects
    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        const btn = document.getElementById('btn-sfx');

        if (this.sfxEnabled) {
            btn.classList.remove('muted');
            btn.textContent = '🔊';
        } else {
            btn.classList.add('muted');
            btn.textContent = '🔇';
        }
    },

    // Set volume (0-1)
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));

        // Update all cached audio volumes
        for (const audio of Object.values(this.audioCache)) {
            audio.volume = this.volume;
        }

        // Update music volume (only if music is enabled)
        if (this.musicElement && this.musicEnabled) {
            this.musicElement.volume = this.volume * 0.5;
        }
    },

    // Play a sound effect
    play(soundName) {
        if (!this.sfxEnabled) return;

        const audio = this.audioCache[soundName];
        if (audio) {
            // Clone and play to allow overlapping sounds
            const clone = audio.cloneNode();
            clone.volume = this.volume;
            clone.play().catch(() => { }); // Ignore autoplay errors
        }
    },

    // Start background music
    playMusic() {
        if (!this.musicEnabled || !this.musicElement) return;

        this.musicElement.play().catch(() => {
            // Autoplay blocked - will try again on next user interaction
            console.log('Music autoplay blocked - click to enable');
        });
    },

    // Stop background music (fully stops and resets - used for game over, etc.)
    stopMusic() {
        if (this.musicElement) {
            this.musicElement.pause();
            this.musicElement.currentTime = 0;
        }
    },

    // Convenience methods for specific sounds
    playCardDeal() { this.play('cardDeal'); },
    playCardFlip() { this.play('cardFlip'); },
    playChips() { this.play('chips'); },
    playCheck() { this.play('check'); },
    playFold() { this.play('fold'); },
    playWin() { this.play('win'); },
    playYourTurn() { this.play('yourTurn'); },
    playAllIn() { this.play('allIn'); }
};

// Game State
let gameState = {
    deck: [],
    players: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    phase: 'idle', // idle, preflop, flop, turn, river, showdown
    minRaise: BIG_BLIND,
    displayedCommunityCards: 0
};

// Hand History State
let handNumber = 0; // Current hand number
let handHistories = []; // Array to store history for each hand
let currentViewingHand = 0; // Which hand history we're currently viewing
let currentGameId = 0; // Game ID to track and cancel previous games

// Initialize Players
function initPlayers() {
    gameState.players = [
        { id: 0, name: 'You', chips: STARTING_CHIPS, cards: [], bet: 0, totalContribution: 0, folded: false, isAI: false, allIn: false },
        { id: 1, name: 'AI Player 1', chips: STARTING_CHIPS, cards: [], bet: 0, totalContribution: 0, folded: false, isAI: true, allIn: false },
        { id: 2, name: 'AI Player 2', chips: STARTING_CHIPS, cards: [], bet: 0, totalContribution: 0, folded: false, isAI: true, allIn: false },
        { id: 3, name: 'AI Player 3', chips: STARTING_CHIPS, cards: [], bet: 0, totalContribution: 0, folded: false, isAI: true, allIn: false },
        { id: 4, name: 'AI Player 4', chips: STARTING_CHIPS, cards: [], bet: 0, totalContribution: 0, folded: false, isAI: true, allIn: false }
    ];
}

// Create and Shuffle Deck
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ suit, value });
        }
    }
    return shuffleDeck(deck);
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Deal Cards
function dealCard() {
    return gameState.deck.pop();
}

// Get dealing order (clockwise, starting after dealer, dealer last)
function getDealingOrder() {
    const order = [];
    const numPlayers = gameState.players.length;
    // Clockwise: 0 -> 1 -> 2 -> 3 -> 4 -> 0
    let currentIndex = (gameState.dealerIndex + 1) % numPlayers;
    for (let i = 0; i < numPlayers; i++) {
        const player = gameState.players[currentIndex];
        // Include all-in players (chips >= 0) - they still need cards dealt
        if (!player.folded && player.chips >= 0) {
            order.push(currentIndex);
        }
        currentIndex = (currentIndex + 1) % numPlayers;
    }
    return order;
}

// Deal hole cards with animation (async)
async function dealHoleCards(thisGameId) {
    const dealingOrder = getDealingOrder();

    // Show dealer animation
    showDealerAnimation(DEALER_GIF_PREFLOP);

    // Deal first card to each player
    for (const playerId of dealingOrder) {
        // Check if game was cancelled
        if (currentGameId !== thisGameId) {
            hideDealerAnimation();
            return;
        }

        const player = gameState.players[playerId];
        player.cards.push(dealCard());
        updatePlayerCardsAnimated(playerId);
        SoundManager.playCardDeal();
        await delay(200);
    }

    // Deal second card to each player
    for (const playerId of dealingOrder) {
        // Check if game was cancelled
        if (currentGameId !== thisGameId) {
            hideDealerAnimation();
            return;
        }

        const player = gameState.players[playerId];
        player.cards.push(dealCard());
        updatePlayerCardsAnimated(playerId);
        SoundManager.playCardDeal();
        await delay(200);
    }

    // Hide dealer animation
    hideDealerAnimation();
}

// Card Display
function getCardHTML(card, isHidden = false, animate = true) {
    const animClass = animate ? ' dealing' : '';
    if (isHidden) {
        return `<div class="card card-back${animClass}"></div>`;
    }
    const isRed = card.suit === '♥' || card.suit === '♦';
    return `
        <div class="card card-face ${isRed ? 'red' : 'black'}${animClass}">
            <span class="card-value">${card.value}</span>
            <span class="card-suit">${card.suit}</span>
        </div>
    `;
}

// Animate a card element from dealer gif position to its current position
function animateCardFromDealer(cardElement) {
    const dealerGif = document.getElementById('dealer-gif');
    if (!dealerGif || !cardElement) return;

    // Remove animation class temporarily
    cardElement.classList.remove('dealing');

    const dealerRect = dealerGif.getBoundingClientRect();
    const cardRect = cardElement.getBoundingClientRect();

    // Calculate offset from dealer to card destination
    const offsetX = dealerRect.left + dealerRect.width / 2 - cardRect.left - cardRect.width / 2;
    const offsetY = dealerRect.top + dealerRect.height / 2 - cardRect.top - cardRect.height / 2;

    // Set CSS custom properties for the animation
    cardElement.style.setProperty('--deal-start-x', `${offsetX}px`);
    cardElement.style.setProperty('--deal-start-y', `${offsetY}px`);

    // Force reflow to ensure properties are applied before animation
    cardElement.offsetHeight;

    // Re-add animation class to trigger animation
    cardElement.classList.add('dealing');
}

function updatePlayerCards(playerId, isHidden = false) {
    const player = gameState.players[playerId];
    const cardsContainer = document.getElementById(`cards-${playerId}`);

    if (player.cards.length === 0) {
        cardsContainer.innerHTML = `
            <div class="card card-placeholder"></div>
            <div class="card card-placeholder"></div>
        `;
        return;
    }

    const hidden = isHidden && player.isAI && gameState.phase !== 'showdown';
    cardsContainer.innerHTML = player.cards.map(card => getCardHTML(card, hidden, false)).join('');
}

// Update player cards with animation for the newly dealt card
function updatePlayerCardsAnimated(playerId) {
    const player = gameState.players[playerId];
    const cardsContainer = document.getElementById(`cards-${playerId}`);
    const hidden = player.isAI;

    let html = '';
    // Always show 2 card slots - placeholder underneath, card overlaid on top
    for (let i = 0; i < 2; i++) {
        if (i < player.cards.length) {
            // Only animate the last (newly dealt) card
            const shouldAnimate = (i === player.cards.length - 1);
            // Wrap in a container with placeholder underneath and card on top
            html += `<div class="card-slot">
                <div class="card card-placeholder"></div>
                ${getCardHTML(player.cards[i], hidden, shouldAnimate)}
            </div>`;
        } else {
            // Show just placeholder for undealt cards
            html += '<div class="card-slot"><div class="card card-placeholder"></div></div>';
        }
    }
    cardsContainer.innerHTML = html;

    // Set animation start position from dealer gif
    const dealingCard = cardsContainer.querySelector('.card.dealing');
    if (dealingCard) {
        animateCardFromDealer(dealingCard);
    }
}

function updateCommunityCards() {
    const container = document.getElementById('community-cards');
    let html = '';

    for (let i = 0; i < 5; i++) {
        if (i < gameState.communityCards.length) {
            // Only animate newly dealt cards
            const shouldAnimate = i >= gameState.displayedCommunityCards;
            // Wrap in card-slot with placeholder underneath and card on top
            html += `<div class="card-slot community-slot">
                <div class="card card-placeholder"></div>
                ${getCardHTML(gameState.communityCards[i], false, shouldAnimate)}
            </div>`;
        } else {
            html += '<div class="card-slot community-slot"><div class="card card-placeholder"></div></div>';
        }
    }

    container.innerHTML = html;

    // Set animation start position from dealer gif for community cards
    const dealingCards = container.querySelectorAll('.card.dealing');
    dealingCards.forEach(card => animateCardFromDealer(card));

    // Update the count of displayed cards
    gameState.displayedCommunityCards = gameState.communityCards.length;
}

// UI Updates
function updateUI() {
    // Update pot
    document.getElementById('pot-amount').textContent = `$${gameState.pot}`;
    // Show/hide pot chip based on pot amount
    const potChip = document.querySelector('.pot-chip');
    if (potChip) {
        potChip.style.display = gameState.pot > 0 ? 'block' : 'none';
    }

    // Update all players
    for (const player of gameState.players) {
        document.getElementById(`chips-${player.id}`).textContent = player.chips;

        const playerEl = document.getElementById(`player-${player.id}`);
        playerEl.classList.toggle('folded', player.folded);
        playerEl.classList.toggle('active', gameState.currentPlayerIndex === player.id && !player.folded);

        // Update dealer chip
        const dealerChip = document.getElementById(`dealer-${player.id}`);
        dealerChip.classList.toggle('visible', gameState.dealerIndex === player.id);

        updatePlayerCards(player.id, true);
        updateBetDisplay(player.id);
    }

    updateCommunityCards();
    updateControls();
}

function updateBetDisplay(playerId) {
    const player = gameState.players[playerId];
    const betDisplay = document.getElementById(`bet-${playerId}`);
    const betAmount = betDisplay.querySelector('.bet-amount');

    if (player.bet > 0) {
        betAmount.textContent = `$${player.bet}`;
        betDisplay.classList.add('visible');
    } else {
        betDisplay.classList.remove('visible');
    }
}

function updateControls() {
    const controls = document.getElementById('controls');
    const player = gameState.players[0];

    // Always show controls (remove hidden class)
    controls.classList.remove('hidden');

    // Determine if controls should be active (user's turn and can act)
    const isUserTurn = gameState.currentPlayerIndex === 0;
    const canAct = gameState.phase !== 'idle' &&
        gameState.phase !== 'showdown' &&
        !player.folded &&
        !player.allIn;
    const isActive = isUserTurn && canAct;

    // Toggle disabled state on controls container
    controls.classList.toggle('disabled', !isActive);
    // Toggle active state for shining effect when player's turn
    controls.classList.toggle('active', isActive);

    const callAmount = gameState.currentBet - player.bet;
    const canCheck = callAmount === 0;

    document.getElementById('btn-check').style.display = canCheck ? 'block' : 'none';
    document.getElementById('btn-call').style.display = canCheck ? 'none' : 'block';
    document.getElementById('call-amount').textContent = Math.min(callAmount, player.chips);

    // Raise slider
    const slider = document.getElementById('raise-slider');
    const minRaise = gameState.currentBet + gameState.minRaise;
    slider.min = minRaise;
    slider.max = player.chips + player.bet;
    slider.value = minRaise;
    document.getElementById('raise-amount').textContent = minRaise;

    // Disable all buttons if not active, otherwise check individual conditions
    const allButtons = controls.querySelectorAll('.btn');
    allButtons.forEach(btn => btn.disabled = !isActive);

    // Special case: disable raise if can't afford (even when active)
    if (isActive) {
        document.getElementById('btn-raise').disabled = player.chips <= callAmount;
    }

    // Disable slider when not active
    slider.disabled = !isActive;
}

function showAction(playerId, action, chipsBeforeAction = null) {
    const actionEl = document.getElementById(`action-${playerId}`);
    actionEl.textContent = action;
    actionEl.classList.add('visible');

    setTimeout(() => {
        actionEl.classList.remove('visible');
    }, 2000);

    // Log the action with player's chip amount before the action
    const player = gameState.players[playerId];
    const name = playerId === 0 ? 'You' : player.name;
    // Use provided chipsBeforeAction, or fallback to current chips (for fold/check)
    const chipAmount = chipsBeforeAction !== null ? chipsBeforeAction : player.chips;
    showMessage(`${name}($${chipAmount}): ${action}`);
}

// Helper to append log entry HTML to current hand's history
// If viewing past hand, save to memory; if viewing current hand, also append to DOM
function appendToCurrentHandHistory(entryHTML) {
    // Initialize current hand's history array if needed
    if (!handHistories[handNumber - 1]) {
        handHistories[handNumber - 1] = [];
    }

    // Always save to the current hand's history array
    handHistories[handNumber - 1].push(entryHTML);

    // Only update the DOM if viewing the current hand
    if (currentViewingHand === handNumber) {
        const history = document.getElementById('action-history');
        if (history) {
            history.insertAdjacentHTML('beforeend', entryHTML);
            history.scrollTop = history.scrollHeight;
        }
    }
}

function showMessage(message) {
    if (!message) return;

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
    const phase = (gameState.phase === 'idle' ? 'Start' : gameState.phase).toUpperCase();

    const entryHTML = `
        <div class="log-entry">
            <div class="log-time">
                <span>${time}</span>
                <span class="log-phase">${phase}</span>
            </div>
            <div class="log-content">${message}</div>
        </div>
    `;

    appendToCurrentHandHistory(entryHTML);
}

// Hand Evaluation
function getCardValue(value) {
    const valueMap = { 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return valueMap[value] || parseInt(value);
}

function evaluateHand(cards) {
    if (cards.length < 5) return { rank: 0, name: 'Incomplete', highCards: [], bestCards: [] };

    // Get all 5-card combinations
    const combinations = getCombinations(cards, 5);
    let bestHand = { rank: 0, name: 'High Card', highCards: [], score: 0, bestCards: [] };

    for (const combo of combinations) {
        const hand = evaluateFiveCards(combo);
        hand.bestCards = combo; // Store the actual 5-card combo
        if (hand.score > bestHand.score) {
            bestHand = hand;
        }
    }

    return bestHand;
}

function getCombinations(arr, size) {
    const result = [];

    function combine(start, combo) {
        if (combo.length === size) {
            result.push([...combo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            combine(i + 1, combo);
            combo.pop();
        }
    }

    combine(0, []);
    return result;
}

function evaluateFiveCards(cards) {
    const values = cards.map(c => getCardValue(c.value)).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);

    const valueCounts = {};
    for (const v of values) {
        valueCounts[v] = (valueCounts[v] || 0) + 1;
    }

    const counts = Object.values(valueCounts).sort((a, b) => b - a);
    const uniqueValues = [...new Set(values)].sort((a, b) => b - a);

    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = checkStraight(uniqueValues);
    const isAceLowStraight = JSON.stringify(uniqueValues) === JSON.stringify([14, 5, 4, 3, 2]);

    let rank, name, score;

    // Helper to get kickers (cards not part of the main hand)
    function getKickers(excludeValues) {
        return values.filter(v => !excludeValues.includes(v));
    }

    if (isFlush && isStraight && values[0] === 14 && values[1] === 13) {
        rank = 10; name = 'Royal Flush';
        score = 10000000;
    } else if (isFlush && (isStraight || isAceLowStraight)) {
        rank = 9; name = 'Straight Flush';
        score = 9000000 + (isAceLowStraight ? 5 : values[0]);
    } else if (counts[0] === 4) {
        rank = 8; name = 'Four of a Kind';
        const quadValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 4));
        const kicker = getKickers([quadValue])[0];
        // Score: quad value + kicker - use base-15 for lexicographic ordering
        score = 8000000 + quadValue * 15 + kicker;
    } else if (counts[0] === 3 && counts[1] === 2) {
        rank = 7; name = 'Full House';
        const tripValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 3));
        const pairValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 2));
        // No kickers in full house - trips then pair, use base-15
        score = 7000000 + tripValue * 15 + pairValue;
    } else if (isFlush) {
        rank = 6; name = 'Flush';
        // All 5 cards matter for flush comparison - use base-15 for lexicographic ordering
        // Max: 14*50625 + 14*3375 + 14*225 + 14*15 + 14 = 759,374 (under 1M)
        score = 6000000 + values[0] * 50625 + values[1] * 3375 + values[2] * 225 + values[3] * 15 + values[4];
    } else if (isStraight || isAceLowStraight) {
        rank = 5; name = 'Straight';
        // Only high card matters for straight
        score = 5000000 + (isAceLowStraight ? 5 : values[0]);
    } else if (counts[0] === 3) {
        rank = 4; name = 'Three of a Kind';
        const tripValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 3));
        const kickers = getKickers([tripValue]);
        // Score: trip value + 2 kickers - use base-15 for lexicographic ordering
        score = 4000000 + tripValue * 3375 + kickers[0] * 225 + kickers[1] * 15;
    } else if (counts[0] === 2 && counts[1] === 2) {
        rank = 3; name = 'Two Pair';
        const pairs = Object.keys(valueCounts).filter(k => valueCounts[k] === 2).map(Number).sort((a, b) => b - a);
        const kicker = getKickers(pairs)[0];
        // Score: high pair + low pair + kicker - use base-15 for lexicographic ordering
        score = 3000000 + pairs[0] * 3375 + pairs[1] * 225 + kicker * 15;
    } else if (counts[0] === 2) {
        rank = 2; name = 'One Pair';
        const pairValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 2));
        const kickers = getKickers([pairValue]);
        // Score: pair value (most important) + 3 kickers in order
        // Multipliers use base-15 positions (15^3, 15^2, 15^1, 15^0) to ensure lexicographic ordering
        // Max: 14*3375 + 14*225 + 14*15 + 14 = 47,250 + 3,150 + 210 + 14 = 50,624 (well under 1M)
        score = 2000000 + pairValue * 3375 + kickers[0] * 225 + kickers[1] * 15 + kickers[2];
    } else {
        rank = 1; name = 'High Card';
        // All 5 cards matter - use base-15 for lexicographic ordering
        // Max: 14*50625 + 14*3375 + 14*225 + 14*15 + 14 = 759,374 (under 1M)
        score = 1000000 + values[0] * 50625 + values[1] * 3375 + values[2] * 225 + values[3] * 15 + values[4];
    }

    return { rank, name, highCards: values, score };
}

function checkStraight(values) {
    if (values.length !== 5) return false;
    for (let i = 0; i < values.length - 1; i++) {
        if (values[i] - values[i + 1] !== 1) return false;
    }
    return true;
}

// Betting Actions
function playerFold(playerId) {
    const player = gameState.players[playerId];
    const chipsBeforeAction = player.chips;
    player.folded = true;
    showAction(playerId, 'FOLD', chipsBeforeAction);
    SoundManager.playFold();
    updateUI();
}

function playerCheck(playerId) {
    const player = gameState.players[playerId];
    showAction(playerId, 'CHECK', player.chips);
    SoundManager.playCheck();
}

function playerCall(playerId) {
    const player = gameState.players[playerId];
    const chipsBeforeAction = player.chips;
    const callAmount = Math.min(gameState.currentBet - player.bet, player.chips);

    player.chips -= callAmount;
    player.bet += callAmount;
    player.totalContribution += callAmount;
    gameState.pot += callAmount;

    if (player.chips === 0) {
        player.allIn = true;
        showAction(playerId, 'ALL IN', chipsBeforeAction);
        SoundManager.playAllIn();
    } else {
        showAction(playerId, `CALL $${callAmount}`, chipsBeforeAction);
        SoundManager.playChips();
    }

    updateUI();
}

function playerRaise(playerId, totalBet) {
    const player = gameState.players[playerId];
    const chipsBeforeAction = player.chips;
    const raiseAmount = totalBet - player.bet;
    const actualRaise = totalBet - gameState.currentBet;

    player.chips -= raiseAmount;
    player.bet = totalBet;
    player.totalContribution += raiseAmount;
    gameState.pot += raiseAmount;
    gameState.currentBet = totalBet;
    gameState.minRaise = Math.max(gameState.minRaise, actualRaise);

    if (player.chips === 0) {
        player.allIn = true;
        showAction(playerId, 'ALL IN', chipsBeforeAction);
        SoundManager.playAllIn();
    } else {
        showAction(playerId, `RAISE $${totalBet}`, chipsBeforeAction);
        SoundManager.playChips();
    }

    updateUI();
}

function playerAllIn(playerId) {
    const player = gameState.players[playerId];
    const chipsBeforeAction = player.chips;
    const allInAmount = player.chips;
    const newBet = player.bet + allInAmount;

    if (newBet > gameState.currentBet) {
        gameState.minRaise = Math.max(gameState.minRaise, newBet - gameState.currentBet);
        gameState.currentBet = newBet;
    }

    player.chips = 0;
    player.bet = newBet;
    player.totalContribution += allInAmount;
    player.allIn = true;
    gameState.pot += allInAmount;

    showAction(playerId, 'ALL IN', chipsBeforeAction);
    SoundManager.playAllIn();
    updateUI();
}

// AI Logic
function aiDecision(playerId) {
    const player = gameState.players[playerId];
    if (player.folded || player.allIn) return;

    const callAmount = gameState.currentBet - player.bet;
    const handStrength = evaluateAIHand(player);

    // Simple AI logic
    const random = Math.random();

    if (handStrength > 0.7) {
        // Strong hand - raise
        if (random > 0.3) {
            const raiseAmount = Math.min(
                gameState.currentBet + gameState.minRaise + Math.floor(Math.random() * 50),
                player.chips + player.bet
            );
            playerRaise(playerId, raiseAmount);
        } else {
            playerCall(playerId);
        }
    } else if (handStrength > 0.4) {
        // Medium hand - mostly call
        if (callAmount === 0) {
            playerCheck(playerId);
        } else if (callAmount <= player.chips * 0.2 || random > 0.3) {
            playerCall(playerId);
        } else {
            playerFold(playerId);
        }
    } else if (handStrength > 0.2) {
        // Weak hand - sometimes bluff
        if (callAmount === 0) {
            if (random > 0.7) {
                const raiseAmount = gameState.currentBet + gameState.minRaise;
                if (raiseAmount <= player.chips + player.bet) {
                    playerRaise(playerId, raiseAmount);
                } else {
                    playerCheck(playerId);
                }
            } else {
                playerCheck(playerId);
            }
        } else if (callAmount <= player.chips * 0.1) {
            playerCall(playerId);
        } else {
            playerFold(playerId);
        }
    } else {
        // Very weak hand - usually fold
        if (callAmount === 0) {
            playerCheck(playerId);
        } else if (callAmount <= player.chips * 0.05 && random > 0.5) {
            playerCall(playerId);
        } else {
            playerFold(playerId);
        }
    }
}

function evaluateAIHand(player) {
    const allCards = [...player.cards, ...gameState.communityCards];

    if (allCards.length < 2) return 0.3;

    // Preflop evaluation
    if (gameState.communityCards.length === 0) {
        const values = player.cards.map(c => getCardValue(c.value)).sort((a, b) => b - a);
        const suited = player.cards[0].suit === player.cards[1].suit;
        const paired = values[0] === values[1];

        let strength = 0.2;

        if (paired) {
            strength = 0.4 + (values[0] / 14) * 0.4;
        } else if (values[0] >= 12 && values[1] >= 10) {
            strength = 0.5 + (suited ? 0.1 : 0);
        } else if (values[0] >= 10) {
            strength = 0.35 + (suited ? 0.1 : 0);
        } else if (suited && Math.abs(values[0] - values[1]) <= 2) {
            strength = 0.35;
        }

        return strength;
    }

    // Post-flop evaluation
    const hand = evaluateHand(allCards);
    return hand.rank / 10;
}

// Game Flow
function nextPlayer() {
    const numPlayers = gameState.players.length;
    let attempts = 0;
    do {
        // Clockwise direction: 0 -> 1 -> 2 -> 3 -> 4 -> 0
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % numPlayers;
        attempts++;
    } while (
        (gameState.players[gameState.currentPlayerIndex].folded ||
            gameState.players[gameState.currentPlayerIndex].allIn) &&
        attempts < numPlayers
    );

    return attempts < numPlayers;
}

function getActivePlayers() {
    return gameState.players.filter(p => !p.folded && p.chips >= 0);
}

function getPlayersInHand() {
    return gameState.players.filter(p => !p.folded);
}

// Animate bets moving to pot
async function animateBetsToPot() {
    const potDisplay = document.querySelector('.pot-display');
    if (!potDisplay) return;

    const potRect = potDisplay.getBoundingClientRect();
    const animations = [];

    for (const player of gameState.players) {
        if (player.bet > 0) {
            const betDisplay = document.getElementById(`bet-${player.id}`);
            if (!betDisplay || !betDisplay.classList.contains('visible')) continue;

            const betRect = betDisplay.getBoundingClientRect();

            // Create a clone for animation
            const clone = document.createElement('div');
            clone.className = 'bet-clone';
            clone.innerHTML = `<span class="bet-amount">$${player.bet}</span>`;
            clone.style.left = `${betRect.left}px`;
            clone.style.top = `${betRect.top}px`;
            clone.style.width = `${betRect.width}px`;
            clone.style.height = `${betRect.height}px`;

            document.body.appendChild(clone);

            // Calculate target position (center of pot)
            const targetX = potRect.left + potRect.width / 2 - betRect.width / 2;
            const targetY = potRect.top + potRect.height / 2 - betRect.height / 2;

            // Hide original bet display
            betDisplay.classList.remove('visible');

            // Animate clone to pot
            const animation = new Promise(resolve => {
                // Force reflow
                clone.offsetHeight;

                clone.style.transition = 'all 0.4s ease-in-out';
                clone.style.left = `${targetX}px`;
                clone.style.top = `${targetY}px`;
                clone.style.transform = 'scale(0.5)';
                clone.style.opacity = '0';

                setTimeout(() => {
                    clone.remove();
                    resolve();
                }, 400);
            });

            animations.push(animation);
        }
    }

    // Wait for all animations to complete
    if (animations.length > 0) {
        await Promise.all(animations);
    }
}

async function resetBets(thisGameId) {
    // Check if game was cancelled before proceeding
    if (thisGameId !== undefined && currentGameId !== thisGameId) return;

    // Animate bets moving to pot first
    await animateBetsToPot();

    // Check again after animation in case game was cancelled
    if (thisGameId !== undefined && currentGameId !== thisGameId) return;

    for (const player of gameState.players) {
        player.bet = 0;
    }
    gameState.currentBet = 0;
    gameState.minRaise = BIG_BLIND;

    // Clear all bet displays
    for (let i = 0; i < gameState.players.length; i++) {
        updateBetDisplay(i);
    }
}

async function runBettingRound() {
    // Store the game ID at the very start - if it changes, abort this round
    const thisGameId = currentGameId;

    // Get players who can still act (not folded, not all-in, have chips)
    const getActingPlayers = () => gameState.players.filter(p => !p.folded && !p.allIn && p.chips > 0);

    // If only one or zero players can act and all bets are matched, skip the round
    const initialActingPlayers = getActingPlayers();
    if (initialActingPlayers.length === 0) {
        return;
    }
    if (initialActingPlayers.length === 1 && initialActingPlayers.every(p => p.bet === gameState.currentBet)) {
        return;
    }

    // Track which players have acted since the last raise/bet
    // When someone raises, everyone else needs to respond
    // Start empty - every player must act at least once per round
    let playersActedSinceLastRaise = new Set();

    while (true) {
        // Check if a new game started - if so, abort this betting round
        if (currentGameId !== thisGameId) {
            return;
        }

        const player = gameState.players[gameState.currentPlayerIndex];

        // If only one player remains in hand (not folded), end the round
        if (getPlayersInHand().length === 1) {
            break;
        }

        // Check if this player can act
        if (!player.folded && !player.allIn && player.chips > 0) {
            const previousCurrentBet = gameState.currentBet;

            if (player.isAI) {
                await delay(800);
                // Check again after await in case game was cancelled during delay
                if (currentGameId !== thisGameId) return;
                aiDecision(player.id);
            } else {
                // Play notification sound for human player's turn
                SoundManager.playYourTurn();
                updateUI();
                await waitForPlayerAction();
                // Check again after await in case game was cancelled during wait
                if (currentGameId !== thisGameId) return;
            }

            // Mark this player as having acted
            playersActedSinceLastRaise.add(player.id);

            // If a raise occurred (current bet increased), reset tracking
            // Everyone except the raiser needs to act again
            if (gameState.currentBet > previousCurrentBet) {
                playersActedSinceLastRaise = new Set([player.id]);
            }
        }

        // Check gameId AGAIN before calling nextPlayer - critical to prevent
        // old game's loop from modifying new game's currentPlayerIndex
        if (currentGameId !== thisGameId) return;

        // Move to next player
        if (!nextPlayer()) break;

        // Check gameId again after nextPlayer in case game was cancelled
        if (currentGameId !== thisGameId) return;

        // Check if round is complete:
        // All active players have acted since last raise AND all bets are matched
        const actingPlayers = getActingPlayers();

        if (actingPlayers.length === 0) {
            // No one can act anymore (all folded or all-in)
            break;
        }

        const allHaveActed = actingPlayers.every(p => playersActedSinceLastRaise.has(p.id));
        const allBetsMatched = actingPlayers.every(p => p.bet === gameState.currentBet);

        if (allHaveActed && allBetsMatched) {
            break;
        }
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Dealer Animation Control
const DEALER_GIF_PREFLOP = 'pic/dealing_preflop.gif';
const DEALER_GIF_FLOP = 'pic/dealing_left.gif';
const DEALER_GIF_TURN_RIVER = 'pic/dealing_right.gif';
const DEALER_STATIC_SRC = 'pic/dealing.png';

function showDealerAnimation(gifSrc) {
    const gif = document.getElementById('dealer-gif');
    if (gif) {
        // Start the animated gif with unique query param to force restart
        gif.src = gifSrc + '?t=' + Date.now();
    }
}

function hideDealerAnimation() {
    const gif = document.getElementById('dealer-gif');
    if (gif) {
        // Replace with static image to stop the animation
        gif.src = DEALER_STATIC_SRC;
    }
}

let playerActionResolver = null;

function waitForPlayerAction() {
    return new Promise(resolve => {
        playerActionResolver = resolve;
    });
}

function resolvePlayerAction() {
    if (playerActionResolver) {
        // Immediately disable controls after user takes action
        const controls = document.getElementById('controls');
        controls.classList.add('disabled');
        controls.classList.remove('active');

        playerActionResolver();
        playerActionResolver = null;
    }
}

// Game Phases
async function startNewGame(randomizeDealer = false) {
    // Increment game ID to cancel any previous game's async operations
    currentGameId++;

    // Start background music (only plays if user has enabled it)
    SoundManager.playMusic();

    // Clear any pending player action resolver from previous game
    if (playerActionResolver) {
        playerActionResolver(); // Resolve it to unblock, but the game ID check will abort the old game
        playerActionResolver = null;
    }

    // Increment hand counter (previous hand's history is already saved in array)
    handNumber++;
    currentViewingHand = handNumber;

    // Initialize new hand's history array
    handHistories[handNumber - 1] = [];

    // Clear action history display
    const history = document.getElementById('action-history');
    if (history) {
        history.innerHTML = '';
    }

    // Update hand number in panel header (stays visible when scrolling)
    const panelHandNumber = document.getElementById('panel-hand-number');
    if (panelHandNumber) {
        panelHandNumber.textContent = `Hand #${handNumber}`;
        panelHandNumber.classList.remove('viewing-past');
    }

    // Update navigation buttons
    updateHistoryNavigation();

    // Clear any previous winner highlights
    clearWinnerHighlights();

    // Restore pot display visibility (hidden during pot animation)
    const potDisplay = document.querySelector('.pot-display');
    if (potDisplay) potDisplay.style.visibility = 'visible';

    // Reset game state
    gameState.deck = createDeck();
    gameState.communityCards = [];
    gameState.displayedCommunityCards = 0;
    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.phase = 'preflop';
    gameState.minRaise = BIG_BLIND;
    gameState.currentPlayerIndex = 0; // Explicitly reset - will be set properly after blinds

    // Reset players
    for (const player of gameState.players) {
        player.cards = [];
        player.bet = 0;
        player.totalContribution = 0;
        player.folded = false;
        player.allIn = false;

        // Eliminate players with no chips
        if (player.chips <= 0) {
            player.chips = 0;
            player.folded = true;
        }
    }

    // Check if game can continue
    const playersWithChips = gameState.players.filter(p => p.chips > 0);
    if (playersWithChips.length < 2) {
        showMessage('Game Over! ' + (playersWithChips[0]?.name || 'No one') + ' wins!');
        document.getElementById('btn-new-game').textContent = 'RESTART GAME';
        initPlayers();
        updateUI();
        return;
    }

    // Set dealer position
    if (randomizeDealer) {
        // Random dealer position for fresh game
        const eligibleDealers = gameState.players.map((p, i) => ({ player: p, index: i })).filter(p => p.player.chips > 0);
        if (eligibleDealers.length > 0) {
            const randomPlayerIndex = Math.floor(Math.random() * eligibleDealers.length);
            gameState.dealerIndex = eligibleDealers[randomPlayerIndex].index;
        }
    } else {
        // Move dealer clockwise for next round
        do {
            gameState.dealerIndex = (gameState.dealerIndex + 1) % gameState.players.length;
        } while (gameState.players[gameState.dealerIndex].chips <= 0);
    }

    // Post blinds
    const sbIndex = getNextActivePlayer(gameState.dealerIndex);
    const bbIndex = getNextActivePlayer(sbIndex);

    postBlind(sbIndex, SMALL_BLIND);
    postBlind(bbIndex, BIG_BLIND);

    gameState.currentBet = BIG_BLIND;
    gameState.currentPlayerIndex = getNextActivePlayer(bbIndex);

    // Update UI before dealing to show blinds
    updateUI();

    // Store game ID at the start of this game
    const thisGameId = currentGameId;

    // Deal hole cards with animation
    await dealHoleCards(thisGameId);

    // Check if game was cancelled
    if (currentGameId !== thisGameId) return;

    // Run betting rounds
    await runBettingRound();

    // Check if game was cancelled
    if (currentGameId !== thisGameId) return;

    if (getPlayersInHand().length > 1) {
        await dealFlop(thisGameId);
    }

    // Check if game was cancelled
    if (currentGameId !== thisGameId) return;

    if (getPlayersInHand().length > 1) {
        await dealTurn(thisGameId);
    }

    // Check if game was cancelled
    if (currentGameId !== thisGameId) return;

    if (getPlayersInHand().length > 1) {
        await dealRiver(thisGameId);
    }

    // Check if game was cancelled
    if (currentGameId !== thisGameId) return;

    await showdown(thisGameId);
}

function getNextActivePlayer(fromIndex) {
    const numPlayers = gameState.players.length;
    // Clockwise direction: 0 -> 1 -> 2 -> 3 -> 4 -> 0
    let index = (fromIndex + 1) % numPlayers;
    let attempts = 0;
    // Skip only folded players - all-in players (chips=0 but allIn=true) are still in the hand
    while (gameState.players[index].folded && attempts < numPlayers) {
        index = (index + 1) % numPlayers;
        attempts++;
    }
    return index;
}

function postBlind(playerIndex, amount) {
    const player = gameState.players[playerIndex];
    const chipsBeforeAction = player.chips;
    const blindAmount = Math.min(amount, player.chips);

    player.chips -= blindAmount;
    player.bet = blindAmount;
    player.totalContribution += blindAmount;
    gameState.pot += blindAmount;

    if (player.chips === 0) {
        player.allIn = true;
    }

    showAction(playerIndex, amount === SMALL_BLIND ? 'SB' : 'BB', chipsBeforeAction);
}

async function dealFlop(thisGameId) {
    gameState.phase = 'flop';
    await resetBets(thisGameId);

    // Check if game was cancelled
    if (currentGameId !== thisGameId) return;

    // Show dealer animation
    showDealerAnimation(DEALER_GIF_FLOP);

    // Burn and deal 3 cards
    dealCard(); // Burn
    for (let i = 0; i < 3; i++) {
        gameState.communityCards.push(dealCard());
    }

    gameState.currentPlayerIndex = getNextActivePlayer(gameState.dealerIndex);

    updateUI();
    SoundManager.playCardFlip();

    // Wait for GIF animation to complete one loop
    await delay(1000);

    // Hide dealer animation
    hideDealerAnimation();

    // Check if game was cancelled after delay
    if (currentGameId !== thisGameId) return;

    await runBettingRound();
}

async function dealTurn(thisGameId) {
    gameState.phase = 'turn';
    await resetBets(thisGameId);

    // Check if game was cancelled
    if (currentGameId !== thisGameId) return;

    // Show dealer animation
    showDealerAnimation(DEALER_GIF_TURN_RIVER);

    // Burn and deal 1 card
    dealCard(); // Burn
    gameState.communityCards.push(dealCard());

    gameState.currentPlayerIndex = getNextActivePlayer(gameState.dealerIndex);

    updateUI();
    SoundManager.playCardFlip();

    // Wait for GIF animation to complete one loop
    await delay(1000);

    // Hide dealer animation
    hideDealerAnimation();

    // Check if game was cancelled after delay
    if (currentGameId !== thisGameId) return;

    await runBettingRound();
}

async function dealRiver(thisGameId) {
    gameState.phase = 'river';
    await resetBets(thisGameId);

    // Check if game was cancelled
    if (currentGameId !== thisGameId) return;

    // Show dealer animation
    showDealerAnimation(DEALER_GIF_TURN_RIVER);

    // Burn and deal 1 card
    dealCard(); // Burn
    gameState.communityCards.push(dealCard());

    gameState.currentPlayerIndex = getNextActivePlayer(gameState.dealerIndex);

    updateUI();
    SoundManager.playCardFlip();

    // Wait for GIF animation to complete one loop
    await delay(1000);

    // Hide dealer animation
    hideDealerAnimation();

    // Check if game was cancelled after delay
    if (currentGameId !== thisGameId) return;

    await runBettingRound();
}

async function showdown(thisGameId) {
    gameState.phase = 'showdown';

    // Animate final bets to pot before showdown
    await resetBets(thisGameId);

    // Check if game was cancelled
    if (currentGameId !== thisGameId) return;

    const playersInHand = getPlayersInHand();

    // Reveal all cards
    for (const player of playersInHand) {
        updatePlayerCards(player.id, false);
    }

    await delay(500);

    // Check if game was cancelled after delay
    if (currentGameId !== thisGameId) return;

    if (playersInHand.length === 1) {
        // Everyone folded - highlight winner and their hole cards
        const winner = playersInHand[0];
        const winAmount = gameState.pot;

        // Play win sound
        SoundManager.playWin();

        // Reveal winner's cards
        updatePlayerCards(winner.id, false);

        // Highlight winner (with "Everyone Folded" badge instead of hand name)
        const playerEl = document.getElementById(`player-${winner.id}`);
        playerEl.classList.add('winner');

        const badge = document.createElement('div');
        badge.className = 'hand-rank-badge';
        badge.textContent = 'Everyone Folded';
        badge.id = `hand-badge-${winner.id}`;
        playerEl.appendChild(badge);

        // Highlight winner's hole cards
        const playerCardsContainer = document.getElementById(`cards-${winner.id}`);
        const playerCardEls = playerCardsContainer.querySelectorAll('.card');
        playerCardEls.forEach(card => card.classList.add('winning-card'));

        // Log fold win details in showdown style
        logFoldWinDetails(winner, winAmount);

        // Animate pot to winner
        await animatePotToWinners([winner], [winAmount]);

        // Check if game was cancelled after animation
        if (currentGameId !== thisGameId) return;

        // Update chips after animation
        winner.chips += winAmount;
    } else {
        // Evaluate all hands first
        for (const player of playersInHand) {
            const allCards = [...player.cards, ...gameState.communityCards];
            const hand = evaluateHand(allCards);
            player.handResult = hand;
        }

        // Calculate pots (main pot and side pots)
        // Pass all players so folded contributions are included
        const pots = calculatePots(gameState.players);

        let allWinners = [];
        let firstHandName = '';
        let totalWinAmounts = {};

        // Award each pot to its winner(s)
        for (let i = 0; i < pots.length; i++) {
            const pot = pots[i];
            const potName = i === 0 ? 'Main Pot' : `Side Pot ${i}`;

            // Find best hand among eligible players for this pot
            let bestScore = -1;
            let potWinners = [];

            for (const player of pot.eligiblePlayers) {
                if (player.handResult.score > bestScore) {
                    bestScore = player.handResult.score;
                    potWinners = [player];
                } else if (player.handResult.score === bestScore) {
                    potWinners.push(player);
                }
            }

            const winAmount = Math.floor(pot.amount / potWinners.length);
            const handName = potWinners[0].handResult.name;

            if (i === 0) firstHandName = handName;

            // Track all winners and their total winnings
            for (const winner of potWinners) {
                if (!allWinners.includes(winner)) {
                    allWinners.push(winner);
                }
                totalWinAmounts[winner.id] = (totalWinAmounts[winner.id] || 0) + winAmount;
                winner.chips += winAmount;
            }

            // Log each pot award
            const winnerNames = potWinners.map(w => w.name).join(' & ');
            showMessage(`${potName}: ${winnerNames} wins $${winAmount} with ${handName}`);
        }

        // Log showdown details to action history (pass individual win amounts)
        logShowdownDetails(playersInHand, allWinners, firstHandName, totalWinAmounts);

        // Highlight all winners
        highlightWinners(allWinners);

        // Animate pot to all winners (simplified - just show total)
        await animatePotToWinners(allWinners, allWinners.map(w => totalWinAmounts[w.id]));

        // Check if game was cancelled after animation
        if (currentGameId !== thisGameId) return;
    }

    // Finalize showdown - update chips display and start next game
    await finalizeShowdown();
}

// Calculate main pot and side pots based on player contributions
// Includes contributions from folded players in pot amounts
function calculatePots(allPlayers) {
    // Separate folded and active players
    const activePlayers = allPlayers.filter(p => !p.folded);
    const foldedContributions = allPlayers
        .filter(p => p.folded)
        .reduce((sum, p) => sum + p.totalContribution, 0);

    // Sort active players by contribution (lowest first)
    const playerContributions = activePlayers.map(p => ({
        player: p,
        contribution: p.totalContribution
    })).sort((a, b) => a.contribution - b.contribution);

    const pots = [];
    let previousLevel = 0;

    for (let i = 0; i < playerContributions.length; i++) {
        const currentLevel = playerContributions[i].contribution;

        if (currentLevel > previousLevel) {
            // Calculate pot amount at this level
            const levelContribution = currentLevel - previousLevel;
            const eligibleCount = playerContributions.length - i;
            let potAmount = levelContribution * eligibleCount;

            // Add folded players' contributions to the main pot (first pot only)
            if (pots.length === 0) {
                potAmount += foldedContributions;
            }

            // Get eligible players for this pot (all players at or above this contribution level)
            const eligiblePlayers = playerContributions
                .slice(i)
                .map(pc => pc.player);

            pots.push({
                amount: potAmount,
                eligiblePlayers: eligiblePlayers,
                level: currentLevel
            });

            previousLevel = currentLevel;
        }
    }

    return pots;
}

// Helper function to format cards as text string
function formatCardsText(cards) {
    return cards.map(card => `${card.value}${card.suit}`).join(' ');
}

// Log fold win details in showdown-style format
function logFoldWinDetails(winner, winAmount) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });

    const entryHTML = `
        <div class="log-entry showdown-details">
            <div class="log-time">
                <span>${time}</span>
                <span class="log-phase">FOLD WIN</span>
            </div>
            <div class="log-content">
                <div class="showdown-section">
                    <strong>Winner's Hole Cards:</strong>
                    <div class="player-hand winner-hand">
                        ${winner.name} ⭐: ${formatCardsText(winner.cards)}
                    </div>
                </div>
                <div class="showdown-section winner-section">
                    <strong>🏆 Winner:</strong> ${winner.name}
                    <br><strong>Result:</strong> Everyone Folded
                    <br><strong>Prize:</strong> $${winAmount}
                </div>
            </div>
        </div>
    `;

    appendToCurrentHandHistory(entryHTML);
}

// Log detailed showdown information to action history
function logShowdownDetails(playersInHand, winners, handName, totalWinAmounts) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });

    // Build player hole cards HTML
    let playerCardsHTML = '';
    for (const player of playersInHand) {
        const isWinner = winners.some(w => w.id === player.id);
        const winnerMark = isWinner ? ' ⭐' : '';
        playerCardsHTML += `
            <div class="player-hand ${isWinner ? 'winner-hand' : ''}">
                ${player.name}${winnerMark}: ${formatCardsText(player.cards)}
            </div>
        `;
    }

    // Build best cards info for each winner with their prize
    const winnersCardsInfo = winners.map(w => {
        const bestCards = w.handResult && w.handResult.bestCards ? formatCardsText(w.handResult.bestCards) : 'N/A';
        return `${bestCards}(${w.name})`;
    }).join('<br>');

    // Build prize info for each winner
    const prizeInfo = winners.map(w => {
        const winAmount = totalWinAmounts[w.id] || 0;
        return `${w.name}: $${winAmount}`;
    }).join('<br>');

    const entryHTML = `
        <div class="log-entry showdown-details">
            <div class="log-time">
                <span>${time}</span>
                <span class="log-phase">SHOWDOWN</span>
            </div>
            <div class="log-content">
                <div class="showdown-section">
                    <strong>Community Cards:</strong> ${formatCardsText(gameState.communityCards)}
                </div>
                <div class="showdown-section">
                    <strong>Players' Hole Cards:</strong>
                    ${playerCardsHTML}
                </div>
                <div class="showdown-section winner-section">
                    <strong>🏆 Winner:</strong> ${winners.map(w => w.name).join(' & ')}
                    <br><strong>Winning Hand:</strong> ${handName}
                    <br><strong>Best 5 Cards:</strong><br>${winnersCardsInfo}
                    <br><strong>Prize:</strong><br>${prizeInfo}
                </div>
            </div>
        </div>
    `;

    appendToCurrentHandHistory(entryHTML);
}

// Update chips display only after showdown (called within showdown)
async function finalizeShowdown() {
    // Store game ID to check if user started a new game during the delay
    const thisGameId = currentGameId;

    // Update chips display only (don't call updateUI which would rebuild cards and remove highlights)
    for (const player of gameState.players) {
        document.getElementById(`chips-${player.id}`).textContent = player.chips;
    }

    // Wait 5 seconds to let player see the winner highlights, then start next game
    await delay(5000);

    // Only start next game if user didn't already click New Game
    if (currentGameId === thisGameId) {
        startNewGame();
    }
}

// Highlight winning players and their winning cards
function highlightWinners(winners) {
    // Play win sound
    SoundManager.playWin();

    for (const winner of winners) {
        const playerEl = document.getElementById(`player-${winner.id}`);
        playerEl.classList.add('winner');

        // Add hand rank badge - use each winner's own hand result name
        const badge = document.createElement('div');
        badge.className = 'hand-rank-badge';
        badge.textContent = winner.handResult ? winner.handResult.name : 'Winner';
        badge.id = `hand-badge-${winner.id}`;
        playerEl.appendChild(badge);

        // Highlight winning cards (only if we have a real hand result)
        if (winner.handResult && winner.handResult.bestCards && winner.handResult.bestCards.length > 0) {
            highlightWinningCards(winner);
        }
    }
}

// Highlight the 5 cards that make up the winning hand
function highlightWinningCards(winner) {
    const bestCards = winner.handResult.bestCards;

    // Get player's hole cards (exclude placeholders)
    const playerCardsContainer = document.getElementById(`cards-${winner.id}`);
    const playerCardEls = playerCardsContainer.querySelectorAll('.card:not(.card-placeholder)');

    // Get community cards (exclude placeholders)
    const communityContainer = document.getElementById('community-cards');
    const communityCardEls = communityContainer.querySelectorAll('.card:not(.card-placeholder)');

    // Check each of the best 5 cards and highlight matching ones
    for (const bestCard of bestCards) {
        // Check player's hole cards
        for (let i = 0; i < winner.cards.length; i++) {
            if (winner.cards[i].suit === bestCard.suit && winner.cards[i].value === bestCard.value) {
                if (playerCardEls[i]) {
                    playerCardEls[i].classList.add('winning-card');
                }
            }
        }

        // Check community cards
        for (let i = 0; i < gameState.communityCards.length; i++) {
            if (gameState.communityCards[i].suit === bestCard.suit &&
                gameState.communityCards[i].value === bestCard.value) {
                if (communityCardEls[i]) {
                    communityCardEls[i].classList.add('winning-card');
                }
            }
        }
    }
}

// Animate pot moving to winners
async function animatePotToWinners(winners, winAmounts) {
    const potDisplay = document.querySelector('.pot-display');
    const potRect = potDisplay.getBoundingClientRect();

    // Hide original pot display during animation
    potDisplay.style.visibility = 'hidden';

    for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        const winAmount = winAmounts[i];

        // Get winner's position
        const playerEl = document.getElementById(`player-${winner.id}`);
        const playerRect = playerEl.getBoundingClientRect();

        // Create pot clone
        const potClone = document.createElement('div');
        potClone.className = 'pot-clone';
        potClone.innerHTML = `
            <span class="pot-label">${winners.length > 1 ? 'SPLIT' : 'POT'}</span>
            <span class="pot-amount">$${winAmount}</span>
        `;

        // Position at pot's location
        potClone.style.left = `${potRect.left}px`;
        potClone.style.top = `${potRect.top}px`;

        document.body.appendChild(potClone);

        // Calculate target position (center of player element)
        const targetX = playerRect.left + playerRect.width / 2 - potRect.width / 2;
        const targetY = playerRect.top + playerRect.height / 2 - potRect.height / 2;

        // Animate to player
        potClone.style.transition = 'all 0.6s ease-out';

        // Force reflow
        potClone.offsetHeight;

        potClone.style.left = `${targetX}px`;
        potClone.style.top = `${targetY}px`;

        // Wait for animation
        await delay(600);

        // Fade out
        potClone.classList.add('animating');
        await delay(400);

        // Remove clone
        potClone.remove();

        // Small delay between multiple winners
        if (i < winners.length - 1) {
            await delay(200);
        }
    }

    // Clear pot display
    gameState.pot = 0;
    document.getElementById('pot-amount').textContent = '$0';
}

// Clear all winner highlights (call at start of new game)
function clearWinnerHighlights() {
    // Remove winner class from all players
    document.querySelectorAll('.player.winner').forEach(el => {
        el.classList.remove('winner');
    });

    // Remove hand rank badges
    document.querySelectorAll('.hand-rank-badge').forEach(el => {
        el.remove();
    });

    // Remove winning card highlights
    document.querySelectorAll('.card.winning-card').forEach(el => {
        el.classList.remove('winning-card');
    });
}

// Event Listeners
document.getElementById('btn-fold').addEventListener('click', () => {
    playerFold(0);
    resolvePlayerAction();
});

document.getElementById('btn-check').addEventListener('click', () => {
    playerCheck(0);
    resolvePlayerAction();
});

document.getElementById('btn-call').addEventListener('click', () => {
    playerCall(0);
    resolvePlayerAction();
});

document.getElementById('btn-raise').addEventListener('click', () => {
    const raiseAmount = parseInt(document.getElementById('raise-slider').value);
    playerRaise(0, raiseAmount);
    resolvePlayerAction();
});

document.getElementById('btn-allin').addEventListener('click', () => {
    playerAllIn(0);
    resolvePlayerAction();
});

document.getElementById('raise-slider').addEventListener('input', (e) => {
    document.getElementById('raise-amount').textContent = e.target.value;
});

// Helper for reset and start new game
let lastNewGameClickTime = 0;
let cooldownIntervalId = null;
const NEW_GAME_DEBOUNCE_MS = 5000; // 5 seconds cooldown

function resetAndStartNewGame() {
    // Debounce: prevent double-clicking within cooldown period
    const now = Date.now();
    if (now - lastNewGameClickTime < NEW_GAME_DEBOUNCE_MS) {
        return; // Ignore rapid clicks
    }
    lastNewGameClickTime = now;

    // Add cooldown visual style to button with countdown timer
    const newGameBtn = document.getElementById('btn-new-game');
    if (newGameBtn) {
        newGameBtn.classList.add('cooldown');

        // Start countdown timer
        let secondsRemaining = Math.ceil(NEW_GAME_DEBOUNCE_MS / 1000);
        newGameBtn.textContent = `NEW GAME (${secondsRemaining})`;

        // Clear any existing interval
        if (cooldownIntervalId) {
            clearInterval(cooldownIntervalId);
        }

        cooldownIntervalId = setInterval(() => {
            secondsRemaining--;
            if (secondsRemaining > 0) {
                newGameBtn.textContent = `NEW GAME (${secondsRemaining})`;
            } else {
                // Cooldown finished
                newGameBtn.textContent = 'NEW GAME';
                newGameBtn.classList.remove('cooldown');
                clearInterval(cooldownIntervalId);
                cooldownIntervalId = null;
            }
        }, 1000);
    }

    document.getElementById('winner-popup').classList.remove('visible');
    for (const player of gameState.players) {
        player.chips = STARTING_CHIPS;
    }

    // Reset hand counter and clear all history IMMEDIATELY
    handNumber = 0;
    handHistories = [];
    currentViewingHand = 0;

    // Clear action history display immediately to prevent old actions from appearing
    const history = document.getElementById('action-history');
    if (history) {
        history.innerHTML = '';
    }

    // Clear panel hand number display
    const panelHandNumber = document.getElementById('panel-hand-number');
    if (panelHandNumber) {
        panelHandNumber.textContent = '';
        panelHandNumber.classList.remove('viewing-past');
    }

    startNewGame(true);
}

document.getElementById('btn-new-game').addEventListener('click', resetAndStartNewGame);
document.getElementById('btn-continue').addEventListener('click', resetAndStartNewGame);

// ===== Hand History Navigation =====

// Update navigation buttons state
function updateHistoryNavigation() {
    const prevBtn = document.getElementById('btn-prev-hand');
    const nextBtn = document.getElementById('btn-next-hand');
    const returnBtn = document.getElementById('btn-return-hand');

    if (prevBtn) {
        prevBtn.disabled = currentViewingHand <= 1;
    }
    if (nextBtn) {
        nextBtn.disabled = currentViewingHand >= handNumber;
    }
    if (returnBtn) {
        // Return button is only enabled when viewing a past hand
        returnBtn.disabled = currentViewingHand >= handNumber;
    }
}

// Navigate to previous or next hand
function navigateToHand(direction) {
    const history = document.getElementById('action-history');
    if (!history) return;

    // Calculate target hand
    let targetHand = currentViewingHand + direction;

    // Clamp to valid range
    if (targetHand < 1) targetHand = 1;
    if (targetHand > handNumber) targetHand = handNumber;

    // No change needed
    if (targetHand === currentViewingHand) return;

    currentViewingHand = targetHand;

    // Load the target hand's history from array
    const handHistory = handHistories[targetHand - 1];
    if (handHistory && Array.isArray(handHistory) && handHistory.length > 0) {
        history.innerHTML = handHistory.join('');
    } else {
        history.innerHTML = '';
    }

    // Update hand number in panel header
    const panelHandNumber = document.getElementById('panel-hand-number');
    if (panelHandNumber) {
        if (currentViewingHand === handNumber) {
            panelHandNumber.textContent = `Hand #${handNumber}`;
            panelHandNumber.classList.remove('viewing-past');
        } else {
            panelHandNumber.textContent = `Hand #${currentViewingHand} of ${handNumber}`;
            panelHandNumber.classList.add('viewing-past');
        }
    }

    // Update navigation buttons
    updateHistoryNavigation();
}

// Navigation button event listeners
document.getElementById('btn-prev-hand').addEventListener('click', () => navigateToHand(-1));
document.getElementById('btn-next-hand').addEventListener('click', () => navigateToHand(1));

// Return to current hand
function returnToCurrentHand() {
    if (currentViewingHand === handNumber) return;

    const history = document.getElementById('action-history');
    if (!history) return;

    currentViewingHand = handNumber;

    // Load current hand's history from array
    const handHistory = handHistories[handNumber - 1];
    if (handHistory && Array.isArray(handHistory) && handHistory.length > 0) {
        history.innerHTML = handHistory.join('');
    } else {
        history.innerHTML = '';
    }

    // Update hand number in panel header
    const panelHandNumber = document.getElementById('panel-hand-number');
    if (panelHandNumber) {
        panelHandNumber.textContent = `Hand #${handNumber}`;
        panelHandNumber.classList.remove('viewing-past');
    }

    // Update navigation buttons
    updateHistoryNavigation();
}

document.getElementById('btn-return-hand').addEventListener('click', returnToCurrentHand);

// ===== Help Popup =====
document.getElementById('help-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('help-popup').classList.add('visible');
});

document.getElementById('btn-help-ok').addEventListener('click', () => {
    document.getElementById('help-popup').classList.remove('visible');
});

// Close help popup when clicking outside the content
document.getElementById('help-popup').addEventListener('click', (e) => {
    if (e.target.id === 'help-popup') {
        document.getElementById('help-popup').classList.remove('visible');
    }
});

// Initialize
initPlayers();
SoundManager.init();
updateUI();
showMessage('Click "New Game" to start playing Texas Hold\'em!');
