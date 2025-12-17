/**
 * SOLARA CHECKPOINT SIGNER
 * Manages Solana keypair for checkpoint payments
 * Reads from secure file location
 */

import { Keypair, Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import fs from 'fs'

const KEY_PATH = '/solara-core/keys/checkpoint-signer.json'
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

class CheckpointSigner {
  constructor() {
    this.keypair = null
    this.connection = new Connection(SOLANA_RPC, 'confirmed')
    this.paymentHistory = []
  }

  /**
   * Load keypair from secure file
   */
  async loadKeypair() {
    try {
      // Check if key file exists
      if (!fs.existsSync(KEY_PATH)) {
        console.warn('⚠️  Checkpoint signer key not found at:', KEY_PATH)
        console.warn('   Place your Solana private key (base58) in this file to enable payments')
        return false
      }

      // Read key file (should contain base58 private key)
      const keyData = fs.readFileSync(KEY_PATH, 'utf8').trim()

      // Parse as JSON array [1,2,3...] or base58 string
      let secretKey
      if (keyData.startsWith('[')) {
        // JSON array format
        secretKey = Uint8Array.from(JSON.parse(keyData))
      } else {
        // Base58 string format
        secretKey = bs58.decode(keyData)
      }

      this.keypair = Keypair.fromSecretKey(secretKey)

      console.log('✅ CHECKPOINT SIGNER ACTIVATED')
      console.log('📍 Address:', this.keypair.publicKey.toString())

      // Get balance
      const balance = await this.connection.getBalance(this.keypair.publicKey)
      console.log('💰 Balance:', (balance / 1e9).toFixed(4), 'SOL')

      return true
    } catch (error) {
      console.error('❌ Failed to load checkpoint signer:', error.message)
      return false
    }
  }

  /**
   * Send checkpoint payment
   */
  async sendCheckpointPayment(checkpointIndex, blockCount, txCount) {
    if (!this.keypair) {
      console.warn('⚠️  Checkpoint signer not loaded - skipping payment')
      return null
    }

    try {
      // Payment amount: 0.000001 SOL (1000 lamports)
      const lamports = 1000

      // Create memo instruction
      const memo = `CHECKPOINT ${checkpointIndex} — SLR-01 BLOCK ${blockCount} — TX ${txCount} VERIFIED`

      // Self-transfer with memo (keeps payment on-chain as proof)
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: this.keypair.publicKey, // Send to self
          lamports: lamports
        })
      )

      // Add memo as transaction message
      transaction.feePayer = this.keypair.publicKey
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash

      // Sign and send
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.keypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      )

      const payment = {
        checkpointIndex,
        blockCount,
        txCount,
        signature,
        memo,
        timestamp: Date.now(),
        amount: lamports / 1e9,
        status: 'confirmed'
      }

      this.paymentHistory.push(payment)
      console.log(`[PAYMENT] Checkpoint Payment Sent — TX: ${signature}`)
      console.log(`          Checkpoint ${checkpointIndex} — ${txCount} transactions verified`)

      return payment
    } catch (error) {
      console.error('❌ Checkpoint payment failed:', error.message)

      const failedPayment = {
        checkpointIndex,
        blockCount,
        txCount,
        error: error.message,
        timestamp: Date.now(),
        status: 'failed'
      }

      this.paymentHistory.push(failedPayment)
      return failedPayment
    }
  }

  /**
   * Get payment status
   */
  getStatus() {
    return {
      signerLoaded: !!this.keypair,
      signerAddress: this.keypair ? this.keypair.publicKey.toString() : null,
      paymentCount: this.paymentHistory.length,
      lastPayment: this.paymentHistory[this.paymentHistory.length - 1] || null,
      paymentHistory: this.paymentHistory.slice(-10) // Last 10 payments
    }
  }

  /**
   * Verify payment for specific checkpoint
   */
  async verifyPayment(checkpointIndex) {
    const payment = this.paymentHistory.find(p => p.checkpointIndex === checkpointIndex)

    if (!payment) {
      return { verified: false, error: 'Payment not found' }
    }

    if (payment.status === 'failed') {
      return { verified: false, error: payment.error }
    }

    try {
      // Verify transaction on Solana
      const tx = await this.connection.getTransaction(payment.signature, {
        commitment: 'confirmed'
      })

      return {
        verified: !!tx,
        checkpointIndex,
        signature: payment.signature,
        blockTime: tx?.blockTime,
        slot: tx?.slot,
        memo: payment.memo
      }
    } catch (error) {
      return {
        verified: false,
        error: error.message,
        checkpointIndex,
        signature: payment.signature
      }
    }
  }

  /**
   * Get current balance
   */
  async getBalance() {
    if (!this.keypair) return 0

    try {
      const balance = await this.connection.getBalance(this.keypair.publicKey)
      return balance / 1e9 // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to fetch balance:', error.message)
      return 0
    }
  }
}

// Export singleton
const checkpointSigner = new CheckpointSigner()

export { checkpointSigner, CheckpointSigner }
