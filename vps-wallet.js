// VPS-Native Solara Wallet
// Uses Ed25519 keys stored on VPS - NO EXTERNAL FEES!

import fs from 'fs'
import crypto from 'crypto'

const WALLET_KEY_PATH = '/etc/solara/solara.key'
const WALLET_PUB_PATH = '/etc/solara/solara.pub'

class SolaraWallet {
  constructor() {
    this.privateKey = null
    this.publicKey = null
    this.address = null
  }

  // Load wallet from VPS filesystem
  async loadWallet() {
    try {
      const privateKeyPEM = await fs.promises.readFile(WALLET_KEY_PATH, 'utf8')
      const publicKeyPEM = await fs.promises.readFile(WALLET_PUB_PATH, 'utf8')

      this.privateKey = crypto.createPrivateKey(privateKeyPEM)
      this.publicKey = crypto.createPublicKey(publicKeyPEM)

      // Generate SLR-01 style address from public key
      const pubKeyBuffer = this.publicKey.export({ type: 'spki', format: 'der' })
      const hash = crypto.createHash('sha256').update(pubKeyBuffer).digest()
      const addressHex = hash.slice(-20).toString('hex')
      this.address = 'SLR-01-' + addressHex

      console.log('✅ Solara VPS Wallet loaded!')
      console.log('📍 Address:', this.address)

      return {
        address: this.address,
        publicKey: publicKeyPEM
      }
    } catch (error) {
      console.error('❌ Failed to load wallet:', error.message)
      return null
    }
  }

  // Sign transaction with private key
  signTransaction(txData) {
    if (!this.privateKey) {
      throw new Error('Wallet not loaded!')
    }

    const txString = JSON.stringify(txData)
    const signature = crypto.sign(null, Buffer.from(txString), this.privateKey)

    return {
      ...txData,
      signature: signature.toString('hex'),
      from: this.address
    }
  }

  // Verify transaction signature
  verifySignature(txData, signature) {
    if (!this.publicKey) {
      throw new Error('Wallet not loaded!')
    }

    const txString = JSON.stringify(txData)
    return crypto.verify(
      null,
      Buffer.from(txString),
      this.publicKey,
      Buffer.from(signature, 'hex')
    )
  }

  // Get wallet info
  getInfo() {
    return {
      address: this.address,
      hasPrivateKey: !!this.privateKey,
      hasPublicKey: !!this.publicKey,
      keyType: 'Ed25519',
      secured: 'VPS-native, no external fees'
    }
  }
}

// Export singleton instance
const vpsWallet = new SolaraWallet()

export { vpsWallet, SolaraWallet }

console.log('🔑 VPS Wallet module loaded - Solara-native, zero external fees!')
