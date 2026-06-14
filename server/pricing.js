const { GOODS, BULK_DISCOUNTS, SHIPPING_COST } = require('./constants');

/**
 * Round to nearest 10 for cleaner numbers
 */
function roundTo10(n) {
  return Math.round(n / 10) * 10;
}

/**
 * Calculate vendor price with bulk discount
 */
function getVendorPrice(color, quantity, modifiers = {}) {
  const basePrice = GOODS[color].basePrice;
  
  // Find applicable discount (max 20+ = 15%)
  let discount = 0;
  for (const tier of BULK_DISCOUNTS) {
    if (quantity >= tier.minQty) {
      discount = tier.discount;
      break;
    }
  }

  // Double bulk discount event
  if (modifiers.doubleBulkDiscount) {
    discount = Math.min(discount * 2, 0.30); // cap at 30%
  }

  // Purchase discount/surcharge events
  let priceModifier = 1;
  if (modifiers.purchaseDiscount) {
    priceModifier -= modifiers.purchaseDiscount;
  }
  if (modifiers.purchaseSurcharge) {
    priceModifier += modifiers.purchaseSurcharge;
  }

  const unitPrice = basePrice * (1 - discount) * priceModifier;
  const shippingCost = modifiers.freeShipping ? 0 : SHIPPING_COST;
  
  return {
    unitPrice: roundTo10(unitPrice),
    totalCost: roundTo10(unitPrice * quantity + shippingCost),
    shippingCost,
    discount: Math.round(discount * 100)
  };
}

/**
 * Generate a random customer order
 */
function generateOrder(turnNumber, modifiers = {}) {
  const { 
    GOOD_COLORS, 
    ORDER_PRICE_MULTIPLIER_MIN, 
    ORDER_PRICE_MULTIPLIER_MAX,
    ORDER_LEAD_TIME_MIN,
    ORDER_LEAD_TIME_MAX,
    ORDER_QUANTITY_MIN,
    ORDER_QUANTITY_MAX,
    ORDER_COLORS_MIN,
    ORDER_COLORS_MAX,
    INSTANT_ORDER_BONUS_MULTIPLIER
  } = require('./constants');

  // Random number of colors (1-3)
  const numColors = ORDER_COLORS_MIN + Math.floor(Math.random() * (ORDER_COLORS_MAX - ORDER_COLORS_MIN + 1));
  
  // Pick random colors
  const shuffled = [...GOOD_COLORS].sort(() => Math.random() - 0.5);
  const colors = shuffled.slice(0, numColors);
  
  // Generate items for each color
  const items = colors.map(color => {
    const quantity = ORDER_QUANTITY_MIN + Math.floor(Math.random() * (ORDER_QUANTITY_MAX - ORDER_QUANTITY_MIN + 1));
    return { color, quantity };
  });

  // Lead time (0 = instant delivery required this turn)
  const leadTime = ORDER_LEAD_TIME_MIN + Math.floor(Math.random() * (ORDER_LEAD_TIME_MAX - ORDER_LEAD_TIME_MIN + 1));

  // Calculate order value
  let multiplier = ORDER_PRICE_MULTIPLIER_MIN + Math.random() * (ORDER_PRICE_MULTIPLIER_MAX - ORDER_PRICE_MULTIPLIER_MIN);
  
  // Instant orders (lead time 0) get bonus multiplier for higher profit
  if (leadTime === 0) {
    multiplier *= INSTANT_ORDER_BONUS_MULTIPLIER;
    // Also reduce quantity for instant orders (must use existing stock)
    for (const item of items) {
      item.quantity = Math.max(2, Math.min(item.quantity, 8));
    }
  }
  
  multiplier = Math.round(multiplier * 100) / 100;

  let totalValue = 0;
  for (const item of items) {
    totalValue += GOODS[item.color].basePrice * item.quantity * multiplier;
  }
  totalValue = roundTo10(totalValue);

  return {
    id: `order_${turnNumber}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    items,
    totalValue,
    multiplier,
    leadTime,
    dueTurn: turnNumber + leadTime,
    createdTurn: turnNumber,
    isInstant: leadTime === 0,
    claimedBy: null
  };
}

/**
 * Calculate delivery payment (with penalties)
 */
function calculateDelivery(order, playerWarehouse, currentTurn, modifiers = {}) {
  const turnsLate = Math.max(0, currentTurn - order.dueTurn);
  
  let totalDelivered = 0;
  let totalMissing = 0;
  let deliveredItems = [];
  let missingItems = [];

  for (const item of order.items) {
    const available = playerWarehouse[item.color] || 0;
    const delivered = Math.min(available, item.quantity);
    const missing = item.quantity - delivered;
    
    totalDelivered += delivered;
    totalMissing += missing;
    
    if (delivered > 0) deliveredItems.push({ color: item.color, quantity: delivered });
    if (missing > 0) missingItems.push({ color: item.color, quantity: missing });
  }

  // Calculate payment
  let sellMultiplier = modifiers.sellPriceMultiplier || 1;
  let payment = order.totalValue * sellMultiplier;

  // Color-specific multipliers
  if (modifiers.colorSellMultiplier) {
    payment = 0;
    for (const item of order.items) {
      const colorMult = (modifiers.colorSellMultiplier[item.color] || 1) * sellMultiplier;
      payment += GOODS[item.color].basePrice * item.quantity * order.multiplier * colorMult;
    }
  }

  // Late penalty
  const latePenalty = turnsLate > 0 ? roundTo10(payment * 0.20 * turnsLate) : 0;
  
  // Incomplete penalty
  let incompletePenalty = 0;
  for (const item of missingItems) {
    incompletePenalty += GOODS[item.color].basePrice * item.quantity * 1.5;
  }
  incompletePenalty = roundTo10(incompletePenalty);

  payment = roundTo10(payment);
  const netPayment = payment - latePenalty - incompletePenalty;

  return {
    payment,
    latePenalty,
    incompletePenalty,
    turnsLate,
    netPayment,
    deliveredItems,
    missingItems,
    isComplete: totalMissing === 0
  };
}

module.exports = { getVendorPrice, generateOrder, calculateDelivery };
