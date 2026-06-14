// Bot AI for Supply Chain Game
const { GOODS, GOOD_COLORS, WAREHOUSE_CAPACITY, SHIPPING_COST } = require('./constants');
const { getVendorPrice } = require('./pricing');

const BOT_NAMES = ['🤖 Bot A', '🤖 Bot B', '🤖 Bot C'];
const BOT_STRATEGIES = ['balanced', 'aggressive', 'conservative'];

function createBot(index) {
  return {
    id: `bot_${index}`,
    name: BOT_NAMES[index] || `🤖 Bot ${index + 1}`,
    strategy: BOT_STRATEGIES[index] || 'balanced',
    isBot: true
  };
}

function botPickOrders(player, availableOrders, strategy) {
  const picked = [];
  
  for (const order of availableOrders) {
    if (picked.length >= 2) break;
    const totalQty = order.items.reduce((s, it) => s + it.quantity, 0);
    
    if (strategy === 'conservative') {
      if (totalQty <= 10 && order.leadTime >= 1 && !order.isInstant) picked.push(order);
    } else if (strategy === 'aggressive') {
      if (order.totalValue >= 3000 || order.multiplier >= 1.6) picked.push(order);
      else if (order.isInstant) {
        let canFulfill = true;
        for (const item of order.items) {
          if ((player.warehouse[item.color] || 0) < item.quantity) canFulfill = false;
        }
        if (canFulfill) picked.push(order);
      }
    } else { // balanced
      if (order.isInstant) {
        let canFulfill = true;
        for (const item of order.items) {
          if ((player.warehouse[item.color] || 0) < item.quantity) canFulfill = false;
        }
        if (canFulfill) picked.push(order);
      } else if (order.multiplier >= 1.3 && totalQty <= 12) {
        picked.push(order);
      }
    }
  }
  return picked;
}

function botDecidePurchases(player, turnModifiers, strategy) {
  if (turnModifiers.vendorStrike) return [];
  
  const purchases = [];
  const needed = {};
  
  for (const order of player.activeOrders) {
    for (const item of order.items) {
      needed[item.color] = (needed[item.color] || 0) + item.quantity;
    }
  }
  
  for (const color of GOOD_COLORS) {
    needed[color] = Math.max(0, (needed[color] || 0) - (player.warehouse[color] || 0));
  }
  for (const shipment of player.pendingShipments) {
    needed[shipment.color] = Math.max(0, (needed[shipment.color] || 0) - shipment.quantity);
  }
  
  for (const color of GOOD_COLORS) {
    let qty = needed[color] || 0;
    if (strategy === 'aggressive') qty = Math.ceil(qty * 1.3);
    if (strategy === 'conservative') qty = Math.ceil(qty * 0.9);
    if (qty <= 0) continue;
    
    const price = getVendorPrice(color, qty, turnModifiers);
    if (price.totalCost <= player.cash * 0.6) {
      purchases.push({ color, quantity: qty });
    }
  }
  return purchases;
}

module.exports = { createBot, botPickOrders, botDecidePurchases, BOT_NAMES };
