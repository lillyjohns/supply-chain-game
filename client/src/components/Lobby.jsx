import React from 'react';

function Lobby({ gameState, playerId, roomCode, socket }) {
  const isHost = gameState?.players && Object.keys(gameState.players).length > 0 && 
    gameState.playerOrder[0] === playerId;
  const playerCount = gameState?.playerOrder?.length || 0;
  const botCount = gameState?.playerOrder?.filter(id => id.startsWith('bot_')).length || 0;

  const startGame = () => {
    socket.emit('start_game', {}, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const addBot = () => {
    socket.emit('add_bot', {}, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const removeBot = () => {
    socket.emit('remove_bot', {}, (res) => {
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
        
        <p className="room-hint">แชร์รหัสนี้ให้เพื่อนเพื่อเข้าร่วม หรือเพิ่ม Bot เพื่อเล่นคนเดียว</p>

        <div className="player-list">
          <h3>ผู้เล่น ({playerCount}/4)</h3>
          {gameState?.playerOrder?.map((pid, idx) => (
            <div key={pid} className={`player-item ${pid === playerId ? 'is-me' : ''} ${pid.startsWith('bot_') ? 'is-bot' : ''}`}>
              <span className="player-number">{idx + 1}.</span>
              <span className="player-name">{gameState.players[pid]?.name}</span>
              {idx === 0 && !pid.startsWith('bot_') && <span className="host-badge">👑 เจ้าห้อง</span>}
              {pid === playerId && <span className="me-badge">← คุณ</span>}
              {pid.startsWith('bot_') && <span className="bot-badge">🤖</span>}
            </div>
          ))}
          
          {playerCount < 4 && (
            <div className="player-item waiting">
              <span className="waiting-text">รอผู้เล่น...</span>
            </div>
          )}
        </div>

        {isHost && (
          <div className="lobby-actions">
            {/* Bot controls */}
            <div className="bot-controls">
              <button 
                onClick={addBot} 
                className="btn btn-secondary"
                disabled={playerCount >= 4}
              >
                🤖 + เพิ่ม Bot
              </button>
              {botCount > 0 && (
                <button onClick={removeBot} className="btn btn-secondary">
                  ➖ ลบ Bot
                </button>
              )}
            </div>

            <button 
              onClick={startGame} 
              className="btn btn-primary btn-large"
              disabled={playerCount < 2}
            >
              🚀 เริ่มเกม! ({playerCount >= 2 ? 'พร้อม' : 'ต้องการอย่างน้อย 2 คน'})
            </button>
          </div>
        )}

        {!isHost && (
          <p className="waiting-host">รอเจ้าห้องเริ่มเกม...</p>
        )}
      </div>
    </div>
  );
}

export default Lobby;
