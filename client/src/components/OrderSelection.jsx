import React from 'react';

const VENDOR_INFO = {
  red: { basePrice: 100, leadTime: 1 },
  blue: { basePrice: 150, leadTime: 1 },
  green: { basePrice: 200, leadTime: 2 },
  yellow: { basePrice: 300, leadTime: 2 }
};

function OrderSelection({ gameState, playerId, socket, goodsInfo }) {
  const isMyTurn = gameState.currentOrderPicker === playerId;
  const currentPicker = gameState.players[gameState.currentOrderPicker];

  const claimOrder = (orderId) => {
    socket.emit('claim_order', { orderId }, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const passOrder = () => {
    socket.emit('pass_order', {}, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  return (
    <div className="order-selection">
      <div className="phase-header">
        <h2>📋 เลือกออเดอร์ลูกค้า</h2>
        {isMyTurn ? (
          <div className="turn-indicator my-turn">🎯 ตาของคุณ! เลือกออเดอร์หรือผ่าน</div>
        ) : (
          <div className="turn-indicator other-turn">
            ⏳ รอ {currentPicker?.name} เลือก...
          </div>
        )}
      </div>

      {/* Vendor reference info */}
      <div className="vendor-ref-bar">
        <span className="vendor-ref-label">📦 ต้นทุนซื้อ:</span>
        {Object.entries(goodsInfo).map(([color, info]) => (
          <span key={color} className="vendor-ref-item">
            <span style={{ color: info.color }}>{info.symbol}</span>
            {' '}฿{VENDOR_INFO[color].basePrice} ({VENDOR_INFO[color].leadTime}w)
          </span>
        ))}
      </div>

      <div className="orders-grid">
        {gameState.availableOrders.map(order => (
          <div key={order.id} className={`order-card ${order.isInstant ? 'instant-order' : ''}`}>
            <div className="order-card-header">
              <span className="order-value">฿{order.totalValue.toLocaleString()}</span>
              <div>
                <span className="order-multiplier">x{order.multiplier}</span>
                {order.isInstant && <span className="instant-badge">⚡ ส่งทันที</span>}
              </div>
            </div>
            
            <div className="order-items">
              {order.items.map((item, i) => (
                <div key={i} className="order-item" style={{borderLeftColor: goodsInfo[item.color]?.color}}>
                  <span className="order-item-symbol" style={{ color: goodsInfo[item.color]?.color }}>
                    {goodsInfo[item.color]?.symbol}
                  </span>
                  <span className="order-item-name">{goodsInfo[item.color]?.name}</span>
                  <span className="order-item-cost">@฿{VENDOR_INFO[item.color].basePrice}</span>
                  <span className="order-item-qty">x{item.quantity}</span>
                </div>
              ))}
            </div>
            
            <div className="order-card-footer">
              {order.isInstant ? (
                <span className="order-deadline instant">⚡ ต้องส่งเดี๋ยวนี้! (ใช้ของในคลัง)</span>
              ) : (
                <span className="order-deadline">
                  ⏰ กำหนด: สัปดาห์ {order.dueTurn} ({order.leadTime} สัปดาห์)
                </span>
              )}
            </div>
            
            {isMyTurn && (
              <button 
                className="btn btn-claim"
                onClick={() => claimOrder(order.id)}
              >
                ✋ รับออเดอร์นี้
              </button>
            )}
          </div>
        ))}
      </div>

      {gameState.availableOrders.length === 0 && (
        <div className="no-orders-msg">ไม่มีออเดอร์เหลือ</div>
      )}

      {isMyTurn && (
        <button className="btn btn-secondary btn-pass" onClick={passOrder}>
          ⏭️ ผ่าน (ไม่รับออเดอร์เพิ่ม)
        </button>
      )}
    </div>
  );
}

export default OrderSelection;
