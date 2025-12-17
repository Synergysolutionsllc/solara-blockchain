/**
 * SOLARA SERVER PAYMENT ENGINE PATCH
 *
 * This file contains the code additions for server-ultimate.js
 * Add these imports and modifications to enable checkpoint payments
 */

// ============================================
// ADD TO IMPORTS SECTION (after existing imports)
// ============================================

import { checkpointSigner } from './checkpoint-signer.js'
import { mmnStorage } from './mmn-storage.js'

// ============================================
// ADD TO INITIALIZATION SECTION (after peerManager init)
// ============================================

// Initialize checkpoint signer
await checkpointSigner.loadKeypair()

// Initialize MMN persistent storage
await mmnStorage.initialize()

// ============================================
// MODIFY createCheckpoint() FUNCTION
// Replace existing createCheckpoint with this:
// ============================================

async function createCheckpoint() {
  checkpointIndex++

  try {
    // Save checkpoint data
    const checkpointData = {
      index: checkpointIndex,
      blockCounter,
      totalTxProcessed,
      timestamp: Date.now()
    }

    fs.writeFileSync(
      `/solara-core/checkpoints/chk-${checkpointIndex}.json`,
      JSON.stringify(checkpointData, null, 2)
    )

    console.log(`📸 Checkpoint ${checkpointIndex}`)

    // Trigger automatic payment
    const payment = await checkpointSigner.sendCheckpointPayment(
      checkpointIndex,
      blockCounter,
      totalTxProcessed
    )

    if (payment && payment.status === 'confirmed') {
      console.log(`✅ Checkpoint payment confirmed: ${payment.signature}`)
    }

  } catch (err) {
    console.error('Checkpoint creation error:', err.message)
  }

  txSinceCheckpoint = 0
  saveSystemState()
}

// ============================================
// MODIFY TRANSACTION STORAGE
// Add this after transaction creation (around line 460+)
// ============================================

// Store in MMN persistent storage
await mmnStorage.storeTransaction(enhancedTx)

// ============================================
// ADD NEW API ENDPOINTS
// Add these before app.listen()
// ============================================

// Payment Status Endpoint
app.get('/api/payments/status', async (req, res) => {
  try {
    const status = checkpointSigner.getStatus()
    const balance = await checkpointSigner.getBalance()

    res.json({
      ...status,
      balance: balance,
      balanceSOL: balance.toFixed(6),
      rpcEndpoint: checkpointSigner.connection.rpcEndpoint
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Verify Specific Checkpoint Payment
app.get('/api/payments/verify/:checkpoint', async (req, res) => {
  try {
    const checkpointIndex = parseInt(req.params.checkpoint)
    const verification = await checkpointSigner.verifyPayment(checkpointIndex)

    res.json(verification)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// MMN Storage Stats
app.get('/api/mmn/stats', (req, res) => {
  try {
    const stats = mmnStorage.getStats()
    const fileInfo = mmnStorage.getFileInfo()

    res.json({
      storage: stats,
      file: fileInfo,
      performance: {
        compressionRatio: stats.compressionRatio || 'N/A',
        bytesPerTransaction: 40,
        equivalentJSONSize: (stats.totalTransactions * 500 / (1024 * 1024)).toFixed(2) + ' MB',
        actualSize: stats.actualFileSizeMB + ' MB'
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get Recent Transactions (from MMN storage)
app.get('/api/mmn/transactions/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const transactions = mmnStorage.getRecentTransactions(limit)

    res.json({
      count: transactions.length,
      transactions: transactions
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Reload MMN Storage from Disk
app.post('/api/mmn/reload', async (req, res) => {
  try {
    const stats = await mmnStorage.reload()
    res.json({
      message: 'MMN storage reloaded successfully',
      stats: stats
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// AI Chat - Get Transactions with MMN Data
app.get('/api/chat/transactions/latest', (req, res) => {
  try {
    // Get recent transactions from MMN storage
    const mmnTransactions = mmnStorage.getRecentTransactions(50)

    // Also include in-memory transactions array if it exists
    const recentTransactions = transactions ? transactions.slice(0, 50) : []

    res.json({
      source: 'mmn_persistent_storage',
      mmnCount: mmnTransactions.length,
      inMemoryCount: recentTransactions.length,
      mmnTransactions: mmnTransactions,
      inMemoryTransactions: recentTransactions,
      storageStats: mmnStorage.getStats()
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Chatbot Real-time Transactions
app.get('/api/chatbot/transactions/realtime', (req, res) => {
  try {
    const mmnTransactions = mmnStorage.getRecentTransactions(100)

    res.json({
      totalTransactions: mmnStorage.totalTransactions,
      recentTransactions: mmnTransactions,
      storageEnabled: mmnStorage.storageEnabled,
      compressionActive: true,
      bytesPerTransaction: 40
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

console.log('')
console.log('💳 Payment Engine Endpoints:')
console.log('   GET /api/payments/status')
console.log('   GET /api/payments/verify/:checkpoint')
console.log('   GET /api/mmn/stats')
console.log('   GET /api/mmn/transactions/recent')
console.log('   POST /api/mmn/reload')
console.log('   GET /api/chat/transactions/latest')
console.log('   GET /api/chatbot/transactions/realtime')
