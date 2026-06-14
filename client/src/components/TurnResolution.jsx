import React, { useState, useEffect } from 'react';

function AnimatedNumber({ value, prefix = '฿', className = '' }) {
  const [displayed, setDisplayed] = useState(0);
  
  useEffect(() => {
    const target = value;
    const duration = 800;
    const start = Date.now();
    const startVal = 0;
    
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [value]);
  
  return <span className={className}>{prefix}{displayed.toLocaleString()}</span>;
}

function TurnResolution({ gameState, playerId, socket, goodsInfo }) {
  const resLog = gameState.resolutionLog || [];
  const myLog = resLog.find(l => l.playerId === playerId);
  const [revealedDeliveries, setRevealedDeliveries] = useState(0);

  const handleNextTurn = () => {
    socket.emit('next_turn');
  };

  const isHost = gameState.playerOrder[0] === playerId;
  const myDeliveries = myLog?.deliveries || [];

  // Auto-reveal deliveries one by one
  useEffect(() => {
    if (myDeliveries.length > 0 && revealedDeliveries < myDeliveries.length) {
      const timer = setTimeout(() => {
        setRevealedDeliveries(prev => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [revealedDeliveries, myDeliveries.length]);

  // Reset revealed count when turn changes
  useEffect(() => {
    setRevealedDeliveries(0);
  }, [gameState.currentTurn]);

  return (
    <div className="turn-resolution">
      <div className="phase-header">
        <h2>📦 สรุปผลประจำสัปดาห์ {gameState.currentTurn}</h2>
        <p className="phase-hint">รับสินค้า → คิดค่าเช่า → ขายสินค้า</p>
      </div>

      <div className="resolution-sections">
        {resLog.map(log => (
          <div key={log.playerId} className={`resolution-player ${log.playerId === playerId ? 'is-me' : ''}`}>
            <h3>{log.playerName} {log.playerId === playerId ? '(คุณ)' : ''}</h3>
            
            {/* 1.1 Arrivals */}
            {log.arrivals.length > 0 && (
              <div className="resolution-section arrivals anim-slide-in">
                <h4>🚚 สินค้ามาถึง:</h4>
                {log.arrivals.map((a, i) => (
                  <div key={i} className="resolution-item arrival-item anim-pop">
                    <span className="goods-symbol" style={{ color: goodsInfo[a.color]?.color }}>
                      {goodsInfo[a.color]?.symbol}
                    </span>
                    {' '}{goodsInfo[a.color]?.name} x{a.quantity}
                  </div>
                ))}
              </div>
            )}

            {/* 1.2 Overflow */}
            {log.overflow && log.overflow.cost > 0 && (
              <div className="resolution-section overflow anim-slide-in">
                <h4>⚠️ คลังล้น:</h4>
                <div className="resolution-item negative anim-shake">
                  เกิน {log.overflow.units} หน่วย — ค่าเช่าเพิ่ม: <span className="money-red">-฿{log.overflow.cost.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* 1.3 Deliveries - detailed per order */}
            {log.deliveries.length > 0 && (
              <div className="resolution-section deliveries">
                <h4>📋 ส่งมอบออเดอร์:</h4>
                {log.deliveries.map((d, i) => {
                  const show = log.playerId === playerId ? i < revealedDeliveries : true;
                  if (!show) return null;
                  return (
                    <div key={i} className="delivery-detail-card anim-slide-in">
                      {/* Items in this order */}
                      <div className="delivery-items">
                        {d.items?.map((item, j) => (
                          <span key={j} className="delivery-item-badge">
                            <span style={{ color: goodsInfo[item.color]?.color }}>{goodsInfo[item.color]?.symbol}</span>
                            {' '}x{item.quantity}
                          </span>
                        ))}
                        {!d.isComplete && <span className="incomplete-badge">❌ ส่งไม่ครบ</span>}
                      </div>
                      
                      {/* Calculation breakdown */}
                      <div className="delivery-calc">
                        <div className="calc-row positive">
                          <span>💰 รายได้:</span>
                          <AnimatedNumber value={d.revenue} className="money-green" />
                        </div>
                        <div className="calc-row neutral">
                          <span>📦 ต้นทุนสินค้า (รวม ship):</span>
                          <span className="money-muted">-฿{d.costOfGoods?.toLocaleString()}</span>
                        </div>
                        {d.latePenalty > 0 && (
                          <div className="calc-row negative">
                            <span>⏰ ค่าปรับล่าช้า ({d.turnsLate} สัปดาห์):</span>
                            <span className="money-red">-฿{d.latePenalty.toLocaleString()}</span>
                          </div>
                        )}
                        {d.incompletePenalty > 0 && (
                          <div className="calc-row negative">
                            <span>❌ ค่าปรับส่งไม่ครบ:</span>
                            <span className="money-red">-฿{d.incompletePenalty.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="calc-row total">
                          <span>📊 กำไรจาก order นี้:</span>
                          <strong className={d.netPayment >= 0 ? 'money-green' : 'money-red'}>
                            ฿{d.netPayment.toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Summary after all orders */}
                {log.playerId === playerId && revealedDeliveries >= myDeliveries.length && myDeliveries.length > 0 && (
                  <div className="delivery-summary anim-pop">
                    <div className="summary-cash">
                      💰 เงินคงเหลือ: <AnimatedNumber value={log.cashAfter} className="money-big" />
                    </div>
                  </div>
                )}
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
          ➡️ ดูเหตุการณ์
        </button>
      )}
      {!isHost && (
        <p className="waiting-host">รอเจ้าห้อง...</p>
      )}
    </div>
  );
}

export default TurnResolution;
