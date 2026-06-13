// 30 Random Events for Supply Chain Broker
const EVENTS = [
  {
    id: 1,
    title: 'ไม่มีอะไรเกิดขึ้น',
    description: 'สัปดาห์นี้ธุรกิจดำเนินไปตามปกติ',
    type: 'neutral',
    effect: (game) => {} // no-op
  },
  {
    id: 2,
    title: 'ไม่มีอะไรเกิดขึ้น',
    description: 'ทุกอย่างเป็นไปด้วยดี',
    type: 'neutral',
    effect: (game) => {} // no-op
  },
  {
    id: 3,
    title: 'ไม่มีอะไรเกิดขึ้น',
    description: 'สัปดาห์ปกติ ไม่มีเหตุการณ์พิเศษ',
    type: 'neutral',
    effect: (game) => {} // no-op
  },
  {
    id: 4,
    title: '🚢 การขนส่งล่าช้า!',
    description: 'พายุทำให้การขนส่งทุกสีล่าช้า +1 สัปดาห์',
    type: 'bad',
    effect: (game) => {
      // All pending shipments get +1 lead time
      for (const player of Object.values(game.players)) {
        for (const shipment of player.pendingShipments) {
          shipment.arriveTurn += 1;
        }
      }
    }
  },
  {
    id: 5,
    title: '🔴 สินค้าแดงล่าช้า',
    description: 'ปัญหาที่โรงงานสีแดง ขนส่งล่าช้า +1 สัปดาห์',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        for (const shipment of player.pendingShipments) {
          if (shipment.color === 'red') shipment.arriveTurn += 1;
        }
      }
    }
  },
  {
    id: 6,
    title: '🔵 สินค้าน้ำเงินล่าช้า',
    description: 'ปัญหาการผลิตสีน้ำเงิน ขนส่งล่าช้า +1 สัปดาห์',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        for (const shipment of player.pendingShipments) {
          if (shipment.color === 'blue') shipment.arriveTurn += 1;
        }
      }
    }
  },
  {
    id: 7,
    title: '🟢 สินค้าเขียวล่าช้า',
    description: 'วัตถุดิบสีเขียวขาดแคลน ขนส่งล่าช้า +1 สัปดาห์',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        for (const shipment of player.pendingShipments) {
          if (shipment.color === 'green') shipment.arriveTurn += 1;
        }
      }
    }
  },
  {
    id: 8,
    title: '🟡 สินค้าเหลืองล่าช้า',
    description: 'โรงงานสีเหลืองหยุดซ่อมบำรุง ขนส่งล่าช้า +2 สัปดาห์',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        for (const shipment of player.pendingShipments) {
          if (shipment.color === 'yellow') shipment.arriveTurn += 2;
        }
      }
    }
  },
  {
    id: 9,
    title: '🟣 สินค้าม่วงล่าช้า',
    description: 'ซัพพลายเออร์สีม่วงประสบปัญหา ขนส่งล่าช้า +1 สัปดาห์',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        for (const shipment of player.pendingShipments) {
          if (shipment.color === 'purple') shipment.arriveTurn += 1;
        }
      }
    }
  },
  {
    id: 10,
    title: '📦 สินค้าเสียหาย!',
    description: '10% ของสินค้าในคลังเสียหาย (ปัดขึ้น)',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        const colors = Object.keys(player.warehouse);
        for (const color of colors) {
          const damage = Math.ceil(player.warehouse[color] * 0.1);
          player.warehouse[color] = Math.max(0, player.warehouse[color] - damage);
        }
      }
    }
  },
  {
    id: 11,
    title: '🏠 ค่าเช่าคลังเพิ่ม!',
    description: 'ค่าเช่าคลังสินค้าเพิ่มเป็นสองเท่าในสัปดาห์นี้',
    type: 'bad',
    effect: (game) => {
      game.turnModifiers.warehouseOverflowMultiplier = 2;
    }
  },
  {
    id: 12,
    title: '📈 ตลาดขาดแคลน!',
    description: 'ราคาขายทุกสินค้า x2 ในสัปดาห์นี้',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.sellPriceMultiplier = 2;
    }
  },
  {
    id: 13,
    title: '🔴📈 สินค้าแดงขาดตลาด',
    description: 'ราคาขายสินค้าแดง x2 ในสัปดาห์นี้',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.colorSellMultiplier = { red: 2 };
    }
  },
  {
    id: 14,
    title: '🟣📈 สินค้าม่วงขาดตลาด',
    description: 'ราคาขายสินค้าม่วง x2 ในสัปดาห์นี้',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.colorSellMultiplier = { purple: 2 };
    }
  },
  {
    id: 15,
    title: '🚛 จัดส่งฟรี!',
    description: 'ไม่เสียค่าขนส่งในสัปดาห์นี้',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.freeShipping = true;
    }
  },
  {
    id: 16,
    title: '💰 โบนัสรัฐบาล',
    description: 'ทุกคนได้รับเงินช่วยเหลือ $1,000',
    type: 'good',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        player.cash += 1000;
      }
    }
  },
  {
    id: 17,
    title: '💸 ภาษีพิเศษ',
    description: 'ทุกคนจ่ายภาษี $500',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        player.cash -= 500;
      }
    }
  },
  {
    id: 18,
    title: '🏭 โรงงานหยุดงาน',
    description: 'ผู้ขายทุกรายหยุดงาน - ไม่สามารถสั่งซื้อได้ในสัปดาห์นี้',
    type: 'bad',
    effect: (game) => {
      game.turnModifiers.vendorStrike = true;
    }
  },
  {
    id: 19,
    title: '🔥 ไฟไหม้คลัง!',
    description: 'สินค้าสุ่ม 5 ชิ้นในคลังถูกทำลาย',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        let toDestroy = 5;
        const colors = Object.keys(player.warehouse).filter(c => player.warehouse[c] > 0);
        while (toDestroy > 0 && colors.length > 0) {
          const randColor = colors[Math.floor(Math.random() * colors.length)];
          if (player.warehouse[randColor] > 0) {
            player.warehouse[randColor]--;
            toDestroy--;
          } else {
            colors.splice(colors.indexOf(randColor), 1);
          }
        }
      }
    }
  },
  {
    id: 20,
    title: '📦 คลังขยาย!',
    description: 'ความจุคลังเพิ่ม +10 หน่วยในสัปดาห์นี้',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.bonusCapacity = 10;
    }
  },
  {
    id: 21,
    title: '🎁 สินค้าฟรี!',
    description: 'ทุกคนได้รับสินค้าสุ่ม 3 ชิ้นฟรี',
    type: 'good',
    effect: (game) => {
      const { GOOD_COLORS } = require('./constants');
      for (const player of Object.values(game.players)) {
        for (let i = 0; i < 3; i++) {
          const color = GOOD_COLORS[Math.floor(Math.random() * GOOD_COLORS.length)];
          player.warehouse[color] = (player.warehouse[color] || 0) + 1;
        }
      }
    }
  },
  {
    id: 22,
    title: '📉 ราคาตก',
    description: 'ต้นทุนซื้อสินค้าลด 20% ในสัปดาห์นี้',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.purchaseDiscount = 0.20;
    }
  },
  {
    id: 23,
    title: '📈 ต้นทุนพุ่ง',
    description: 'ต้นทุนซื้อสินค้าเพิ่ม 30% ในสัปดาห์นี้',
    type: 'bad',
    effect: (game) => {
      game.turnModifiers.purchaseSurcharge = 0.30;
    }
  },
  {
    id: 24,
    title: '⚡ จัดส่งด่วน!',
    description: 'สินค้าที่สั่งสัปดาห์นี้มาถึงเร็วขึ้น 1 สัปดาห์',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.fastShipping = true;
    }
  },
  {
    id: 25,
    title: '🌊 น้ำท่วม',
    description: 'สินค้าที่ระดับล่างของคลังเสียหาย (สูญเสีย 20% สินค้าแดงและน้ำเงิน)',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        player.warehouse.red = Math.floor(player.warehouse.red * 0.8);
        player.warehouse.blue = Math.floor(player.warehouse.blue * 0.8);
      }
    }
  },
  {
    id: 26,
    title: '🎉 เทศกาลลดราคา',
    description: 'ลูกค้ายินดีจ่ายเพิ่ม 50% สำหรับทุกออเดอร์ที่ส่งสัปดาห์นี้',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.sellPriceMultiplier = 1.5;
    }
  },
  {
    id: 27,
    title: '🔒 คลังรั่ว',
    description: 'สินค้าสุ่ม 2 ชิ้นหายไปจากคลังของทุกคน',
    type: 'bad',
    effect: (game) => {
      for (const player of Object.values(game.players)) {
        let toLose = 2;
        const colors = Object.keys(player.warehouse).filter(c => player.warehouse[c] > 0);
        while (toLose > 0 && colors.length > 0) {
          const randColor = colors[Math.floor(Math.random() * colors.length)];
          if (player.warehouse[randColor] > 0) {
            player.warehouse[randColor]--;
            toLose--;
          } else {
            colors.splice(colors.indexOf(randColor), 1);
          }
        }
      }
    }
  },
  {
    id: 28,
    title: '📋 ดีมานด์สูง!',
    description: 'ออเดอร์เพิ่มขึ้น 2 เท่าในสัปดาห์หน้า',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.doubleOrdersNextTurn = true;
    }
  },
  {
    id: 29,
    title: '🏆 รางวัลธุรกิจ',
    description: 'ผู้เล่นที่มีเงินมากสุดได้โบนัส $500',
    type: 'neutral',
    effect: (game) => {
      const players = Object.values(game.players);
      const richest = players.reduce((a, b) => a.cash > b.cash ? a : b);
      richest.cash += 500;
    }
  },
  {
    id: 30,
    title: '🤝 ข้อตกลงพิเศษ',
    description: 'ส่วนลดจำนวนมาก x2 ในสัปดาห์นี้ (ส่วนลดเพิ่มเป็นสองเท่า)',
    type: 'good',
    effect: (game) => {
      game.turnModifiers.doubleBulkDiscount = true;
    }
  }
];

function getRandomEvent() {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

module.exports = { EVENTS, getRandomEvent };
