import React, { useState, useEffect } from 'react';

const VENDOR_LEAD_TIMES = { red: 1, blue: 1, green: 2, yellow: 2, purple: 3 };
const BASE_PRICES = { red: 100, blue: 150, green: 200, yellow: 300, purple: 500 };

function PurchasePhase({ gameState, playerId, socket, goodsInfo }) {
  const [quantities, setQuantities] = useState({ red: 0, blue: 0, green: 0, yellow: 0, purple: 0 });
  const [quotes, setQuotes] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const myPlayer = gameState.players[playerId];
  const isVendorStrike = gameState.turnModifiers?.vendorStrike;

  useEffect(() => {
    // Calculate total
    let total = 0;
    Object.entries(quantities).forEach(([color, qty]) => {
      if (qty > 0 && quotes[color]) {
        total += quotes[color].totalCost;
      }
    });
    setTotalCost(total);
  }, [quotes]);

  const updateQuantity = (color, qty) => {
    const newQty = Math.max(0, parseInt(qty) || 0);
    setQuantities(prev => ({ ...prev, [color]: newQty }));
    
    if (newQty > 0) {
      socket.emit('get_price_quote', { color, quantity: newQty }, (priceInfo) => {
        setQuotes(prev => ({ ...prev, [color]: priceInfo }));
      });
    } else {
      setQuotes(prev => ({ ...prev, [color]: null }));
    }
  };

  const submitPurchases = () => {
    const purchases = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([color, quantity]) => ({ color, quantity }));
    
    socket.emit('submit_purchases', { purchases }, (res) => {
      if (res.success) {
        setSubmitted(true);
      } else {
        alert(res.error);
      }
    });
  };

  const skipPurchase = () => {
    socket.emit('skip_purchase', {}, (res) => {
      if (res.success) {
        setSubmitted(true);
      }
    });
  };

  if (isVendorStrike) {
    return (
      <div className="purchase-phase">
        <div className="phase-header">
          <h2>🛒 สั่งซื้อจากผู้ขาย</h2>
        </div>
        <div className="vendor-strike-notice">
          <h3>🏭 โรงงานหยุดงาน!</h3>
          <p>ไม่สามารถสั่งซื้อได้ในสัปดาห์นี้</p>
          <button className="btn btn-secondary" onClick={skipPurchase}>
            ✅ รับทราบ
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="purchase-phase">
        <div className="phase-header">
          <h2>🛒 สั่งซื้อจากผู้ขาย</h2>
        </div>
        <div className="submitted-notice">
          <h3>✅ ส่งคำสั่งซื้อแล้ว!</h3>
          <p>รอผู้เล่นคนอื่น...</p>
          <div className="submitted-players">
            {gameState.playerOrder.map(pid => (
              <div key={pid} className="submitted-player">
                {gameState.players[pid]?.name}: {gameState.purchaseSubmitted?.[pid] !== undefined ? '✅' : '⏳'}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-phase">
      <div className="phase-header">
        <h2>🛒 สั่งซื้อจากผู้ขาย</h2>
        <p className="phase-hint">สั่งซื้อสินค้าที่ต้องใช้ จ่ายเงินทันที สินค้าจะมาถึงตาม Lead Time</p>
        <div className="my-cash">💰 เงินที่มี: ฿{myPlayer?.cash?.toLocaleString()}</div>
      </div>

      <div className="vendor-grid">
        {Object.entries(goodsInfo).map(([color, info]) => (
          <div key={color} className="vendor-card" style={{borderTopColor: info.color}}>
            <div className="vendor-header">
              <span className="vendor-emoji">{info.emoji}</span>
              <span className="vendor-name">ผู้ขาย{info.name}</span>
            </div>
            <div className="vendor-info">
              <span>ราคาต่อหน่วย: ฿{BASE_PRICES[color]}</span>
              <span>⏱️ Lead Time: {VENDOR_LEAD_TIMES[color]} สัปดาห์</span>
              <span>🚚 ค่าส่ง: ฿200/shipment</span>
            </div>
            <div className="vendor-order">
              <label>จำนวน:</label>
              <div className="qty-controls">
                <button className="qty-btn" onClick={() => updateQuantity(color, Math.max(0, quantities[color] - 5))}>-5</button>
                <button className="qty-btn" onClick={() => updateQuantity(color, Math.max(0, quantities[color] - 1))}>-</button>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={quantities[color]}
                  onChange={(e) => updateQuantity(color, e.target.value)}
                  onInput={(e) => updateQuantity(color, e.target.value)}
                  className="qty-input"
                  inputMode="numeric"
                />
                <button className="qty-btn" onClick={() => updateQuantity(color, quantities[color] + 1)}>+</button>
                <button className="qty-btn" onClick={() => updateQuantity(color, quantities[color] + 5)}>+5</button>
              </div>
            </div>
            {quotes[color] && quantities[color] > 0 && (
              <div className="quote-info">
                <div>ส่วนลด: {quotes[color].discount}%</div>
                <div>ราคาต่อหน่วย: ฿{quotes[color].unitPrice}</div>
                <div>ค่าส่ง: ฿{quotes[color].shippingCost}</div>
                <div className="quote-total">รวม: ฿{quotes[color].totalCost.toLocaleString()}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="purchase-summary">
        <div className="purchase-total">
          รวมทั้งหมด: <strong>฿{totalCost.toLocaleString()}</strong>
          {totalCost > (myPlayer?.cash || 0) && (
            <span className="over-budget"> ⚠️ เงินไม่พอ!</span>
          )}
        </div>
        <div className="purchase-actions">
          <button 
            className="btn btn-primary"
            onClick={submitPurchases}
            disabled={totalCost > (myPlayer?.cash || 0)}
          >
            🛒 ยืนยันสั่งซื้อ (฿{totalCost.toLocaleString()})
          </button>
          <button className="btn btn-secondary" onClick={skipPurchase}>
            ⏭️ ไม่สั่งซื้อ
          </button>
        </div>
      </div>
    </div>
  );
}

export default PurchasePhase;
