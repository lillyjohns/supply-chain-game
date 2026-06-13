const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const {
  PHASES, createGame, addPlayer, removePlayer, startGame,
  moveToOrderSelection, claimOrder, passOrderSelection,
  submitPurchases, skipPurchase, nextTurn, getGameState
} = require('./game');
const { getVendorPrice } = require('./pricing');
const { GOODS, GOOD_COLORS, BULK_DISCOUNTS, SHIPPING_COST, WAREHOUSE_CAPACITY } = require('./constants');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Store active games
const games = {};

// Generate room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Socket.IO
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  let currentRoom = null;
  let playerName = null;

  socket.on('create_game', (data, callback) => {
    const roomCode = generateRoomCode();
    const game = createGame(roomCode, socket.id);
    games[roomCode] = game;
    
    playerName = data.name || 'ผู้เล่น';
    addPlayer(game, socket.id, playerName);
    socket.join(roomCode);
    currentRoom = roomCode;
    
    callback({ success: true, roomCode, playerId: socket.id });
    io.to(roomCode).emit('game_state', getGameState(game, socket.id));
  });

  socket.on('join_game', (data, callback) => {
    const roomCode = (data.roomCode || '').toUpperCase();
    const game = games[roomCode];
    
    if (!game) {
      callback({ success: false, error: 'ไม่พบห้อง' });
      return;
    }

    // Allow rejoin if game already started — match by name
    if (game.phase !== PHASES.LOBBY) {
      const rejoinName = (data.name || '').trim();
      const existingEntry = Object.entries(game.players).find(
        ([pid, p]) => p.name === rejoinName
      );
      if (existingEntry) {
        const [oldId, playerData] = existingEntry;
        // Swap socket id
        game.players[socket.id] = playerData;
        delete game.players[oldId];
        // Update playerOrder
        const idx = game.playerOrder.indexOf(oldId);
        if (idx !== -1) game.playerOrder[idx] = socket.id;
        // Update host if needed
        if (game.hostId === oldId) game.hostId = socket.id;
        // Update currentOrderPicker if needed
        if (game.currentOrderPicker === oldId) game.currentOrderPicker = socket.id;
        
        playerName = rejoinName;
        socket.join(roomCode);
        currentRoom = roomCode;
        callback({ success: true, roomCode, playerId: socket.id, rejoined: true });
        io.to(roomCode).emit('game_state', getGameState(game, socket.id));
        console.log(`Player ${rejoinName} rejoined room ${roomCode}`);
        return;
      }
      callback({ success: false, error: 'เกมเริ่มแล้ว — ใส่ชื่อเดิมเพื่อกลับเข้าเกม' });
      return;
    }

    if (Object.keys(game.players).length >= 4) {
      callback({ success: false, error: 'ห้องเต็ม' });
      return;
    }

    playerName = data.name || 'ผู้เล่น';
    addPlayer(game, socket.id, playerName);
    socket.join(roomCode);
    currentRoom = roomCode;
    
    callback({ success: true, roomCode, playerId: socket.id });
    io.to(roomCode).emit('game_state', getGameState(game, socket.id));
  });

  socket.on('start_game', (data, callback) => {
    if (!currentRoom) { callback({ success: false, error: 'ไม่ได้อยู่ในห้อง' }); return; }
    const game = games[currentRoom];
    if (!game) { callback({ success: false, error: 'ไม่พบเกม' }); return; }
    if (game.hostId !== socket.id) { callback({ success: false, error: 'เฉพาะเจ้าห้องเท่านั้น' }); return; }
    
    const result = startGame(game);
    if (!result) { callback({ success: false, error: 'ต้องมีผู้เล่นอย่างน้อย 2 คน' }); return; }
    
    callback({ success: true });
    io.to(currentRoom).emit('game_state', getGameState(game, socket.id));
  });

  socket.on('event_acknowledged', () => {
    if (!currentRoom) return;
    const game = games[currentRoom];
    if (!game || game.phase !== PHASES.EVENT) return;
    
    moveToOrderSelection(game);
    io.to(currentRoom).emit('game_state', getGameState(game, socket.id));
  });

  socket.on('claim_order', (data, callback) => {
    if (!currentRoom) { callback({ success: false, error: 'ไม่ได้อยู่ในห้อง' }); return; }
    const game = games[currentRoom];
    if (!game) { callback({ success: false, error: 'ไม่พบเกม' }); return; }
    
    const result = claimOrder(game, socket.id, data.orderId);
    callback(result);
    io.to(currentRoom).emit('game_state', getGameState(game, socket.id));
  });

  socket.on('pass_order', (data, callback) => {
    if (!currentRoom) { callback({ success: false, error: 'ไม่ได้อยู่ในห้อง' }); return; }
    const game = games[currentRoom];
    if (!game) { callback({ success: false, error: 'ไม่พบเกม' }); return; }
    
    const result = passOrderSelection(game, socket.id);
    callback(result);
    io.to(currentRoom).emit('game_state', getGameState(game, socket.id));
  });

  socket.on('submit_purchases', (data, callback) => {
    if (!currentRoom) { callback({ success: false, error: 'ไม่ได้อยู่ในห้อง' }); return; }
    const game = games[currentRoom];
    if (!game) { callback({ success: false, error: 'ไม่พบเกม' }); return; }
    
    const result = submitPurchases(game, socket.id, data.purchases || []);
    callback(result);
    if (result.success) {
      io.to(currentRoom).emit('game_state', getGameState(game, socket.id));
    }
  });

  socket.on('skip_purchase', (data, callback) => {
    if (!currentRoom) { callback({ success: false, error: 'ไม่ได้อยู่ในห้อง' }); return; }
    const game = games[currentRoom];
    if (!game) { callback({ success: false, error: 'ไม่พบเกม' }); return; }
    
    const result = skipPurchase(game, socket.id);
    callback(result);
    io.to(currentRoom).emit('game_state', getGameState(game, socket.id));
  });

  socket.on('next_turn', () => {
    if (!currentRoom) return;
    const game = games[currentRoom];
    if (!game) return;
    
    nextTurn(game);
    io.to(currentRoom).emit('game_state', getGameState(game, socket.id));
  });

  socket.on('get_price_quote', (data, callback) => {
    if (!currentRoom) { callback({ error: 'ไม่ได้อยู่ในห้อง' }); return; }
    const game = games[currentRoom];
    const priceInfo = getVendorPrice(data.color, data.quantity, game ? game.turnModifiers : {});
    callback(priceInfo);
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (currentRoom && games[currentRoom]) {
      const game = games[currentRoom];
      if (game.phase === PHASES.LOBBY) {
        removePlayer(game, socket.id);
        if (Object.keys(game.players).length === 0) {
          delete games[currentRoom];
        } else {
          io.to(currentRoom).emit('game_state', getGameState(game, null));
        }
      }
      // During game, player stays but disconnected (could add reconnection logic)
    }
  });
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Supply Chain Game server running on port ${PORT}`);
});
