import React from 'react';

function TurnResolution({ gameState, playerId, socket, goodsInfo }) {
  const resLog = gameState.resolutionLog || [];
  const myLog = resLog.find(l => l.playerId === playerId);

  const handleNextTurn = () => {
    socket.emit('next_turn');
  };

  const isHost = gameState.playerOrder[0] === playerId;

  return (
    <div className="turn-resolution">
      <div className="phase-header">
        <h2>📦 สรุปผลประจำสัปดาห์ {gameState.currentTurn}</h2>
      </div>

      <div className="resolution-sections">
        {resLog.map(log => (
          <div key={log.playerId} className={`resolution-player ${log.playerId === playerId ? 'is-me' : ''}`}>
            <h3>{log.playerName} {log.playerId === playerId ? '(คุณ)' : ''}</h3>
            
            {/* Arrivals */}
            {log.arrivals.length > 0 && (
              <div className="resolution-section arrivals">
                <h4>🚚 สินค้ามาถึง:</h4>
                {log.arrivals.map((a, i) => (
                  <div key={i} className="resolution-item">
                    {goodsInfo[a.color]?.emoji} {goodsInfo[a.color]?.name} x{a.quantity}
                  </div>
                ))}
              </div>
            )}

            {/* Deliveries */}
            {log.deliveries.length > 0 && (
              <div className="resolution-section deliveries">
                <h4>📋 ส่งมอบออเดอร์:</h4>
                {log.deliveries.map((d, i) => (
                  <div key={i} className={`resolution-item ${d.netPayment < 0 ? 'negative' : 'positive'}`}>
                    <div>รายได้: ฿{d.payment.toLocaleString()}</div>
                    {d.latePenalty > 0 && <div className="penalty">⚠️ ค่าปรับล่าช้า ({d.turnsLate} สัปดาห์): -฿{d.latePenalty.toLocaleString()}</div>}
                    {d.incompletePenalty > 0 && <div className="penalty">⚠️ ค่าปรับส่งไม่ครบ: -฿{d.incompletePenalty.toLocaleString()}</div>}
                    <div className="net-payment">
                      สุทธิ: <strong className={d.netPayment >= 0 ? 'positive' : 'negative'}>
                        ฿{d.netPayment.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Overflow */}
            {log.overflow && log.overflow.cost > 0 && (
              <div className="resolution-section overflow">
                <h4>⚠️ คลังล้น:</h4>
                <div className="resolution-item negative">
                  เกิน {log.overflow.units} หน่วย — ค่าเช่าเพิ่ม: -฿{log.overflow.cost.toLocaleString()}
                </div>
              </div>
            )}

            {log.arrivals.length === 0 && log.deliveries.length === 0 && (!log.overflow || log.overflow.cost === 0) && (
              <div className="resolution-section">
                <p className="no-activity">ไม่มีกิจกรรม</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {isHost && (
        <button className="btn btn-primary btn-large" onClick={handleNextTurn}>
          {gameState.currentTurn >= gameState.maxTurns ? '🏁 จบเกม' : '➡️ สัปดาห์ถัดไป'}
        </button>
      )}
      {!isHost && (
        <p className="waiting-host">รอเจ้าห้องเริ่มรอบถัดไป...</p>
      )}
    </div>
  );
}

export default TurnResolution;
