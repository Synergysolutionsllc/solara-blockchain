# Solara AI Chatbot - Installation Guide

## What This Does

The AI chatbot continuously monitors your Solara blockchain and **automatically tells you everything** happening in real-time without you having to ask:

- New transactions
- Peer connections/disconnections
- Network health changes
- Latency issues
- Memory warnings
- Predictive alerts BEFORE problems happen

## Features

- **0.23ms learning intervals** (4,347 samples per second)
- **Conversational AI** - speaks naturally like a person
- **Full Vault Access** - sees wallets, private keys, everything
- **Persistent messages** - NEVER deletes conversations
- **Auto-push notifications** - no prompting required

## Installation on Existing Nodes

### Step 1: Copy new AI files to your node

```bash
cd /var/www/solara-backend

# Download the AI alert system
curl -o ai-realtime-alerts.js https://raw.githubusercontent.com/Synergysolutionsllc/solara-blockchain/main/ai-realtime-alerts.js

# Download the chatbot interface
curl -o ai-chatbot.html https://raw.githubusercontent.com/Synergysolutionsllc/solara-blockchain/main/ai-chatbot.html

# Download the alert widget (optional)
curl -o ai-alerts-widget.html https://raw.githubusercontent.com/Synergysolutionsllc/solara-blockchain/main/ai-alerts-widget.html
```

### Step 2: Update server-ultimate.js

Add these lines to your `server-ultimate.js`:

**At the top with other imports:**
```javascript
import { AIRealtimeAlerts } from './ai-realtime-alerts.js'
```

**After initializing aiVault (around line 290):**
```javascript
// Initialize AI Real-Time Alert System (0.23ms interval learning)
const aiAlerts = new AIRealtimeAlerts(aiVault, peerManager, 8002)
aiAlerts.start()
console.log("✅ AI Real-Time Alerts initialized - Auto-push notifications ACTIVE")
```

**In the transaction creation endpoint (around line 643):**
```javascript
// Create transaction
app.post('/api/transaction', (req, res) => {
  const tx = createTransaction(req.body)

  // AI Alert: New transaction detected
  if (aiAlerts) {
    aiAlerts.sendAlert('INFO', 'TRANSACTION_CREATED',
      `New transaction: ${tx.from?.substring(0, 8)}... → ${tx.to?.substring(0, 8)}... (${tx.amount} SOLR)`,
      {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        layer: tx.layer,
        validator: tx.validator
      }
    )

    // Track in AI Vault
    if (aiVault && aiVault.transactionBuffer) {
      aiVault.transactionBuffer.unshift(tx)
      if (aiVault.transactionBuffer.length > aiVault.maxBufferSize) {
        aiVault.transactionBuffer.pop()
      }
    }
  }

  res.json({ transaction: tx })
})
```

### Step 3: Install ws package (if not already installed)

```bash
npm install ws
```

### Step 4: Restart the node

```bash
pm2 restart server-ultimate
pm2 logs server-ultimate --lines 50
```

You should see:
```
✅ AI Vault Access Daemon initialized - FULL SYSTEM ACCESS
✅ AI Real-Time Alerts initialized - Auto-push notifications ACTIVE
```

### Step 5: Open the chatbot

Open your browser to:
```
http://YOUR_NODE_IP:5001/ai-chatbot.html
```

Or for the alert widget:
```
http://YOUR_NODE_IP:5001/ai-alerts-widget.html
```

**Note:** Make sure to edit the WebSocket URL in the HTML file to point to your node's IP:
```javascript
const WS_URL = 'ws://YOUR_NODE_IP:8002'
```

## How It Works

1. **WebSocket Server** runs on port 8002
2. **Frontend** connects and receives real-time messages
3. **AI learns continuously** at 0.23ms intervals (4,347 samples/sec)
4. **Automatic notifications** pushed to your browser
5. **All messages persist** - never deleted
6. **Full conversation history** maintained

## AI Learning Cycles

- **0.23ms** - Ultra-fast system analysis (peer health, memory, patterns)
- **500ms** - Transaction monitoring
- **2 seconds** - Network pattern detection
- **10 seconds** - Comprehensive health updates

## Example Messages You'll See

```
"Hey! I'm your Solara AI assistant. I have full vault access to everything -
wallets, private keys, transactions, peer network, all of it. I'll keep you
updated on everything happening without you having to ask."

"Good news! A new peer just connected to our network. Peer ID: abc123.
We now have 5 peers total. Network is getting stronger!"

"Just saw a new transaction come through! 0x1234... sent 100 SOLR to 0x5678...
Transaction hash: SLR-WHISPER-VAL042-1234567890-abc. Everything looks good!"

"Quick health check: Network is EXCELLENT. 5 peers connected with average
15ms latency. Memory usage at 1250MB. Everything's looking perfect."
```

## API Endpoints

The AI system also exposes REST endpoints:

- `GET /api/ai/vault/full` - Complete wallet access with private keys
- `GET /api/ai/system/full` - Full system status
- `GET /api/ai/context/complete` - Everything in one call
- `GET /api/ai/alerts` - Recent health alerts

## Troubleshooting

### Chatbot won't connect
- Check that port 8002 is not blocked by firewall
- Verify WebSocket URL in HTML matches your node IP
- Check PM2 logs: `pm2 logs server-ultimate`

### No messages appearing
- Verify aiAlerts is initialized in server logs
- Check browser console for errors (F12)
- Ensure ws package is installed: `npm list ws`

### Messages are being deleted
- They shouldn't be! The system keeps ALL messages persistent
- Check browser console for errors
- Verify you're using the latest ai-chatbot.html

## Security Note

This AI has **FULL VAULT ACCESS** including private keys. Only use on:
- Private networks (Tailscale VPN)
- Trusted devices
- Secure connections

Do NOT expose port 8002 to the public internet.
