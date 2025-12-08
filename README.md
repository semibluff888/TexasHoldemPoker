# ♠ Texas Hold'em Poker ♥

A browser-based Texas Hold'em Poker game featuring an elegant UI with smooth animations and intelligent AI opponents.

## 🎮 Features

- **Full Texas Hold'em Gameplay**: Complete implementation of Texas Hold'em rules including all betting rounds (Pre-flop, Flop, Turn, River)
- **AI Opponents**: Three AI players with strategic decision-making based on hand strength and game dynamics
- **Beautiful User Interface**: Modern design with:
  - Smooth card dealing animations
  - Professional poker table layout
  - Real-time action history tracking
  - Interactive betting controls with slider
  - Glassmorphism effects and vibrant gradients
- **Complete Hand Evaluation**: Accurate poker hand ranking system supporting all hand types from High Card to Royal Flush
- **Responsive Controls**: Intuitive betting interface with Fold, Check, Call, Raise, and All-In options
- **Game State Management**: Proper dealer button rotation, blind posting, and turn-based gameplay

## 🎯 Game Rules

### Objective
Win chips by having the best five-card poker hand or by making other players fold.

### Gameplay Flow
1. **Blinds**: Small blind ($5) and big blind ($10) are posted automatically
2. **Pre-flop**: Each player receives 2 hole cards
3. **Flop**: 3 community cards are revealed
4. **Turn**: 4th community card is revealed
5. **River**: 5th and final community card is revealed
6. **Showdown**: Players reveal their hands, best hand wins the pot

### Betting Actions
- **Fold**: Give up your hand and forfeit the pot
- **Check**: Pass the action without betting (only available when no bet is required)
- **Call**: Match the current bet
- **Raise**: Increase the current bet
- **All-In**: Bet all remaining chips

## 🏆 Hand Rankings
From highest to lowest:
1. **Royal Flush**: A, K, Q, J, 10 of the same suit
2. **Straight Flush**: Five consecutive cards of the same suit
3. **Four of a Kind**: Four cards of the same rank
4. **Full House**: Three of a kind plus a pair
5. **Flush**: Five cards of the same suit
6. **Straight**: Five consecutive cards of any suit
7. **Three of a Kind**: Three cards of the same rank
8. **Two Pair**: Two different pairs
9. **One Pair**: Two cards of the same rank
10. **High Card**: Highest card in hand

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server or build process required!

### Installation
1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start playing!

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd TaxasHoldemPoker

# Open index.html in your browser
# On Windows:
start index.html

# On Mac:
open index.html

# On Linux:
xdg-open index.html
```

## 📁 Project Structure

```
TaxasHoldemPoker/
├── index.html          # Main HTML structure
├── styles.css          # All styling and animations
├── game.js             # Game logic and AI
├── pic/
│   └── chip.png        # Poker chip image
└── README.md           # This file
```

## 🎨 Technical Details

### Technologies Used
- **HTML5**: Semantic markup for game structure
- **CSS3**: Modern styling with animations, gradients, and glassmorphism effects
- **Vanilla JavaScript**: Pure JS implementation with no dependencies
- **Google Fonts**: Outfit font family for clean typography

### Key Features in Code
- **Async/Await Pattern**: Smooth, sequential animations for card dealing
- **Hand Evaluation Algorithm**: Comprehensive poker hand ranking with tie-breaking
- **AI Decision Making**: Dynamic AI with hand strength evaluation and betting strategy
- **State Management**: Robust game state tracking across all betting phases
- **Responsive Design**: Adapts to different screen sizes

## 🎲 How to Play

1. **Start a New Game**: Click the "NEW GAME" button to begin
2. **Your Turn**: When it's your turn, the betting controls will activate
3. **Make Your Move**: Choose to Fold, Check, Call, Raise, or go All-In
4. **Raise Control**: Use the slider to adjust your raise amount
5. **Watch AI Players**: AI opponents will make their decisions automatically
6. **View Results**: At showdown, the winner will be announced with their winning hand
7. **Continue Playing**: Click "Continue" to start the next round

## 🤖 AI Behavior

The AI opponents use a strategy-based decision-making system:
- **Hand Strength Evaluation**: Analyzes current hand and community cards
- **Betting Pattern**: Adjusts aggression based on hand quality
- **Bluffing**: Occasionally raises with medium-strength hands
- **Fold Logic**: Folds weak hands when facing raises
- **All-In Strategy**: Goes all-in with very strong hands

## 📊 Game Configuration

Default settings (can be modified in `game.js`):
- **Starting Chips**: $1000 per player
- **Small Blind**: $5
- **Big Blind**: $10
- **Number of Players**: 4 (1 human + 3 AI)

## 🎯 Future Enhancements

Potential features for future development:
- Tournament mode
- Multiplayer support
- Sound effects and background music
- Player statistics tracking
- Customizable avatars
- Different difficulty levels for AI
- Mobile touch controls optimization

## 📝 License

This project is open source and available for personal and educational use.

## 🙏 Acknowledgments

- Card suits and poker hand rankings based on standard Texas Hold'em rules
- UI design inspired by modern poker applications
- Built with passion for poker and clean code

---

**Enjoy the game! May the best hand win! 🎰**
