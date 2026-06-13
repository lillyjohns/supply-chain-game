// Game Constants
module.exports = {
  // Game settings
  MAX_TURNS: 10,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  STARTING_CASH: 10000,
  WAREHOUSE_CAPACITY: 50,
  STARTING_INVENTORY: 5, // per color

  // Goods
  GOODS: {
    red: { name: 'แดง', basePrice: 100, vendorLeadTime: 1, color: '#EF4444' },
    blue: { name: 'น้ำเงิน', basePrice: 150, vendorLeadTime: 1, color: '#3B82F6' },
    green: { name: 'เขียว', basePrice: 200, vendorLeadTime: 2, color: '#10B981' },
    yellow: { name: 'เหลือง', basePrice: 300, vendorLeadTime: 2, color: '#F59E0B' },
    purple: { name: 'ม่วง', basePrice: 500, vendorLeadTime: 3, color: '#8B5CF6' }
  },

  GOOD_COLORS: ['red', 'blue', 'green', 'yellow', 'purple'],

  // Pricing
  BULK_DISCOUNTS: [
    { minQty: 50, discount: 0.25 },
    { minQty: 20, discount: 0.15 },
    { minQty: 10, discount: 0.10 },
    { minQty: 0, discount: 0 }
  ],
  SHIPPING_COST: 200, // per shipment flat

  // Customer orders
  ORDER_PRICE_MULTIPLIER_MIN: 1.2,
  ORDER_PRICE_MULTIPLIER_MAX: 2.0,
  ORDER_LEAD_TIME_MIN: 1,
  ORDER_LEAD_TIME_MAX: 4,
  ORDER_QUANTITY_MIN: 2,
  ORDER_QUANTITY_MAX: 15,
  ORDER_COLORS_MIN: 1,
  ORDER_COLORS_MAX: 3,

  // Penalties
  LATE_PENALTY_RATE: 0.20, // per turn late
  INCOMPLETE_PENALTY_MULTIPLIER: 1.5,

  // Warehouse
  OVERFLOW_COST_PER_UNIT: 50,

  // End game
  INVENTORY_VALUE_MULTIPLIER: 0.5,

  // Orders per turn
  ORDERS_PER_PLAYER_MULTIPLIER: 2.5 // available orders = players * this
};
