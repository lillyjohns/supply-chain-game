import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

const socket = io(window.location.origin, {
  transports: ['websocket', 'polling']
});

function App() {
  const [screen, setScreen] = useState('home'); // home, lobby, game
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('game_state', (state) => {
      setGameState(state);
      if (state.phase !== 'lobby' && screen === 'lobby') {
        setScreen('game');
      }
    });

    return () => {
      socket.off('game_state');
    };
  }, [screen]);

  // Auto-rejoin on page reload
  useEffect(() => {
    const savedRoom = localStorage.getItem('scg_room');
    const savedName = localStorage.getItem('scg_name');
    if (savedRoom && savedName) {
      setPlayerName(savedName);
      setRoomCode(savedRoom);
      socket.emit('join_game', { name: savedName, roomCode: savedRoom }, (res) => {
        if (res.success) {
          setPlayerId(res.playerId);
          setRoomCode(res.roomCode);
          setScreen(res.rejoined ? 'game' : 'lobby');
        } else {
          // Game gone, clear storage
          localStorage.removeItem('scg_room');
          localStorage.removeItem('scg_name');
        }
      });
    }
  }, []);

  const createGame = () => {
    if (!playerName.trim()) { setError('กรุณาใส่ชื่อ'); return; }
    socket.emit('create_game', { name: playerName.trim() }, (res) => {
      if (res.success) {
        setPlayerId(res.playerId);
        setRoomCode(res.roomCode);
        setScreen('lobby');
        setError('');
        localStorage.setItem('scg_room', res.roomCode);
        localStorage.setItem('scg_name', playerName.trim());
      } else {
        setError(res.error);
      }
    });
  };

  const joinGame = () => {
    if (!playerName.trim()) { setError('กรุณาใส่ชื่อ'); return; }
    if (!roomCode.trim()) { setError('กรุณาใส่รหัสห้อง'); return; }
    socket.emit('join_game', { name: playerName.trim(), roomCode: roomCode.trim() }, (res) => {
      if (res.success) {
        setPlayerId(res.playerId);
        setRoomCode(res.roomCode);
        setScreen(res.rejoined ? 'game' : 'lobby');
        setError('');
        localStorage.setItem('scg_room', res.roomCode);
        localStorage.setItem('scg_name', playerName.trim());
      } else {
        setError(res.error);
      }
    });
  };

  if (screen === 'home') {
    return (
      <div className="home-screen">
        <div className="home-container">
          <h1 className="game-title">📦 Supply Chain Broker</h1>
          <h2 className="game-subtitle">เกมนายหน้าซัพพลายเชน</h2>
          
          <div className="home-form">
            <input
              type="text"
              placeholder="ชื่อผู้เล่น"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input-field"
              maxLength={20}
            />
            
            <button onClick={createGame} className="btn btn-primary">
              🎮 สร้างห้อง
            </button>
            
            <div className="divider">หรือ</div>
            
            <input
              type="text"
              placeholder="รหัสห้อง (4 ตัวอักษร)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="input-field"
              maxLength={4}
            />
            
            <button onClick={joinGame} className="btn btn-secondary">
              🚪 เข้าร่วม
            </button>
            
            {error && <div className="error-msg">{error}</div>}
          </div>

          <div className="rules-summary">
            <h3>📋 กติกา</h3>
            <ul>
              <li>เป็นนายหน้าซื้อขายสินค้า 5 สี</li>
              <li>รับออเดอร์จากลูกค้า → สั่งซื้อจากผู้ขาย → ส่งมอบ</li>
              <li>เล่น 10 รอบ ใครมีเงินมากสุดชนะ!</li>
              <li>ระวัง: ส่งช้า = โดนปรับ / คลังล้น = เสียค่าเช่า</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <Lobby
        gameState={gameState}
        playerId={playerId}
        roomCode={roomCode}
        socket={socket}
      />
    );
  }

  return (
    <GameBoard
      gameState={gameState}
      playerId={playerId}
      socket={socket}
    />
  );
}

export default App;
