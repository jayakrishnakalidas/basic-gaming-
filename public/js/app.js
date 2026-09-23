// Games dataset
const gamesData = [
  {
    id: 'snake',
    title: 'Cyber Snake',
    icon: '🐍',
    category: 'Arcade',
    description: 'Classic arcade snake with glowing neon visuals. Eat energy orbs and avoid crashing into walls!',
    path: 'games/snake/index.html'
  },
  {
    id: 'pong',
    title: 'Neon Pong',
    icon: '🏓',
    category: 'Action',
    description: 'Fast-paced table tennis action against smart AI with smooth touch & keyboard controls.',
    path: 'games/pong/index.html'
  },
  {
    id: 'flappy',
    title: 'Flappy Cyber',
    icon: '🐤',
    category: 'Arcade',
    description: 'Tap to flap! Navigate your cyber bird through pixel pipes in this addictive tapper.',
    path: 'games/flappy/index.html'
  },
  {
    id: '2048',
    title: '2048 Neon Tile',
    icon: '🧩',
    category: 'Puzzle',
    description: 'Slide tiles and combine matching numbers to reach the elusive 2048 tile!',
    path: 'games/2048/index.html'
  },
  {
    id: 'space-invaders',
    title: 'Space Defender',
    icon: '🚀',
    category: 'Action',
    description: 'Defend Earth from waves of alien invaders! Shoot, dodge, and conquer space.',
    path: 'games/space-invaders/index.html'
  },
  {
    id: 'breakout',
    title: 'Brick Breaker',
    icon: '🧱',
    category: 'Classic',
    description: 'Bounce the ball off your paddle to shatter neon bricks in this timeless arcade hit.',
    path: 'games/breakout/index.html'
  },
  {
    id: 'memory',
    title: 'Memory Match',
    icon: '🃏',
    category: 'Puzzle',
    description: 'Test your brain memory by uncovering matching cards before time runs out.',
    path: 'games/memory/index.html'
  },
  {
    id: 'cyber-dash',
    title: 'Cyber Dash',
    icon: '🏃',
    category: 'Arcade',
    description: 'Endless runner! Jump over obstacles and duck under laser hurdles to reach a high score.',
    path: 'games/cyber-dash/index.html'
  },
  {
    id: 'pacman',
    title: 'Cyber Pac-Man',
    icon: '🟡',
    category: 'Arcade',
    description: 'Eat pellets and power-orbs in a neon maze while outsmarting roaming ghost AI!',
    path: 'games/pacman/index.html'
  },
  {
    id: 'tictactoe',
    title: 'Cyber Tic-Tac-Toe',
    icon: '❌',
    category: 'Puzzle',
    description: 'Play against an unbeatable AI or challenge a friend in 2-Player pass-and-play mode!',
    path: 'games/tictactoe/index.html'
  },
  {
    id: 'connect4',
    title: 'Connect 4',
    icon: '🔴',
    category: 'Strategy',
    description: 'Drop discs and get four in a row! Challenge the AI or play local 2-player.',
    path: 'games/connect4/index.html'
  }
];

let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderGames();
  setupEventListeners();
  fetchServerInfo();
});

// Fetch local IP address from server to display to user
async function fetchServerInfo() {
  try {
    const res = await fetch('api/info');
    if (!res.ok) throw new Error('Not Node API');
    const data = await res.json();
    const ipContainer = document.getElementById('ipAddressText');
    if (data.localIps && data.localIps.length > 0) {
      ipContainer.textContent = `http://${data.localIps[0]}:${data.port}`;
    } else {
      ipContainer.textContent = `http://${window.location.hostname}:${data.port}`;
    }
  } catch (err) {
    document.getElementById('ipAddressText').textContent = window.location.host;
  }
}


// Render game cards dynamically
function renderGames() {
  const container = document.getElementById('gamesGrid');
  const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();

  const filtered = gamesData.filter(game => {
    const matchesCategory = activeCategory === 'all' || game.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = game.title.toLowerCase().includes(searchInput) || game.description.toLowerCase().includes(searchInput);
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
        <p style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</p>
        <p>No games found matching your search.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(game => `
    <div class="game-card" onclick="openGame('${game.id}')">
      <div class="card-banner">${game.icon}</div>
      <div class="card-body">
        <h3 class="card-title">${game.title}</h3>
        <p class="card-desc">${game.description}</p>
        <div class="card-footer">
          <span class="tag">${game.category}</span>
          <button class="play-btn" onclick="event.stopPropagation(); openGame('${game.id}')">
            <span>Play</span> ▶
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Setup event listeners
function setupEventListeners() {
  // Search input
  document.getElementById('searchInput').addEventListener('input', renderGames);

  // Category filter buttons
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.dataset.cat;
      renderGames();
    });
  });

  // Modal close
  document.getElementById('closeModal').addEventListener('click', closeGame);

  // Fullscreen button
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGame();
  });
}

// Launch Game Modal
function openGame(gameId) {
  const game = gamesData.find(g => g.id === gameId);
  if (!game) return;

  const modal = document.getElementById('gameModal');
  const iframe = document.getElementById('gameIframe');
  const titleEl = document.getElementById('modalGameTitle');

  titleEl.innerHTML = `<span>${game.icon}</span> ${game.title}`;
  iframe.src = game.path;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close Game Modal
function closeGame() {
  const modal = document.getElementById('gameModal');
  const iframe = document.getElementById('gameIframe');
  
  modal.classList.remove('active');
  iframe.src = '';
  document.body.style.overflow = '';
}

// Toggle Fullscreen mode for immersive phone / desktop play
function toggleFullscreen() {
  const container = document.getElementById('iframeContainer');
  if (!document.fullscreenElement) {
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
