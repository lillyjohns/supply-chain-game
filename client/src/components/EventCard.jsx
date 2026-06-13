import React, { useState } from 'react';

function EventCard({ event, socket, isHost }) {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleContinue = () => {
    socket.emit('event_acknowledged');
  };

  if (!event) return null;

  return (
    <div className="event-card-container">
      {!revealed ? (
        <div className="event-card-back" onClick={handleReveal}>
          <div className="event-card-mystery">
            <span className="event-card-icon">🎲</span>
            <h2>เหตุการณ์ประจำสัปดาห์</h2>
            <p>คลิกเพื่อเปิดการ์ด</p>
          </div>
        </div>
      ) : (
        <div className={`event-card-front event-${event.type}`}>
          <div className="event-card-content">
            <h2 className="event-title">{event.title}</h2>
            <p className="event-description">{event.description}</p>
            <div className={`event-type-badge ${event.type}`}>
              {event.type === 'good' && '✨ เหตุการณ์ดี'}
              {event.type === 'bad' && '⚠️ เหตุการณ์ร้าย'}
              {event.type === 'neutral' && '😐 ปกติ'}
            </div>
          </div>
          {isHost && (
            <button className="btn btn-primary" onClick={handleContinue}>
              ➡️ เริ่มเลือกออเดอร์
            </button>
          )}
          {!isHost && (
            <p className="waiting-host">รอเจ้าห้อง...</p>
          )}
        </div>
      )}
    </div>
  );
}

export default EventCard;
