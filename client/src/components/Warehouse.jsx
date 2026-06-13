import React from 'react';

function Warehouse({ player, goodsInfo }) {
  if (!player) return null;
  
  const totalUnits = Object.values(player.warehouse).reduce((a, b) => a + b, 0);
  const capacity = 50;
  const fillPercent = Math.min(100, (totalUnits / capacity) * 100);

  return (
    <div className="warehouse-panel">
      <h3>🏭 คลังสินค้า</h3>
      
      <div className="warehouse-bar-container">
        <div 
          className={`warehouse-bar ${fillPercent > 90 ? 'critical' : fillPercent > 70 ? 'warning' : ''}`}
          style={{ width: `${fillPercent}%` }}
        />
        <span className="warehouse-count">{totalUnits}/{capacity}</span>
      </div>

      <div className="warehouse-grid">
        {Object.entries(goodsInfo).map(([color, info]) => (
          <div key={color} className="warehouse-item">
            <span className="warehouse-item-emoji">{info.emoji}</span>
            <span className="warehouse-item-name">{info.name}</span>
            <span className="warehouse-item-qty">{player.warehouse[color] || 0}</span>
            <div className="warehouse-item-bar">
              <div 
                style={{ 
                  width: `${Math.min(100, ((player.warehouse[color] || 0) / 15) * 100)}%`,
                  backgroundColor: info.color 
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Warehouse;
