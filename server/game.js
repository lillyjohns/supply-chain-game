const { 
  MAX_TURNS, STARTING_CASH, WAREHOUSE_CAPACITY, STARTING_INVENTORY,
  GOOD_COLORS, GOODS, OVERFLOW_COST_PER_UNIT, INVENTORY_VALUE_MULTIPLIER,
  ORDERS_PER_PLAYER_MULTIPLIER, SHIPPING_COST
} = require('./constants');
const { getRandomEvent } = require('./events');
const { generateOrder, getVendorPrice, calculateDelivery } = require('./pricing');

// Game phases
const PHASES = {
  LOBBY: 'lobby',
  EVENT: 'event',
  ORDER_SELECTION: 'order_selection',
  PURCHASING: 'purchasing',
  RESOLUTION: 'resolution',
  GAME_OVER: 'game_over'
};

function createGame(roomCode, hostId) {
  return {
    roomCode,
    hostId,
    phase: PHASES.LOBBY,
    currentTurn: 0,
    players: {},
    playerOrder: [],
    availableOrders: [],
    currentEvent: null,
    turnModifiers: {},
    orderSelectionIndex: 0, // whose turn to pick
    passCount: 0, // how many players passed in a row
    purchaseSubmitted: {}, // track who submitted purchases
    doubleOrdersNextTurn: false,
    log: []
  };
}

function addPlayer(game, playerId, playerName) {
  if (Object.keys(game.players).length >= 4) return false;
  if (game.phase !== PHASES.LOBBY) return false;
  
  const warehouse = {};
  for (const color of GOOD_COLORS) {
    warehouse[color] = STARTING_INVENTORY;
  }

  game.players[playerId] = {
    id: playerId,
    name: playerName,
    cash: STARTING_CASH,
    warehouse,
    activeOrders: [], // orders player has claimed
    pendingShipments: [], // orders from vendor in transit
    completedOrders: [],
    totalRevenue: 0,
    totalCosts: 0,
    totalPenalties: 0
  };
  game.playerOrder.push(playerId);
  return true;
}

function removePlayer(game, playerId) {
  delete game.players[playerId];
  game.playerOrder = game.playerOrder.filter(id => id !== playerId);
}

function startGame(game) {
  if (Object.keys(game.players).length < 2) return false;
  game.currentTurn = 1;
  startTurn(game);
  return true;
}

function startTurn(game) {
  // Reset turn modifiers
  game.turnModifiers = {};
  game.purchaseSubmitted = {};
  game.passCount = 0;
  
  // Draw event
  const event = getRandomEvent();
  game.currentEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type
  };
  
  // Apply event effect
  event.effect(game);
  
  // Check for doubled orders from last turn's event
  let orderMultiplier = ORDERS_PER_PLAYER_MULTIPLIER;
  if (game.doubleOrdersNextTurn) {
    orderMultiplier *= 2;
    game.doubleOrdersNextTurn = false;
  }
  
  // Check if this turn's event sets double for next
  if (game.turnModifiers.doubleOrdersNextTurn) {
    game.doubleOrdersNextTurn = true;
  }
  
  // Generate available orders
  const numOrders = Math.round(Object.keys(game.players).length * orderMultiplier);
  game.availableOrders = [];
  for (let i = 0; i < numOrders; i++) {
    game.availableOrders.push(generateOrder(game.currentTurn, game.turnModifiers));
  }
  
  // Set phase to event reveal
  game.phase = PHASES.EVENT;
  game.orderSelectionIndex = 0;
}

function moveToOrderSelection(game) {
  game.phase = PHASES.ORDER_SELECTION;
  game.orderSelectionIndex = (game.currentTurn - 1) % game.playerOrder.length; // rotate starting player
  game.passCount = 0;
}

function claimOrder(game, playerId, orderId) {
  if (game.phase !== PHASES.ORDER_SELECTION) return { success: false, error: 'ไม่ใช่เฟสเลือกออเดอร์' };
  
  const currentPlayer = game.playerOrder[game.orderSelectionIndex];
  if (currentPlayer !== playerId) return { success: false, error: 'ยังไม่ถึงตาคุณ' };
  
  const orderIdx = game.availableOrders.findIndex(o => o.id === orderId);
  if (orderIdx === -1) return { success: false, error: 'ออเดอร์ไม่พบ' };
  
  const order = game.availableOrders[orderIdx];
  order.claimedBy = playerId;
  game.players[playerId].activeOrders.push(order);
  game.availableOrders.splice(orderIdx, 1);
  
  game.passCount = 0;
  advanceOrderSelection(game);
  
  return { success: true, order };
}

function passOrderSelection(game, playerId) {
  if (game.phase !== PHASES.ORDER_SELECTION) return { success: false, error: 'ไม่ใช่เฟสเลือกออเดอร์' };
  
  const currentPlayer = game.playerOrder[game.orderSelectionIndex];
  if (currentPlayer !== playerId) return { success: false, error: 'ยังไม่ถึงตาคุณ' };
  
  game.passCount++;
  
  // If all players passed, move to purchasing
  if (game.passCount >= game.playerOrder.length || game.availableOrders.length === 0) {
    game.phase = PHASES.PURCHASING;
    return { success: true, phaseComplete: true };
  }
  
  advanceOrderSelection(game);
  return { success: true, phaseComplete: false };
}

function advanceOrderSelection(game) {
  game.orderSelectionIndex = (game.orderSelectionIndex + 1) % game.playerOrder.length;
  
  // If no orders left, move to purchasing
  if (game.availableOrders.length === 0) {
    game.phase = PHASES.PURCHASING;
  }
}

function submitPurchases(game, playerId, purchases) {
  // purchases: [{ color, quantity }]
  if (game.phase !== PHASES.PURCHASING) return { success: false, error: 'ไม่ใช่เฟสสั่งซื้อ' };
  if (game.purchaseSubmitted[playerId]) return { success: false, error: 'คุณสั่งซื้อไปแล้ว' };
  
  // Vendor strike event
  if (game.turnModifiers.vendorStrike) {
    game.purchaseSubmitted[playerId] = [];
    checkAllPurchasesSubmitted(game);
    return { success: true, message: 'โรงงานหยุดงาน - ไม่สามารถสั่งซื้อได้', purchases: [] };
  }

  const player = game.players[playerId];
  let totalCost = 0;
  const processedPurchases = [];

  for (const purchase of purchases) {
    if (!purchase.quantity || purchase.quantity <= 0) continue;
    
    const priceInfo = getVendorPrice(purchase.color, purchase.quantity, game.turnModifiers);
    totalCost += priceInfo.totalCost;
    
    processedPurchases.push({
      color: purchase.color,
      quantity: purchase.quantity,
      cost: priceInfo.totalCost,
      unitPrice: priceInfo.unitPrice,
      discount: priceInfo.discount,
      shippingCost: priceInfo.shippingCost
    });
  }

  if (totalCost > player.cash) {
    return { success: false, error: `เงินไม่พอ! ต้องการ $${totalCost} แต่มี $${player.cash}` };
  }

  // Deduct cash and create shipments
  player.cash -= totalCost;
  player.totalCosts += totalCost;

  for (const purchase of processedPurchases) {
    const leadTime = GOODS[purchase.color].vendorLeadTime;
    const fastShipping = game.turnModifiers.fastShipping ? 1 : 0;
    const arriveTurn = game.currentTurn + Math.max(1, leadTime - fastShipping);
    
    player.pendingShipments.push({
      color: purchase.color,
      quantity: purchase.quantity,
      arriveTurn,
      orderedTurn: game.currentTurn
    });
  }

  game.purchaseSubmitted[playerId] = processedPurchases;
  checkAllPurchasesSubmitted(game);
  
  return { success: true, totalCost, purchases: processedPurchases };
}

function skipPurchase(game, playerId) {
  if (game.phase !== PHASES.PURCHASING) return { success: false, error: 'ไม่ใช่เฟสสั่งซื้อ' };
  game.purchaseSubmitted[playerId] = [];
  checkAllPurchasesSubmitted(game);
  return { success: true };
}

function checkAllPurchasesSubmitted(game) {
  const allSubmitted = game.playerOrder.every(id => game.purchaseSubmitted[id] !== undefined);
  if (allSubmitted) {
    resolveDeliveries(game);
  }
}

function resolveDeliveries(game) {
  game.phase = PHASES.RESOLUTION;
  const resolutionLog = [];

  for (const playerId of game.playerOrder) {
    const player = game.players[playerId];
    const playerLog = { playerId, playerName: player.name, arrivals: [], deliveries: [], overflow: 0 };

    // 1. Check arriving shipments
    const arriving = player.pendingShipments.filter(s => s.arriveTurn <= game.currentTurn);
    player.pendingShipments = player.pendingShipments.filter(s => s.arriveTurn > game.currentTurn);
    
    for (const shipment of arriving) {
      player.warehouse[shipment.color] = (player.warehouse[shipment.color] || 0) + shipment.quantity;
      playerLog.arrivals.push({ color: shipment.color, quantity: shipment.quantity });
    }

    // 2. Check warehouse overflow
    const totalUnits = Object.values(player.warehouse).reduce((a, b) => a + b, 0);
    const capacity = WAREHOUSE_CAPACITY + (game.turnModifiers.bonusCapacity || 0);
    if (totalUnits > capacity) {
      const overflow = totalUnits - capacity;
      const overflowRate = OVERFLOW_COST_PER_UNIT * (game.turnModifiers.warehouseOverflowMultiplier || 1);
      const overflowCost = overflow * overflowRate;
      player.cash -= overflowCost;
      player.totalCosts += overflowCost;
      playerLog.overflow = { units: overflow, cost: overflowCost };
    }

    // 3. Fulfill due orders
    const dueOrders = player.activeOrders.filter(o => o.dueTurn <= game.currentTurn);
    const remainingOrders = player.activeOrders.filter(o => o.dueTurn > game.currentTurn);
    
    for (const order of dueOrders) {
      const result = calculateDelivery(order, player.warehouse, game.currentTurn, game.turnModifiers);
      
      // Remove delivered items from warehouse
      for (const item of result.deliveredItems) {
        player.warehouse[item.color] -= item.quantity;
      }
      
      player.cash += result.netPayment;
      player.totalRevenue += Math.max(0, result.netPayment);
      player.totalPenalties += result.latePenalty + result.incompletePenalty;
      
      player.completedOrders.push({
        ...order,
        result
      });
      
      playerLog.deliveries.push({
        orderId: order.id,
        ...result
      });
    }
    
    player.activeOrders = remainingOrders;
    resolutionLog.push(playerLog);
  }

  game.resolutionLog = resolutionLog;
  
  // Check if game is over
  if (game.currentTurn >= MAX_TURNS) {
    endGame(game);
  }
}

function nextTurn(game) {
  if (game.phase === PHASES.GAME_OVER) return;
  game.currentTurn++;
  if (game.currentTurn > MAX_TURNS) {
    endGame(game);
  } else {
    startTurn(game);
  }
}

function endGame(game) {
  game.phase = PHASES.GAME_OVER;
  
  // Calculate final scores
  const scores = [];
  for (const playerId of game.playerOrder) {
    const player = game.players[playerId];
    
    // Remaining inventory value at 50%
    let inventoryValue = 0;
    for (const color of GOOD_COLORS) {
      inventoryValue += (player.warehouse[color] || 0) * GOODS[color].basePrice * INVENTORY_VALUE_MULTIPLIER;
    }
    
    // Penalty for unfulfilled orders (they just expire)
    let unfulfilledPenalty = 0;
    for (const order of player.activeOrders) {
      for (const item of order.items) {
        unfulfilledPenalty += GOODS[item.color].basePrice * item.quantity * 1.5;
      }
    }
    
    const finalScore = Math.round(player.cash + inventoryValue - unfulfilledPenalty);
    
    scores.push({
      playerId,
      playerName: player.name,
      cash: player.cash,
      inventoryValue: Math.round(inventoryValue),
      unfulfilledPenalty: Math.round(unfulfilledPenalty),
      finalScore,
      totalRevenue: player.totalRevenue,
      totalCosts: player.totalCosts,
      totalPenalties: player.totalPenalties,
      completedOrders: player.completedOrders.length
    });
  }
  
  scores.sort((a, b) => b.finalScore - a.finalScore);
  game.scores = scores;
}

function getGameState(game, playerId) {
  // Return game state visible to a specific player
  const state = {
    roomCode: game.roomCode,
    phase: game.phase,
    currentTurn: game.currentTurn,
    maxTurns: MAX_TURNS,
    currentEvent: game.currentEvent,
    availableOrders: game.availableOrders,
    playerOrder: game.playerOrder,
    currentOrderPicker: game.phase === PHASES.ORDER_SELECTION ? game.playerOrder[game.orderSelectionIndex] : null,
    turnModifiers: game.turnModifiers,
    players: {},
    scores: game.scores || null,
    resolutionLog: game.resolutionLog || null
  };

  // Include all player info (simplified)
  for (const pid of game.playerOrder) {
    const p = game.players[pid];
    state.players[pid] = {
      id: p.id,
      name: p.name,
      cash: p.cash,
      warehouse: p.warehouse,
      warehouseTotal: Object.values(p.warehouse).reduce((a, b) => a + b, 0),
      activeOrders: p.activeOrders,
      pendingShipments: p.pendingShipments,
      completedOrdersCount: p.completedOrders.length
    };
  }

  return state;
}

module.exports = {
  PHASES,
  createGame,
  addPlayer,
  removePlayer,
  startGame,
  moveToOrderSelection,
  claimOrder,
  passOrderSelection,
  submitPurchases,
  skipPurchase,
  resolveDeliveries,
  nextTurn,
  getGameState
};
