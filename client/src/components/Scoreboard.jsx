import React from 'react';

function Scoreboard({ gameState, playerId }) {
  const scores = gameState.scores || [];

  return (
    <div className="scoreboard-screen">
      <div className="scoreboard-container">
        <h1>🏆 จบเกม!</h1>
        <h2>ผลการแข่งขัน 8 สัปดาห์</h2>

        <div className="scoreboard-list">
          {scores.map((score, idx) => (
            <div 
              key={score.playerId} 
              className={`scoreboard-entry ${idx === 0 ? 'winner' : ''} ${score.playerId === playerId ? 'is-me' : ''}`}
            >
              <div className="score-rank">
                {idx === 0 && '🥇'}
                {idx === 1 && '🥈'}
                {idx === 2 && '🥉'}
                {idx >= 3 && `#${idx + 1}`}
              </div>
              <div className="score-details">
                <div className="score-name">
                  {score.playerName}
                  {score.playerId === playerId && ' (คุณ)'}
                </div>
                <div className="score-breakdown">
                  <div className="score-item">💰 เงินสด: ฿{score.cash.toLocaleString()}</div>
                  <div className="score-item">📦 มูลค่าสินค้าคงเหลือ (90%): +฿{score.inventoryValue.toLocaleString()}</div>
                  {score.inTransitValue > 0 && (
                    <div className="score-item">🚚 สินค้าระหว่างทาง: ฿{score.inTransitValue.toLocaleString()}</div>
                  )}
                  {score.unfulfilledPenalty > 0 && (
                    <div className="score-item negative">⚠️ ค่าปรับออเดอร์เลยกำหนด: -฿{score.unfulfilledPenalty.toLocaleString()}</div>
                  )}
                </div>
                <div className="score-stats">
                  <span>รายได้รวม: ฿{score.totalRevenue.toLocaleString()}</span>
                  <span>ต้นทุนรวม: ฿{score.totalCosts.toLocaleString()}</span>
                  <span>ค่าปรับรวม: ฿{score.totalPenalties.toLocaleString()}</span>
                  <span>ออเดอร์สำเร็จ: {score.completedOrders}</span>
                </div>
              </div>
              <div className="score-final">
                <div className="score-final-label">คะแนนรวม</div>
                <div className="score-final-value">฿{score.finalScore.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-large" onClick={() => window.location.reload()}>
          🔄 เล่นใหม่
        </button>
      </div>
    </div>
  );
}

export default Scoreboard;
