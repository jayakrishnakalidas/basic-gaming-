const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ── Chess Multiplayer Room Management ──
const chessRooms = new Map(); // roomCode -> { players: [ws, ws], colors: { ws1: 'white', ws2: 'black' }, state }

function generateRoomCode() {
  let code;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (chessRooms.has(code));
  return code;
}

function broadcastToRoom(roomCode, message, excludeWs = null) {
  const room = chessRooms.get(roomCode);
  if (!room) return;
  const data = JSON.stringify(message);
  room.players.forEach(ws => {
    if (ws !== excludeWs && ws.readyState === 1) {
      ws.send(data);
    }
  });
}

function cleanupRoom(roomCode) {
  const room = chessRooms.get(roomCode);
  if (!room) return;
  room.players.forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'opponent_disconnected' }));
    }
    ws.chessRoom = null;
  });
  chessRooms.delete(roomCode);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm'
};

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  // Normalize URL
  let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  // API endpoint for server info
  if (req.url === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      port: PORT,
      localIps: getLocalIpAddresses()
    }));
  }

  let filePath = path.join(PUBLIC_DIR, safePath);

  // If directory, append index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, indexContent) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
            res.end(indexContent);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n==================================================');
  console.log('🎮 LOCAL WEB ARCADE IS RUNNING! 🎮');
  console.log('==================================================');
  console.log(`💻 Desktop Access:   http://localhost:${PORT}`);
  
  const localIps = getLocalIpAddresses();
  if (localIps.length > 0) {
    console.log(`📱 Mobile Access:    http://${localIps[0]}:${PORT}`);
    localIps.slice(1).forEach(ip => {
      console.log(`   Alternative IP:   http://${ip}:${PORT}`);
    });
  } else {
    console.log('📱 Mobile Access: Connect to Wi-Fi to see your local IP address');
  }
  console.log('==================================================\n');
});

// ── WebSocket Server for Chess Multiplayer ──
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.chessRoom = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create_room': {
        const code = generateRoomCode();
        chessRooms.set(code, {
          players: [ws],
          colors: new Map([[ws, 'white']]),
        });
        ws.chessRoom = code;
        ws.send(JSON.stringify({ type: 'room_created', roomCode: code, color: 'white' }));
        break;
      }

      case 'join_room': {
        const code = msg.roomCode;
        const room = chessRooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found. Check the code and try again.' }));
          return;
        }
        if (room.players.length >= 2) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room is already full.' }));
          return;
        }
        room.players.push(ws);
        room.colors.set(ws, 'black');
        ws.chessRoom = code;
        ws.send(JSON.stringify({ type: 'room_joined', roomCode: code, color: 'black' }));
        // Notify the host that opponent joined → start the game
        broadcastToRoom(code, { type: 'game_start' });
        break;
      }

      case 'move': {
        if (!ws.chessRoom) return;
        broadcastToRoom(ws.chessRoom, {
          type: 'opponent_move',
          from: msg.from,
          to: msg.to,
          promotion: msg.promotion || null
        }, ws);
        break;
      }

      case 'resign': {
        if (!ws.chessRoom) return;
        broadcastToRoom(ws.chessRoom, { type: 'opponent_resigned' }, ws);
        cleanupRoom(ws.chessRoom);
        break;
      }

      case 'leave_room': {
        if (ws.chessRoom) {
          cleanupRoom(ws.chessRoom);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (ws.chessRoom) {
      cleanupRoom(ws.chessRoom);
    }
  });
});
