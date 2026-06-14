/**
 * Supply Chain Broker - Full Game QA Test
 * Simulates 4 players playing a complete 10-turn game.
 * 
 * Player strategies:
 *   Player 1 (Aggressive): Buys lots, takes many orders
 *   Player 2 (Conservative): Only buys what's needed for current orders
 *   Player 3 (Speculator): Buys cheap goods early
 *   Player 4 (Lazy): Skips purchases often, takes few orders
 */

const { io } = require('socket.io-client');

const SERVER_URL = 'http://54.255.183.19';
const PLAYER_NAMES = ['Aggressive', 'Conservative', 'Speculator', 'Lazy'];

// Bug tracking
const bugs = [];
const warnings = [];
let gameCompleted = false;
let finalScores = null;

// Helper: create a connected socket with promise-based emit
function createPlayer(name) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      timeout: 10000,
      reconnection: false
    });
    
    const player = {
      name,
      socket,
      id: null,
      roomCode: null,
      gameState: null,
      stateUpdates: 0
    };

    socket.on('connect', () => {
      player.id = socket.id;
      console.log(`[${name}] Connected with id: ${socket.id}`);
      resolve(player);
    });

    socket.on('connect_error', (err) => {
      reject(new Error(`[${name}] Connection failed: ${err.message}`));
    });

    socket.on('game_state', (state) => {
      player.gameState = state;
      player.stateUpdates++;
    });

    socket.on('disconnect', (reason) => {
      console.log(`[${name}] Disconnected: ${reason}`);
    });

    setTimeout(() => reject(new Error(`[${name}] Connection timeout`)), 15000);
  });
}

// Promisified emit with callback
function emitWithAck(socket, event, data) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout on ${event}`)), 10000);
    socket.emit(event, data, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

// Wait for game state to update with a specific condition
function waitForState(player, condition, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const startUpdates = player.stateUpdates;
    const timeout = setTimeout(() => {
      reject(new Error(`[${player.name}] Timeout waiting for state condition. Current phase: ${player.gameState?.phase}, turn: ${player.gameState?.currentTurn}`));
    }, timeoutMs);

    const check = () => {
      if (player.gameState && condition(player.gameState)) {
        clearTimeout(timeout);
        resolve(player.gameState);
        return;
      }
    };

    // Check immediately
    check();

    // Listen for updates
    const handler = (state) => {
      player.gameState = state;
      player.stateUpdates++;
      if (condition(state)) {
        clearTimeout(timeout);
        player.socket.off('game_state', handler);
        resolve(state);
      }
    };
    player.socket.on('game_state', handler);
  });
}

// Wait a bit for state propagation
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('SUPPLY CHAIN BROKER - FULL GAME QA TEST');
  console.log('='.repeat(60));
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Players: ${PLAYER_NAMES.join(', ')}`);
  console.log('');

  // Step 1: Connect all players
  console.log('--- STEP 1: Connecting players ---');
  let players;
  try {
    players = await Promise.all(PLAYER_NAMES.map(name => createPlayer(name)));
    console.log(`✓ All ${players.length} players connected\n`);
  } catch (err) {
    console.error(`✗ Failed to connect players: ${err.message}`);
    bugs.push({ phase: 'connection', error: err.message });
    process.exit(1);
  }

  // Step 2: Create game room (Player 1 is host)
  console.log('--- STEP 2: Creating game room ---');
  let roomCode;
  try {
    const result = await emitWithAck(players[0].socket, 'create_game', { name: players[0].name });
    if (!result.success) throw new Error(`Create failed: ${result.error}`);
    roomCode = result.roomCode;
    players[0].roomCode = roomCode;
    console.log(`✓ Room created: ${roomCode} (host: ${players[0].name})`);
  } catch (err) {
    console.error(`✗ Failed to create room: ${err.message}`);
    bugs.push({ phase: 'room_creation', error: err.message });
    process.exit(1);
  }

  // Step 3: Other players join
  console.log('--- STEP 3: Players joining room ---');
  for (let i = 1; i < players.length; i++) {
    try {
      await sleep(200);
      const result = await emitWithAck(players[i].socket, 'join_game', { 
        roomCode, 
        name: players[i].name 
      });
      if (!result.success) throw new Error(`Join failed: ${result.error}`);
      players[i].roomCode = roomCode;
      console.log(`✓ ${players[i].name} joined room ${roomCode}`);
    } catch (err) {
      console.error(`✗ ${players[i].name} failed to join: ${err.message}`);
      bugs.push({ phase: 'join', player: players[i].name, error: err.message });
      process.exit(1);
    }
  }
  console.log('');

  // Step 4: Start game
  console.log('--- STEP 4: Starting game ---');
  try {
    await sleep(500);
    const result = await emitWithAck(players[0].socket, 'start_game', {});
    if (!result.success) throw new Error(`Start failed: ${result.error}`);
    console.log('✓ Game started!\n');
  } catch (err) {
    console.error(`✗ Failed to start game: ${err.message}`);
    bugs.push({ phase: 'start', error: err.message });
    process.exit(1);
  }

  // Wait for game state to propagate
  await sleep(500);

  // Step 5: Play through all turns
  for (let turn = 1; turn <= 10; turn++) {
    console.log(`${'='.repeat(60)}`);
    console.log(`TURN ${turn}/10`);
    console.log(`${'='.repeat(60)}`);

    try {
      // --- EVENT PHASE ---
      await waitForState(players[0], s => s.phase === 'event' && s.currentTurn === turn);
      const state = players[0].gameState;
      console.log(`  [EVENT] ${state.currentEvent?.title || 'Unknown'}`);
      console.log(`          ${state.currentEvent?.description || ''}`);

      // Any player can acknowledge the event
      await sleep(300);
      players[0].socket.emit('event_acknowledged');
      
      // --- ORDER SELECTION PHASE ---
      await waitForState(players[0], s => s.phase === 'order_selection' && s.currentTurn === turn);
      const orderState = players[0].gameState;
      console.log(`  [ORDERS] ${orderState.availableOrders.length} orders available`);

      // Each player takes turns claiming orders (round-robin)
      let orderPhaseComplete = false;
      let orderRounds = 0;
      const maxOrderRounds = 40; // safety limit
      
      while (!orderPhaseComplete && orderRounds < maxOrderRounds) {
        orderRounds++;
        await sleep(100);
        
        // Refresh state from any player
        const curState = players[0].gameState;
        
        if (curState.phase !== 'order_selection') {
          orderPhaseComplete = true;
          break;
        }

        const pickerId = curState.currentOrderPicker;
        const picker = players.find(p => p.socket.id === pickerId);
        
        if (!picker) {
          bugs.push({ phase: 'order_selection', turn, error: `currentOrderPicker ${pickerId} not found among connected players` });
          // Force pass by all to break deadlock
          for (const p of players) {
            try { await emitWithAck(p.socket, 'pass_order', {}); } catch(e) {}
          }
          break;
        }

        const available = curState.availableOrders;
        
        if (available.length === 0) {
          orderPhaseComplete = true;
          break;
        }

        // Strategy: determine whether to claim or pass
        let shouldClaim = false;
        const playerIdx = players.indexOf(picker);
        const playerState = curState.players[pickerId];
        const activeOrders = playerState?.activeOrders?.length || 0;

        switch (playerIdx) {
          case 0: // Aggressive - always claim if possible
            shouldClaim = activeOrders < 5;
            break;
          case 1: // Conservative - claim up to 2 active orders
            shouldClaim = activeOrders < 2;
            break;
          case 2: // Speculator - claim orders with high multiplier
            shouldClaim = activeOrders < 3 && available.some(o => o.multiplier >= 1.5);
            break;
          case 3: // Lazy - rarely takes orders
            shouldClaim = activeOrders < 1 && Math.random() > 0.5;
            break;
        }

        if (shouldClaim && available.length > 0) {
          // Pick the best order for this player
          let orderToClaim;
          if (playerIdx === 2) {
            // Speculator: pick highest value
            orderToClaim = available.reduce((best, o) => o.totalValue > best.totalValue ? o : best);
          } else {
            // Others: pick first available
            orderToClaim = available[0];
          }

          const result = await emitWithAck(picker.socket, 'claim_order', { orderId: orderToClaim.id });
          if (result.success) {
            console.log(`  [ORDER] ${picker.name} claimed order (value: $${orderToClaim.totalValue}, due turn ${orderToClaim.dueTurn})`);
          } else {
            console.log(`  [ORDER] ${picker.name} claim failed: ${result.error}`);
            // If it's "not your turn" error, that's a bug
            if (result.error && result.error.includes('ไม่ถึงตา')) {
              bugs.push({ phase: 'order_selection', turn, error: `Player ${picker.name} was identified as picker but got "not your turn" error` });
            }
            // Try passing instead
            const passResult = await emitWithAck(picker.socket, 'pass_order', {});
            if (passResult.phaseComplete) orderPhaseComplete = true;
          }
        } else {
          const result = await emitWithAck(picker.socket, 'pass_order', {});
          if (result.success) {
            if (result.phaseComplete) {
              orderPhaseComplete = true;
            }
          } else {
            console.log(`  [ORDER] ${picker.name} pass failed: ${result.error}`);
            bugs.push({ phase: 'order_selection', turn, player: picker.name, error: `Pass failed: ${result.error}` });
          }
        }

        await sleep(50);
        // Re-check state after action
        if (players[0].gameState.phase !== 'order_selection') {
          orderPhaseComplete = true;
        }
      }

      if (orderRounds >= maxOrderRounds) {
        bugs.push({ phase: 'order_selection', turn, error: `Order selection stuck after ${maxOrderRounds} rounds` });
        console.log(`  [BUG] Order selection appears stuck!`);
        break;
      }

      // --- PURCHASING PHASE ---
      await waitForState(players[0], s => s.phase === 'purchasing' && s.currentTurn === turn);
      console.log(`  [PURCHASE] Phase started`);

      // Each player makes purchases based on strategy
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const pState = players[0].gameState.players[player.socket.id];
        
        if (!pState) {
          bugs.push({ phase: 'purchasing', turn, error: `Player ${player.name} not found in game state` });
          continue;
        }

        const cash = pState.cash;
        const vendorStrike = players[0].gameState.turnModifiers?.vendorStrike;

        let purchases = [];

        if (vendorStrike) {
          // Can't buy during vendor strike - just submit empty
          console.log(`  [PURCHASE] ${player.name}: Vendor strike - skipping`);
        } else {
          switch (i) {
            case 0: // Aggressive - buy lots of everything
              if (cash > 2000) {
                purchases.push({ color: 'red', quantity: 5 });
                purchases.push({ color: 'blue', quantity: 5 });
                purchases.push({ color: 'green', quantity: 3 });
              }
              break;
            case 1: // Conservative - buy only what's needed for active orders
              {
                const activeOrders = pState.activeOrders || [];
                const needed = {};
                for (const order of activeOrders) {
                  for (const item of order.items) {
                    const have = pState.warehouse[item.color] || 0;
                    const need = item.quantity - have;
                    if (need > 0) {
                      needed[item.color] = (needed[item.color] || 0) + need;
                    }
                  }
                }
                for (const [color, qty] of Object.entries(needed)) {
                  if (cash > 500) {
                    purchases.push({ color, quantity: Math.min(qty, 10) });
                  }
                }
              }
              break;
            case 2: // Speculator - buy cheap goods in bulk
              if (cash > 3000 && turn <= 5) {
                purchases.push({ color: 'red', quantity: 10 });
                purchases.push({ color: 'blue', quantity: 10 });
              } else if (cash > 1500) {
                purchases.push({ color: 'red', quantity: 5 });
              }
              break;
            case 3: // Lazy - rarely buys
              if (turn % 3 === 0 && cash > 1000) {
                purchases.push({ color: 'red', quantity: 3 });
              }
              break;
          }
        }

        try {
          let result;
          if (purchases.length === 0) {
            result = await emitWithAck(player.socket, 'skip_purchase', {});
            if (result.success) {
              console.log(`  [PURCHASE] ${player.name}: Skipped`);
            } else {
              console.log(`  [PURCHASE] ${player.name}: Skip failed - ${result.error}`);
              bugs.push({ phase: 'purchasing', turn, player: player.name, error: `Skip failed: ${result.error}` });
            }
          } else {
            result = await emitWithAck(player.socket, 'submit_purchases', { purchases });
            if (result.success) {
              console.log(`  [PURCHASE] ${player.name}: Bought ${purchases.map(p => `${p.quantity}x ${p.color}`).join(', ')} (cost: $${result.totalCost || 0})`);
            } else {
              // If not enough money, skip instead
              console.log(`  [PURCHASE] ${player.name}: Purchase failed (${result.error}), skipping`);
              if (result.error && result.error.includes('เงินไม่พอ')) {
                // Expected behavior - skip instead
                const skipResult = await emitWithAck(player.socket, 'skip_purchase', {});
                if (!skipResult.success) {
                  bugs.push({ phase: 'purchasing', turn, player: player.name, error: `Skip after failed purchase also failed: ${skipResult.error}` });
                }
              } else if (result.error && result.error.includes('สั่งซื้อไปแล้ว')) {
                // Already submitted - might be a timing issue
                warnings.push({ phase: 'purchasing', turn, player: player.name, warning: 'Double submit detected' });
              } else {
                bugs.push({ phase: 'purchasing', turn, player: player.name, error: `Purchase failed: ${result.error}` });
              }
            }
          }
        } catch (err) {
          console.log(`  [PURCHASE] ${player.name}: Error - ${err.message}`);
          bugs.push({ phase: 'purchasing', turn, player: player.name, error: err.message });
        }

        await sleep(100);
      }

      // --- RESOLUTION PHASE ---
      await waitForState(players[0], s => (s.phase === 'resolution' || s.phase === 'game_over') && s.currentTurn >= turn, 20000);
      const resState = players[0].gameState;
      console.log(`  [RESOLUTION] Turn ${turn} resolved`);
      
      // Log deliveries
      if (resState.resolutionLog) {
        for (const log of resState.resolutionLog) {
          if (log.arrivals.length > 0) {
            console.log(`    ${log.playerName}: ${log.arrivals.length} shipments arrived`);
          }
          if (log.deliveries.length > 0) {
            for (const d of log.deliveries) {
              console.log(`    ${log.playerName}: Delivered order (payment: $${d.netPayment}, late: ${d.turnsLate} turns)`);
            }
          }
          if (log.overflow && log.overflow.cost) {
            console.log(`    ${log.playerName}: Warehouse overflow! Cost: $${log.overflow.cost}`);
            warnings.push({ phase: 'resolution', turn, player: log.playerName, warning: `Overflow cost: $${log.overflow.cost}` });
          }
        }
      }

      // Print cash summary
      for (const pid of resState.playerOrder) {
        const p = resState.players[pid];
        const pName = players.find(pl => pl.socket.id === pid)?.name || p.name;
        console.log(`    ${pName}: $${p.cash} cash, ${p.warehouseTotal} items in warehouse, ${p.activeOrders.length} active orders`);
      }

      // Validate state
      for (const pid of resState.playerOrder) {
        const p = resState.players[pid];
        if (p.cash < -50000) {
          bugs.push({ phase: 'resolution', turn, player: p.name, error: `Unreasonably negative cash: $${p.cash}` });
        }
        if (p.warehouseTotal < 0) {
          bugs.push({ phase: 'resolution', turn, player: p.name, error: `Negative warehouse total: ${p.warehouseTotal}` });
        }
        // Check individual colors aren't negative
        for (const [color, qty] of Object.entries(p.warehouse)) {
          if (qty < 0) {
            bugs.push({ phase: 'resolution', turn, player: p.name, error: `Negative inventory for ${color}: ${qty}` });
          }
        }
      }

      // Advance to next turn (if not last turn and not game_over)
      if (players[0].gameState.phase === 'game_over') {
        console.log(`  [INFO] Game ended after turn ${turn}`);
        break;
      } else if (turn < 10) {
        await sleep(300);
        players[0].socket.emit('next_turn');
        await sleep(500);
      } else {
        // After turn 10 resolution, advance to trigger game_over
        await sleep(300);
        if (players[0].gameState.phase !== 'game_over') {
          players[0].socket.emit('next_turn');
          await sleep(500);
        }
      }
    } catch (err) {
      console.error(`  [ERROR] Turn ${turn}: ${err.message}`);
      bugs.push({ phase: `turn_${turn}`, error: err.message });
      
      // Try to recover - emit next_turn
      players[0].socket.emit('next_turn');
      await sleep(1000);
    }
  }

  // Step 6: Verify game over
  console.log(`\n${'='.repeat(60)}`);
  console.log('GAME OVER CHECK');
  console.log(`${'='.repeat(60)}`);

  try {
    await waitForState(players[0], s => s.phase === 'game_over', 10000);
    gameCompleted = true;
    finalScores = players[0].gameState.scores;
    
    console.log('✓ Game reached game_over state!\n');
    console.log('FINAL SCORES:');
    console.log('-'.repeat(40));
    for (const score of finalScores) {
      console.log(`  ${score.playerName}:`);
      console.log(`    Final Score: $${score.finalScore}`);
      console.log(`    Cash: $${score.cash}`);
      console.log(`    Inventory Value: $${score.inventoryValue}`);
      console.log(`    Unfulfilled Penalty: -$${score.unfulfilledPenalty}`);
      console.log(`    Revenue: $${score.totalRevenue} | Costs: $${score.totalCosts} | Penalties: $${score.totalPenalties}`);
      console.log(`    Orders Completed: ${score.completedOrders}`);
    }
  } catch (err) {
    console.log(`✗ Game did NOT reach game_over state!`);
    console.log(`  Current phase: ${players[0].gameState?.phase}`);
    console.log(`  Current turn: ${players[0].gameState?.currentTurn}`);
    bugs.push({ phase: 'game_over', error: `Game did not complete: ${err.message}` });
  }

  // Cleanup
  for (const player of players) {
    player.socket.disconnect();
  }

  // Final Report
  console.log(`\n${'='.repeat(60)}`);
  console.log('QA TEST REPORT');
  console.log(`${'='.repeat(60)}`);
  console.log(`Game Completed: ${gameCompleted ? '✓ YES' : '✗ NO'}`);
  console.log(`Bugs Found: ${bugs.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (bugs.length > 0) {
    console.log('\n--- BUGS ---');
    for (const bug of bugs) {
      console.log(`  [${bug.phase}] ${bug.player ? `(${bug.player}) ` : ''}${bug.error}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n--- WARNINGS ---');
    for (const w of warnings) {
      console.log(`  [${w.phase}] ${w.player ? `(${w.player}) ` : ''}${w.warning}`);
    }
  }

  if (bugs.length === 0 && gameCompleted) {
    console.log('\n🎉 ALL TESTS PASSED! Game completed successfully with no bugs.');
  } else if (gameCompleted) {
    console.log(`\n⚠️  Game completed but ${bugs.length} bug(s) found.`);
  } else {
    console.log(`\n❌ Game did NOT complete. ${bugs.length} bug(s) found.`);
  }

  process.exit(bugs.length > 0 ? 1 : 0);
}

// Run the test
runTest().catch(err => {
  console.error(`\nFATAL ERROR: ${err.message}`);
  console.error(err.stack);
  process.exit(2);
});
