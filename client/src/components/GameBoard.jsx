import React from 'react';
import OrderSelection from './OrderSelection';
import PurchasePhase from './PurchasePhase';
import TurnResolution from './TurnResolution';
import Warehouse from './Warehouse';
import EventCard from './EventCard';
import Scoreboard from './Scoreboard';

const GOODS_INFO = {
  red: { name: 'แดง', color: '#EF4444', symbol: '■', emoji: '■' },
  blue: { name: 'น้ำเงิน', color: '#3B82F6', symbol: '▲', emoji: '▲' },
  green: { name: 'เขียว', color: '#10B981', symbol: '●', emoji: '●' },
  yellow: { name: 'เหลือง', color: '#F59E0B', symbol: '◆', emoji: '◆' }
};

function GameBoard({ gameState, playerId, socket }) {
  if (!gameState) return <div className="loading">กำลังโหลด...</div>;

  const myPlayer = gameState.players[playerId];
  const phase = gameState.phase;

  if (phase === 'game_over') {
    return <Scoreboard gameState={gameState} playerId={playerId} />;
  }

  return (
    <div className="game-board">
      {/* Header */}
      <div className="game-header">
        <div className="header-left">
          <span className="turn-badge">สัปดาห์ {gameState.currentTurn}/{gameState.maxTurns}</span>
          <span className="phase-badge">
            {phase === 'resolution' && '📦 สรุปรอบ'}
            {phase === 'event' && '🎲 เหตุการณ์'}
            {phase === 'order_selection' && '📋 เลือกออเดอร์'}
            {phase === 'purchasing' && '🛒 สั่งซื้อ'}
          </span>
        </div>
        <div className="header-right">
          <span className="money-display">💰 ฿{myPlayer?.cash?.toLocaleString()}</span>
        </div>
      </div>

      {/* Players Bar */}
      <div className="players-bar">
        {gameState.playerOrder.map((pid) => {
          const p = gameState.players[pid];
          return (
            <div key={pid} className={`player-card ${pid === playerId ? 'is-me' : ''} ${pid === gameState.currentOrderPicker ? 'is-active' : ''}`}>
              <div className="player-card-name">{p.name}{pid === playerId ? ' (คุณ)' : ''}</div>
              <div className="player-card-cash">฿{p.cash?.toLocaleString()}</div>
              <div className="player-card-warehouse">📦 {p.warehouseTotal}/50</div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="game-content">
        {/* Left: Warehouse */}
        <div className="game-sidebar">
          <Warehouse player={myPlayer} goodsInfo={GOODS_INFO} />
          
          {/* Active Orders */}
          <div className="active-orders-panel">
            <h3>📋 ออเดอร์ที่รับ ({myPlayer?.activeOrders?.length || 0})</h3>
            <div className="active-orders-list">
              {myPlayer?.activeOrders?.map(order => (
                <div key={order.id} className="mini-order-card">
                  <div className="mini-order-items">
                    {order.items.map((item, i) => (
                      <span key={i} className="mini-item">
                        {GOODS_INFO[item.color]?.emoji} x{item.quantity}
                      </span>
                    ))}
                  </div>
                  <div className="mini-order-meta">
                    <span>฿{order.totalValue.toLocaleString()}</span>
                    <span className={`due-badge ${order.dueTurn <= gameState.currentTurn ? 'overdue' : ''}`}>
                      กำหนดสัปดาห์ {order.dueTurn}
                    </span>
                  </div>
                </div>
              ))}
              {(!myPlayer?.activeOrders || myPlayer.activeOrders.length === 0) && (
                <p className="no-orders">ยังไม่มีออเดอร์</p>
              )}
            </div>
          </div>

          {/* Pending Shipments */}
          {myPlayer?.pendingShipments?.length > 0 && (
            <div className="shipments-panel">
              <h3>🚚 สินค้ากำลังมา</h3>
              {myPlayer.pendingShipments.map((s, i) => (
                <div key={i} className="shipment-item">
                  {GOODS_INFO[s.color]?.emoji} x{s.quantity} — ถึงสัปดาห์ {s.arriveTurn}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Phase Content */}
        <div className="game-main">
          {phase === 'resolution' && (
            <TurnResolution
              gameState={gameState}
              playerId={playerId}
              socket={socket}
              goodsInfo={GOODS_INFO}
            />
          )}

          {phase === 'event' && (
            <EventCard 
              event={gameState.currentEvent} 
              socket={socket}
              isHost={gameState.playerOrder[0] === playerId}
            />
          )}
          
          {phase === 'order_selection' && (
            <OrderSelection
              gameState={gameState}
              playerId={playerId}
              socket={socket}
              goodsInfo={GOODS_INFO}
            />
          )}
          
          {phase === 'purchasing' && (
            <PurchasePhase
              gameState={gameState}
              playerId={playerId}
              socket={socket}
              goodsInfo={GOODS_INFO}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default GameBoard;
