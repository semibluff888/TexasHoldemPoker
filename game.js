// ===== Texas Hold'em Poker Game =====

// Game Constants
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const HAND_RANKS = {
    'Royal Flush': 10,
    'Straight Flush': 9,
    'Four of a Kind': 8,
    'Full House': 7,
    'Flush': 6,
    'Straight': 5,
    'Three of a Kind': 4,
    'Two Pair': 3,
    'One Pair': 2,
    'High Card': 1
};

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const STARTING_CHIPS = 1000;

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
    lastRaiseAmount: 0
};

// Initialize Players
function initPlayers() {
    gameState.players = [
        { id: 0, name: 'You', chips: STARTING_CHIPS, cards: [], bet: 0, folded: false, isAI: false, allIn: false },
        { id: 1, name: 'AI Player 1', chips: STARTING_CHIPS, cards: [], bet: 0, folded: false, isAI: true, allIn: false },
        { id: 2, name: 'AI Player 2', chips: STARTING_CHIPS, cards: [], bet: 0, folded: false, isAI: true, allIn: false },
        { id: 3, name: 'AI Player 3', chips: STARTING_CHIPS, cards: [], bet: 0, folded: false, isAI: true, allIn: false }
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

function dealHoleCards() {
    for (let i = 0; i < 2; i++) {
        for (const player of gameState.players) {
            if (!player.folded && player.chips > 0) {
                player.cards.push(dealCard());
            }
        }
    }
}

// Card Display
function getCardHTML(card, isHidden = false) {
    if (isHidden) {
        return '<div class="card card-back dealing"></div>';
    }
    const isRed = card.suit === '♥' || card.suit === '♦';
    return `
        <div class="card card-face ${isRed ? 'red' : 'black'} dealing">
            <span class="card-value">${card.value}</span>
            <span class="card-suit">${card.suit}</span>
        </div>
    `;
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
    cardsContainer.innerHTML = player.cards.map(card => getCardHTML(card, hidden)).join('');
}

function updateCommunityCards() {
    const container = document.getElementById('community-cards');
    let html = '';

    for (let i = 0; i < 5; i++) {
        if (i < gameState.communityCards.length) {
            html += getCardHTML(gameState.communityCards[i]);
        } else {
            html += '<div class="card card-placeholder"></div>';
        }
    }

    container.innerHTML = html;
}

// UI Updates
function updateUI() {
    // Update pot
    document.getElementById('pot-amount').textContent = `$${gameState.pot}`;

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
    }

    updateCommunityCards();
    updateControls();
}

function updateControls() {
    const controls = document.getElementById('controls');
    const player = gameState.players[0];

    if (gameState.phase === 'idle' || gameState.phase === 'showdown' || player.folded || player.allIn) {
        controls.classList.add('hidden');
        return;
    }

    if (gameState.currentPlayerIndex !== 0) {
        controls.classList.add('hidden');
        return;
    }

    controls.classList.remove('hidden');

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

    // Disable raise if can't afford
    document.getElementById('btn-raise').disabled = player.chips <= callAmount;
}

function showAction(playerId, action) {
    const actionEl = document.getElementById(`action-${playerId}`);
    actionEl.textContent = action;
    actionEl.classList.add('visible');

    setTimeout(() => {
        actionEl.classList.remove('visible');
    }, 2000);
}

function showMessage(message) {
    document.getElementById('game-message').textContent = message;
}

// Hand Evaluation
function getCardValue(value) {
    const valueMap = { 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return valueMap[value] || parseInt(value);
}

function evaluateHand(cards) {
    if (cards.length < 5) return { rank: 0, name: 'Incomplete', highCards: [] };

    // Get all 5-card combinations
    const combinations = getCombinations(cards, 5);
    let bestHand = { rank: 0, name: 'High Card', highCards: [], score: 0 };

    for (const combo of combinations) {
        const hand = evaluateFiveCards(combo);
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

    if (isFlush && isStraight && values[0] === 14 && values[1] === 13) {
        rank = 10; name = 'Royal Flush';
        score = 10000000;
    } else if (isFlush && (isStraight || isAceLowStraight)) {
        rank = 9; name = 'Straight Flush';
        score = 9000000 + (isAceLowStraight ? 5 : values[0]);
    } else if (counts[0] === 4) {
        rank = 8; name = 'Four of a Kind';
        const quadValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 4));
        score = 8000000 + quadValue * 100;
    } else if (counts[0] === 3 && counts[1] === 2) {
        rank = 7; name = 'Full House';
        const tripValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 3));
        const pairValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 2));
        score = 7000000 + tripValue * 100 + pairValue;
    } else if (isFlush) {
        rank = 6; name = 'Flush';
        score = 6000000 + values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4];
    } else if (isStraight || isAceLowStraight) {
        rank = 5; name = 'Straight';
        score = 5000000 + (isAceLowStraight ? 5 : values[0]);
    } else if (counts[0] === 3) {
        rank = 4; name = 'Three of a Kind';
        const tripValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 3));
        score = 4000000 + tripValue * 100;
    } else if (counts[0] === 2 && counts[1] === 2) {
        rank = 3; name = 'Two Pair';
        const pairs = Object.keys(valueCounts).filter(k => valueCounts[k] === 2).map(Number).sort((a, b) => b - a);
        score = 3000000 + pairs[0] * 1000 + pairs[1] * 10;
    } else if (counts[0] === 2) {
        rank = 2; name = 'One Pair';
        const pairValue = parseInt(Object.keys(valueCounts).find(k => valueCounts[k] === 2));
        score = 2000000 + pairValue * 10000;
    } else {
        rank = 1; name = 'High Card';
        score = 1000000 + values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4];
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
    player.folded = true;
    showAction(playerId, 'FOLD');
    updateUI();
}

function playerCheck(playerId) {
    showAction(playerId, 'CHECK');
}

function playerCall(playerId) {
    const player = gameState.players[playerId];
    const callAmount = Math.min(gameState.currentBet - player.bet, player.chips);

    player.chips -= callAmount;
    player.bet += callAmount;
    gameState.pot += callAmount;

    if (player.chips === 0) {
        player.allIn = true;
        showAction(playerId, 'ALL IN');
    } else {
        showAction(playerId, `CALL $${callAmount}`);
    }

    updateUI();
}

function playerRaise(playerId, totalBet) {
    const player = gameState.players[playerId];
    const raiseAmount = totalBet - player.bet;
    const actualRaise = totalBet - gameState.currentBet;

    player.chips -= raiseAmount;
    player.bet = totalBet;
    gameState.pot += raiseAmount;
    gameState.currentBet = totalBet;
    gameState.minRaise = Math.max(gameState.minRaise, actualRaise);
    gameState.lastRaiseAmount = actualRaise;

    if (player.chips === 0) {
        player.allIn = true;
        showAction(playerId, 'ALL IN');
    } else {
        showAction(playerId, `RAISE $${totalBet}`);
    }

    updateUI();
}

function playerAllIn(playerId) {
    const player = gameState.players[playerId];
    const allInAmount = player.chips;
    const newBet = player.bet + allInAmount;

    if (newBet > gameState.currentBet) {
        gameState.minRaise = Math.max(gameState.minRaise, newBet - gameState.currentBet);
        gameState.currentBet = newBet;
    }

    player.chips = 0;
    player.bet = newBet;
    player.allIn = true;
    gameState.pot += allInAmount;

    showAction(playerId, 'ALL IN');
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
    let attempts = 0;
    do {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
        attempts++;
    } while (
        (gameState.players[gameState.currentPlayerIndex].folded ||
            gameState.players[gameState.currentPlayerIndex].allIn ||
            gameState.players[gameState.currentPlayerIndex].chips === 0) &&
        attempts < 4
    );

    return attempts < 4;
}

function getActivePlayers() {
    return gameState.players.filter(p => !p.folded && p.chips >= 0);
}

function getPlayersInHand() {
    return gameState.players.filter(p => !p.folded);
}

function isRoundComplete() {
    const activePlayers = getActivePlayers().filter(p => !p.allIn);

    if (activePlayers.length <= 1) return true;

    // Check if all active players have matched the current bet
    return activePlayers.every(p => p.bet === gameState.currentBet);
}

function resetBets() {
    for (const player of gameState.players) {
        player.bet = 0;
    }
    gameState.currentBet = 0;
    gameState.minRaise = BIG_BLIND;
}

async function runBettingRound() {
    const startPlayer = gameState.currentPlayerIndex;
    let firstRound = true;

    while (true) {
        const player = gameState.players[gameState.currentPlayerIndex];

        if (getPlayersInHand().length === 1) {
            break;
        }

        if (!player.folded && !player.allIn && player.chips > 0) {
            if (player.isAI) {
                await delay(800);
                aiDecision(player.id);
            } else {
                updateUI();
                await waitForPlayerAction();
            }
        }

        if (!nextPlayer()) break;

        if (gameState.currentPlayerIndex === startPlayer && !firstRound) {
            if (isRoundComplete()) break;
        }

        firstRound = false;

        if (isRoundComplete() && !firstRound) break;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let playerActionResolver = null;

function waitForPlayerAction() {
    return new Promise(resolve => {
        playerActionResolver = resolve;
    });
}

function resolvePlayerAction() {
    if (playerActionResolver) {
        playerActionResolver();
        playerActionResolver = null;
    }
}

// Game Phases
async function startNewGame() {
    // Reset game state
    gameState.deck = createDeck();
    gameState.communityCards = [];
    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.phase = 'preflop';
    gameState.minRaise = BIG_BLIND;

    // Reset players
    for (const player of gameState.players) {
        player.cards = [];
        player.bet = 0;
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

    // Move dealer
    do {
        gameState.dealerIndex = (gameState.dealerIndex + 1) % 4;
    } while (gameState.players[gameState.dealerIndex].chips <= 0);

    // Post blinds
    const sbIndex = getNextActivePlayer(gameState.dealerIndex);
    const bbIndex = getNextActivePlayer(sbIndex);

    postBlind(sbIndex, SMALL_BLIND);
    postBlind(bbIndex, BIG_BLIND);

    gameState.currentBet = BIG_BLIND;
    gameState.currentPlayerIndex = getNextActivePlayer(bbIndex);

    // Deal hole cards
    dealHoleCards();
    updateUI();

    showMessage('Preflop - Your turn!');

    // Run betting rounds
    await runBettingRound();

    if (getPlayersInHand().length > 1) {
        await dealFlop();
    }

    if (getPlayersInHand().length > 1) {
        await dealTurn();
    }

    if (getPlayersInHand().length > 1) {
        await dealRiver();
    }

    await showdown();
}

function getNextActivePlayer(fromIndex) {
    let index = (fromIndex + 1) % 4;
    while (gameState.players[index].folded || gameState.players[index].chips <= 0) {
        index = (index + 1) % 4;
    }
    return index;
}

function postBlind(playerIndex, amount) {
    const player = gameState.players[playerIndex];
    const blindAmount = Math.min(amount, player.chips);

    player.chips -= blindAmount;
    player.bet = blindAmount;
    gameState.pot += blindAmount;

    if (player.chips === 0) {
        player.allIn = true;
    }

    showAction(playerIndex, amount === SMALL_BLIND ? 'SB' : 'BB');
}

async function dealFlop() {
    gameState.phase = 'flop';
    resetBets();

    // Burn and deal 3 cards
    dealCard(); // Burn
    for (let i = 0; i < 3; i++) {
        gameState.communityCards.push(dealCard());
    }

    gameState.currentPlayerIndex = getNextActivePlayer(gameState.dealerIndex);

    updateUI();
    showMessage('Flop dealt!');

    await delay(500);
    await runBettingRound();
}

async function dealTurn() {
    gameState.phase = 'turn';
    resetBets();

    // Burn and deal 1 card
    dealCard(); // Burn
    gameState.communityCards.push(dealCard());

    gameState.currentPlayerIndex = getNextActivePlayer(gameState.dealerIndex);

    updateUI();
    showMessage('Turn dealt!');

    await delay(500);
    await runBettingRound();
}

async function dealRiver() {
    gameState.phase = 'river';
    resetBets();

    // Burn and deal 1 card
    dealCard(); // Burn
    gameState.communityCards.push(dealCard());

    gameState.currentPlayerIndex = getNextActivePlayer(gameState.dealerIndex);

    updateUI();
    showMessage('River dealt!');

    await delay(500);
    await runBettingRound();
}

async function showdown() {
    gameState.phase = 'showdown';

    const playersInHand = getPlayersInHand();

    // Reveal all cards
    for (const player of playersInHand) {
        updatePlayerCards(player.id, false);
    }

    if (playersInHand.length === 1) {
        // Everyone folded
        const winner = playersInHand[0];
        winner.chips += gameState.pot;

        showWinner(winner.name, 'Everyone folded!', gameState.pot);
    } else {
        // Evaluate hands
        let bestScore = -1;
        let winners = [];

        for (const player of playersInHand) {
            const allCards = [...player.cards, ...gameState.communityCards];
            const hand = evaluateHand(allCards);
            player.handResult = hand;

            if (hand.score > bestScore) {
                bestScore = hand.score;
                winners = [player];
            } else if (hand.score === bestScore) {
                winners.push(player);
            }
        }

        // Distribute pot
        const winAmount = Math.floor(gameState.pot / winners.length);
        for (const winner of winners) {
            winner.chips += winAmount;
        }

        const winnerNames = winners.map(w => w.name).join(' & ');
        const handName = winners[0].handResult.name;

        showWinner(winnerNames, handName, winAmount);
    }

    updateUI();
}

function showWinner(name, handName, amount) {
    const popup = document.getElementById('winner-popup');
    document.getElementById('winner-title').textContent = `${name} Wins!`;
    document.getElementById('winner-details').textContent = `${handName} - Won $${amount}`;
    popup.classList.add('visible');
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

document.getElementById('btn-new-game').addEventListener('click', () => {
    document.getElementById('winner-popup').classList.remove('visible');
    startNewGame();
});

document.getElementById('btn-continue').addEventListener('click', () => {
    document.getElementById('winner-popup').classList.remove('visible');
    startNewGame();
});

// Initialize
initPlayers();
updateUI();
showMessage('Click "New Game" to start playing Texas Hold\'em!');
