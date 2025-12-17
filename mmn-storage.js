/**
 * MMN PERSISTENT STORAGE MANAGER
 * Handles persistent .nib file storage with in-memory caching
 */

import { NibbleTX } from './nibble-tx.js'
import fs from 'fs'
import path from 'path'

const STORAGE_DIR = '/solara-core/mmn'
const STORAGE_FILE = path.join(STORAGE_DIR, 'transactions.nib')

class MMNStorage {
  constructor() {
    this.nibbleTX = new NibbleTX()
    this.inMemoryTransactions = []
    this.totalTransactions = 0
    this.storageEnabled = false
  }

  /**
   * Initialize storage
   */
  async initialize() {
    try {
      // Create storage directory if it doesn't exist
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true })
        console.log('📁 Created MMN storage directory:', STORAGE_DIR)
      }

      // Load existing transactions from file
      if (fs.existsSync(STORAGE_FILE)) {
        await this.loadFromDisk()
      } else {
        console.log('📝 No existing MMN storage file - starting fresh')
      }

      this.storageEnabled = true
      console.log('✅ MMN Persistent Storage ENABLED')
      console.log(`   Storage: ${STORAGE_FILE}`)
      console.log(`   Loaded: ${this.totalTransactions} transactions`)

      return true
    } catch (error) {
      console.error('❌ Failed to initialize MMN storage:', error.message)
      this.storageEnabled = false
      return false
    }
  }

  /**
   * Load all transactions from disk into memory
   */
  async loadFromDisk() {
    try {
      const transactions = await this.nibbleTX.readFromFile(STORAGE_FILE)
      this.inMemoryTransactions = transactions
      this.totalTransactions = transactions.length

      const fileStats = fs.statSync(STORAGE_FILE)
      const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2)

      console.log(`📥 Loaded ${transactions.length} transactions from disk`)
      console.log(`   File size: ${fileSizeMB} MB`)
      console.log(`   Expected size: ${(transactions.length * 40 / (1024 * 1024)).toFixed(2)} MB`)

      return transactions
    } catch (error) {
      console.error('Failed to load from disk:', error.message)
      return []
    }
  }

  /**
   * Store transaction (memory + disk)
   */
  async storeTransaction(txData) {
    try {
      // Create nibble transaction buffer
      const txBuffer = this.nibbleTX.create(txData)

      // Parse it for in-memory storage
      const parsedTx = this.nibbleTX.parse(txBuffer)

      // Add SLR-01 hash and additional metadata
      parsedTx.hash = txData.hash
      parsedTx.from = txData.from
      parsedTx.to = txData.to
      parsedTx.amount = txData.amount
      parsedTx.layer = txData.layer
      parsedTx.validator = txData.validator

      // Add to in-memory array
      this.inMemoryTransactions.push(parsedTx)
      this.totalTransactions++

      // Append to disk if storage enabled
      if (this.storageEnabled) {
        await this.nibbleTX.appendToFile(STORAGE_FILE, txBuffer)
      }

      return parsedTx
    } catch (error) {
      console.error('Failed to store transaction:', error.message)
      return null
    }
  }

  /**
   * Get recent transactions (from memory)
   */
  getRecentTransactions(limit = 100) {
    return this.inMemoryTransactions.slice(-limit).reverse()
  }

  /**
   * Get all transactions
   */
  getAllTransactions() {
    return this.inMemoryTransactions
  }

  /**
   * Get transaction by hash
   */
  getTransactionByHash(hash) {
    return this.inMemoryTransactions.find(tx => tx.hash === hash)
  }

  /**
   * Get storage stats
   */
  getStats() {
    const stats = {
      enabled: this.storageEnabled,
      storagePath: STORAGE_FILE,
      totalTransactions: this.totalTransactions,
      inMemoryCount: this.inMemoryTransactions.length,
      expectedFileSizeBytes: this.totalTransactions * 40,
      expectedFileSizeMB: (this.totalTransactions * 40 / (1024 * 1024)).toFixed(2)
    }

    // Get actual file size if exists
    if (fs.existsSync(STORAGE_FILE)) {
      const fileStats = fs.statSync(STORAGE_FILE)
      stats.actualFileSizeBytes = fileStats.size
      stats.actualFileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2)
      stats.compressionRatio = ((1 - (fileStats.size / (this.totalTransactions * 500))) * 100).toFixed(1) + '%'
    }

    return stats
  }

  /**
   * Clear in-memory cache (keep disk storage)
   */
  clearMemory() {
    const count = this.inMemoryTransactions.length
    this.inMemoryTransactions = []
    console.log(`🗑️  Cleared ${count} transactions from memory (disk storage preserved)`)
  }

  /**
   * Reload from disk
   */
  async reload() {
    console.log('🔄 Reloading transactions from disk...')
    await this.loadFromDisk()
    return this.getStats()
  }

  /**
   * Get file info
   */
  getFileInfo() {
    if (!fs.existsSync(STORAGE_FILE)) {
      return { exists: false }
    }

    const stats = fs.statSync(STORAGE_FILE)
    return {
      exists: true,
      path: STORAGE_FILE,
      size: stats.size,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      created: stats.birthtime,
      modified: stats.mtime,
      transactionCount: Math.floor(stats.size / 40)
    }
  }
}

// Export singleton
const mmnStorage = new MMNStorage()

export { mmnStorage, MMNStorage }
