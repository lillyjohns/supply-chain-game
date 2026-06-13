import React from 'react';

function Lobby({ gameState, playerId, roomCode, socket }) {
  const isHost = gameState?.players && Object.keys(gameState.players).length > 0 && 
    gameState.playerOrder[0] === playerId;
  const playerCount = gameState?.playerOrder?.length || 0;

  const startGame = () => {
    socket.emit('start_game', {}, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-container">
        <h1>📦 ห้องรอ</h1>
        
        <div className="room-code-display">
          <span className="room-label">รหัสห้อง:</span>
          <span className="room-code">{roomCode}</span>
        </div>
        
        <p className="room-hint">แชร์รหัสนี้ให้เพื่อนเพื่อเข้าร่วม</p>

        <div className="player-list">
          <h3>ผู้เล่น ({playerCount}/4)</h3>
          {gameState?.playerOrder?.map((pid, idx) => (
            <div key={pid} className={`player-item ${pid === playerId ? 'is-me' : ''}`}>
              <span className="player-number">{idx + 1}.</span>
              <span className="player-name">{gameState.players[pid]?.name}</span>
              {idx === 0 && <span className="host-badge">👑 เจ้าห้อง</span>}
              {pid === playerId && <span className="me-badge">← คุณ</span>}
            </div>
          ))}
          
          {playerCount < 4 && (
            <div className="player-item waiting">
              <span className="waiting-text">รอผู้เล่น...</span>
            </div>
          )}
        </div>

        {isHost && (
          <button 
            onClick={startGame} 
            className="btn btn-primary btn-large"
            disabled={playerCount < 2}
          >
            🚀 เริ่มเกม! ({playerCount >= 2 ? 'พร้อม' : 'ต้องการอย่างน้อย 2 คน'})
          </button>
        )}

        {!isHost && (
          <p className="waiting-host">รอเจ้าห้องเริ่มเกม...</p>
        )}
      </div>
    </div>
  );
}

export default Lobby;
