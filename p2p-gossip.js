/**
 * SOLARA P2P GOSSIP PROTOCOL
 * Distributed validator communication layer
 *
 * Features:
 * - Peer discovery and heartbeat
 * - Validator state synchronization
 * - Transaction pool propagation
 * - Block broadcast and confirmation
 * - Gossip latency measurement
 */

import { WebSocketServer, WebSocket } from 'ws'
import crypto from 'crypto'

// ============================================
// P2P CONFIGURATION
// ============================================

const NODE_CONFIG = {
  // This node's identity
  nodeId: process.env.NODE_ID || crypto.randomBytes(16).toString('hex'),
  nodeName: process.env.NODE_NAME || 'SLR-VALIDATOR',
  nodeIP: process.env.NODE_IP || '0.0.0.0',

  // Gossip port (separate from API)
  gossipPort: parseInt(process.env.GOSSIP_PORT || '8001'),

  // Bootstrap peers (hardcoded for initial discovery)
  bootstrapPeers: process.env.BOOTSTRAP_PEERS
    ? process.env.BOOTSTRAP_PEERS.split(',')
    : [],

  // Network settings
  heartbeatInterval: 5000,      // 5 seconds
  reconnectDelay: 10000,        // 10 seconds
  peerTimeout: 30000,           // 30 seconds
  maxPeers: 100,

  // Genesis reference
  genesisHash: '6UpbSgoJbkPRk2t9PGgdyc7rPtqd9NFaTcxKKhhzLEuw'
}

// ============================================
// PEER MANAGER
// ============================================

class PeerManager {
  constructor() {
    this.peers = new Map() // peerId -> PeerConnection
    this.server = null
    this.callbacks = {
      onValidatorState: null,
      onTransaction: null,
      onBlock: null,
      onPeerConnected: null,
      onPeerDisconnected: null
    }
  }

  // Start gossip server
  startServer() {
    this.server = new WebSocketServer({
      port: NODE_CONFIG.gossipPort,
      perMessageDeflate: false // Disable compression for low latency
    })

    this.server.on('connection', (ws, req) => {
      const peerIP = req.socket.remoteAddress
      const peerId = crypto.randomBytes(8).toString('hex')
      console.log(`[P2P] Incoming connection from ${peerIP} (assigned ID: ${peerId})`)

      // Store incoming peer immediately
      this.peers.set(peerId, {
        id: peerId,
        url: peerIP,
        socket: ws,
        connected: true,
        lastSeen: Date.now(),
        latency: 0,
        validatorCount: 0
      })

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(ws, message, peerIP, peerId)
        } catch (err) {
          console.error('[P2P] Invalid message:', err.message)
        }
      })

      ws.on('close', () => {
        console.log(`[P2P] Incoming peer ${peerId} disconnected`)
        this.peers.delete(peerId)
        if (this.callbacks.onPeerDisconnected) {
          this.callbacks.onPeerDisconnected(peerId)
        }
      })

      ws.on('error', (err) => {
        console.error(`[P2P] WebSocket error: ${err.message}`)
      })
    })

    console.log(`[P2P] 🌐 Gossip server listening on port ${NODE_CONFIG.gossipPort}`)

    // Start heartbeat
    this.startHeartbeat()
  }

  // Connect to bootstrap peers
  connectToBootstrapPeers() {
    for (const peerUrl of NODE_CONFIG.bootstrapPeers) {
      this.connectToPeer(peerUrl)
    }
  }

  // Connect to a peer
  connectToPeer(peerUrl) {
    if (this.peers.size >= NODE_CONFIG.maxPeers) {
      console.log('[P2P] Max peers reached, ignoring new connection')
      return
    }

    // Parse peer URL (format: ws://IP:PORT or IP:PORT)
    const url = peerUrl.startsWith('ws://') ? peerUrl : `ws://${peerUrl}`

    try {
      const ws = new WebSocket(url)
      const peerId = crypto.randomBytes(8).toString('hex')

      ws.on('open', () => {
        console.log(`[P2P] ✅ Connected to peer: ${peerUrl}`)

        // Send handshake
        this.send(ws, {
          type: 'handshake',
          nodeId: NODE_CONFIG.nodeId,
          nodeName: NODE_CONFIG.nodeName,
          genesisHash: NODE_CONFIG.genesisHash,
          timestamp: Date.now()
        })

        // Store peer
        this.peers.set(peerId, {
          id: peerId,
          url: peerUrl,
          socket: ws,
          connected: true,
          lastSeen: Date.now(),
          latency: 0,
          validatorCount: 0
        })

        if (this.callbacks.onPeerConnected) {
          this.callbacks.onPeerConnected(peerId, peerUrl)
        }
      })

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(ws, message, peerUrl, peerId)
        } catch (err) {
          console.error('[P2P] Invalid message:', err.message)
        }
      })

      ws.on('close', () => {
        console.log(`[P2P] Disconnected from peer: ${peerUrl}`)
        this.peers.delete(peerId)

        if (this.callbacks.onPeerDisconnected) {
          this.callbacks.onPeerDisconnected(peerId)
        }

        // Reconnect after delay
        setTimeout(() => {
          console.log(`[P2P] Attempting to reconnect to ${peerUrl}...`)
          this.connectToPeer(peerUrl)
        }, NODE_CONFIG.reconnectDelay)
      })

      ws.on('error', (err) => {
        console.error(`[P2P] Connection error to ${peerUrl}:`, err.message)
      })

    } catch (err) {
      console.error(`[P2P] Failed to connect to ${peerUrl}:`, err.message)
    }
  }

  // Handle incoming messages
  handleMessage(ws, message, peerInfo, peerId = null) {
    const { type, ...data } = message

    switch (type) {
      case 'handshake':
        console.log(`[P2P] Handshake from ${data.nodeName} (${data.nodeId})`)

        // Verify genesis hash
        if (data.genesisHash !== NODE_CONFIG.genesisHash) {
          console.error('[P2P] Genesis hash mismatch! Rejecting peer.')
          ws.close()
          return
        }

        // Send handshake response
        this.send(ws, {
          type: 'handshake_ack',
          nodeId: NODE_CONFIG.nodeId,
          nodeName: NODE_CONFIG.nodeName,
          timestamp: Date.now()
        })
        break

      case 'handshake_ack':
        console.log(`[P2P] Handshake acknowledged by ${data.nodeName} (${data.nodeId})`)

        // Update peer info if we have it
        if (peerId && this.peers.has(peerId)) {
          const peer = this.peers.get(peerId)
          peer.lastSeen = Date.now()
        }
        break

      case 'heartbeat':
        // Calculate latency
        const latency = Date.now() - data.timestamp

        if (peerId && this.peers.has(peerId)) {
          const peer = this.peers.get(peerId)
          peer.lastSeen = Date.now()
          peer.latency = latency
          peer.validatorCount = data.validatorCount || 0
        }

        // Send pong
        this.send(ws, { type: 'pong', timestamp: Date.now() })
        break

      case 'validator_state':
        if (this.callbacks.onValidatorState) {
          this.callbacks.onValidatorState(data.validators, peerInfo)
        }
        break

      case 'transaction':
        if (this.callbacks.onTransaction) {
          this.callbacks.onTransaction(data.transaction, peerInfo)
        }
        break

      case 'block':
        if (this.callbacks.onBlock) {
          this.callbacks.onBlock(data.block, peerInfo)
        }
        break

      case 'pong':
        // Latency already calculated in heartbeat
        break

      default:
        console.log(`[P2P] Unknown message type: ${type}`)
    }
  }

  // Send message to peer
  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  // Broadcast to all peers
  broadcast(message) {
    let sent = 0
    for (const peer of this.peers.values()) {
      if (peer.connected && peer.socket.readyState === WebSocket.OPEN) {
        this.send(peer.socket, message)
        sent++
      }
    }
    return sent
  }

  // Start heartbeat to all peers
  startHeartbeat() {
    setInterval(() => {
      const now = Date.now()

      for (const [peerId, peer] of this.peers.entries()) {
        // Check if peer timed out
        if (now - peer.lastSeen > NODE_CONFIG.peerTimeout) {
          console.log(`[P2P] Peer ${peerId} timed out`)
          peer.socket.close()
          this.peers.delete(peerId)
          continue
        }

        // Send heartbeat
        if (peer.connected && peer.socket.readyState === WebSocket.OPEN) {
          this.send(peer.socket, {
            type: 'heartbeat',
            timestamp: now,
            validatorCount: 45 // TODO: Get from validator manager
          })
        }
      }
    }, NODE_CONFIG.heartbeatInterval)
  }

  // Remove peer by socket
  removePeerBySocket(ws) {
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.socket === ws) {
        console.log(`[P2P] Removing peer ${peerId}`)
        this.peers.delete(peerId)
        break
      }
    }
  }

  // Get peer stats
  getPeerStats() {
    const stats = {
      totalPeers: this.peers.size,
      connectedPeers: 0,
      averageLatency: 0,
      peers: []
    }

    let totalLatency = 0
    for (const peer of this.peers.values()) {
      if (peer.connected) {
        stats.connectedPeers++
        totalLatency += peer.latency

        stats.peers.push({
          id: peer.id,
          url: peer.url,
          latency: peer.latency,
          lastSeen: peer.lastSeen,
          validatorCount: peer.validatorCount
        })
      }
    }

    stats.averageLatency = stats.connectedPeers > 0
      ? Math.round(totalLatency / stats.connectedPeers)
      : 0

    return stats
  }

  // Register callbacks
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
      this.callbacks[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback
    }
  }

  // Get all peers
  getPeers() {
    const peers = []
    for (const peer of this.peers.values()) {
      if (peer.connected) {
        peers.push({
          id: peer.id,
          url: peer.url,
          latency: peer.latency,
          lastSeen: peer.lastSeen
        })
      }
    }
    return peers
  }

  // Shutdown
  shutdown() {
    console.log('[P2P] Shutting down gossip network...')

    for (const peer of this.peers.values()) {
      peer.socket.close()
    }

    if (this.server) {
      this.server.close()
    }
  }
}

// ============================================
// EXPORT
// ============================================

export { PeerManager, NODE_CONFIG }
