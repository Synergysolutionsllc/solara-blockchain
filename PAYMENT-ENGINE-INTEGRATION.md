# SOLARA PAYMENT ENGINE - INTEGRATION GUIDE

## 🚀 Quick Start

This guide shows you how to integrate the payment engine into your running Solara backend.

---

## 📦 Files Created

1. **checkpoint-signer.js** - Solana keypair manager and payment sender
2. **mmn-storage.js** - Persistent MMN (.nib) storage manager
3. **server-payment-patch.js** - Code additions for server-ultimate.js
4. **deploy-payment-engine.sh** - Automated deployment script
5. **package.json** - Updated with @solana/web3.js and bs58

---

## 🔐 Step 1: Secure Your Private Key on VPS

Your private key is in: `C:\Users\mcdan\solaracheckpoint.txt`

**Upload it securely to VPS:**

```bash
# SSH into VPS
ssh root@80.78.27.27 -i ~/.ssh/solara_vps1_new

# Create keys directory
mkdir -p /solara-core/keys

# Create the key file (use nano or vim)
nano /solara-core/keys/checkpoint-signer.json
```

**Paste your private key** in one of these formats:

**Option A - Base58 string:**
```
5JvR7Ym8Jq...your-base58-key...9Kp2X
```

**Option B - JSON array:**
```json
[123,45,67,89,...]
```

Save and exit (Ctrl+X, Y, Enter in nano).

**Set secure permissions:**
```bash
chmod 600 /solara-core/keys/checkpoint-signer.json
chown root:root /solara-core/keys/checkpoint-signer.json
```

---

## 📤 Step 2: Upload New Modules

From your local machine:

```bash
cd C:\Users\mcdan\solara-blockchain-repo

# Upload checkpoint signer
scp -i ~/.ssh/solara_vps1_new checkpoint-signer.js root@80.78.27.27:/var/www/solara-backend/

# Upload MMN storage manager
scp -i ~/.ssh/solara_vps1_new mmn-storage.js root@80.78.27.27:/var/www/solara-backend/

# Upload updated package.json
scp -i ~/.ssh/solara_vps1_new package.json root@80.78.27.27:/var/www/solara-backend/

# Upload deployment script
scp -i ~/.ssh/solara_vps1_new deploy-payment-engine.sh root@80.78.27.27:/var/www/solara-backend/
```

---

## 🔧 Step 3: Install Solana Dependencies

```bash
ssh root@80.78.27.27 -i ~/.ssh/solara_vps1_new
cd /var/www/solara-backend
npm install @solana/web3.js@^1.95.8 bs58@^6.0.0
```

---

## ✏️ Step 4: Integrate Payment Engine into Server

Open `server-ultimate.js` on the VPS and make these changes:

### **A. Add Imports (at the top with other imports)**

```javascript
import { checkpointSigner } from './checkpoint-signer.js'
import { mmnStorage } from './mmn-storage.js'
```

### **B. Initialize After peerManager (around line 300)**

```javascript
// Initialize checkpoint signer
await checkpointSigner.loadKeypair()

// Initialize MMN persistent storage
await mmnStorage.initialize()
```

### **C. Replace createCheckpoint() Function**

Find the existing `createCheckpoint()` function and replace it with:

```javascript
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
```

### **D. Add MMN Storage After Transaction Creation**

Find where transactions are created (search for `enhancedTx`) and add:

```javascript
// Store in MMN persistent storage
await mmnStorage.storeTransaction(enhancedTx)
```

This should go right after the transaction is added to the `transactions` array.

### **E. Add New API Endpoints**

Copy ALL the endpoint code from `server-payment-patch.js` and paste it **BEFORE** `app.listen()`.

This includes:
- `/api/payments/status`
- `/api/payments/verify/:checkpoint`
- `/api/mmn/stats`
- `/api/mmn/transactions/recent`
- `/api/mmn/reload`
- `/api/chat/transactions/latest`
- `/api/chatbot/transactions/realtime`

---

## 🚀 Step 5: Deploy and Test

```bash
# Make deployment script executable
chmod +x deploy-payment-engine.sh

# Run deployment
./deploy-payment-engine.sh
```

Or manually:

```bash
# Restart backend
pm2 restart solara-backend

# Wait a few seconds
sleep 3

# Check logs
pm2 logs solara-backend --lines 50
```

**Look for these success messages:**
```
✅ CHECKPOINT SIGNER ACTIVATED
📍 Address: <your-solana-address>
💰 Balance: X.XXXX SOL
✅ MMN Persistent Storage ENABLED
   Storage: /solara-core/mmn/transactions.nib
   Loaded: 0 transactions
```

---

## ✅ Step 6: Verify Everything Works

### Test Payment Status:
```bash
curl http://localhost:5001/api/payments/status | python3 -m json.tool
```

Expected output:
```json
{
  "signerLoaded": true,
  "signerAddress": "YourSolanaAddress...",
  "paymentCount": 0,
  "lastPayment": null,
  "balance": 0.1234,
  "balanceSOL": "0.123400"
}
```

### Test MMN Storage:
```bash
curl http://localhost:5001/api/mmn/stats | python3 -m json.tool
```

Expected output:
```json
{
  "storage": {
    "enabled": true,
    "storagePath": "/solara-core/mmn/transactions.nib",
    "totalTransactions": 0
  }
}
```

### Test Transaction Visibility:
```bash
curl http://localhost:5001/api/chat/transactions/latest
```

Should show both MMN and in-memory transactions.

---

## 🎯 How It Works

### Checkpoint Payments:
1. Every 23,100 transactions, `createCheckpoint()` is triggered
2. Checkpoint data saved to `/solara-core/checkpoints/`
3. Payment automatically sent to Solana blockchain
4. Payment includes memo: `"CHECKPOINT {N} — SLR-01 BLOCK {X} — TX {Y} VERIFIED"`
5. Transaction signature logged and stored in payment history

### MMN Persistence:
1. Every transaction is stored as 40-byte nibble format
2. Appended to `/solara-core/mmn/transactions.nib`
3. Loaded into memory on startup
4. Accessible via API endpoints
5. 92% storage reduction vs JSON

### Transaction Visibility:
- All wallet transactions → stored
- All stress test transactions → stored
- All internal transactions → stored
- Visible in:
  - `/api/chat/transactions/latest`
  - `/api/chatbot/transactions/realtime`
  - `/api/mmn/transactions/recent`

---

## 🔍 Monitoring

### Watch for checkpoint payments:
```bash
pm2 logs solara-backend | grep "PAYMENT"
```

### Check MMN storage growth:
```bash
watch -n 5 'ls -lh /solara-core/mmn/transactions.nib'
```

### Monitor balance:
```bash
watch -n 10 'curl -s http://localhost:5001/api/payments/status | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"Balance: {d[\\\"balanceSOL\\\"]} SOL\")"'
```

---

## 🐛 Troubleshooting

### Signer not loading?
```bash
# Check key file exists
ls -la /solara-core/keys/checkpoint-signer.json

# Check permissions
chmod 600 /solara-core/keys/checkpoint-signer.json

# Check logs
pm2 logs solara-backend | grep "signer"
```

### MMN storage not working?
```bash
# Check directory exists
ls -la /solara-core/mmn/

# Check permissions
chmod 755 /solara-core/mmn

# Manually reload
curl -X POST http://localhost:5001/api/mmn/reload
```

### Payments failing?
```bash
# Check balance
curl http://localhost:5001/api/payments/status

# Check Solana RPC
echo $SOLANA_RPC

# Try custom RPC
export SOLANA_RPC=https://api.mainnet-beta.solana.com
pm2 restart solara-backend
```

---

## ✅ Success Checklist

- [ ] Private key uploaded to `/solara-core/keys/checkpoint-signer.json`
- [ ] Permissions set to 600
- [ ] Solana dependencies installed
- [ ] Server code updated with imports
- [ ] Initialization code added
- [ ] `createCheckpoint()` function replaced
- [ ] MMN storage integration added
- [ ] API endpoints added
- [ ] Backend restarted with PM2
- [ ] Signer loaded message in logs
- [ ] MMN storage enabled message in logs
- [ ] `/api/payments/status` returns signer address
- [ ] `/api/mmn/stats` shows storage enabled
- [ ] Transactions visible in `/api/chat/transactions/latest`

---

## 🎉 You're Done!

The payment engine is now active. When the next checkpoint is created:
1. You'll see `📸 Checkpoint N` in logs
2. Followed by `[PAYMENT] Checkpoint Payment Sent — TX: <signature>`
3. Payment will be visible on Solana blockchain
4. All transactions persist in `/solara-core/mmn/transactions.nib`

**System Integrity Preserved:**
- Gossip network: ✅ Unchanged
- Coordinator routing: ✅ Unchanged
- Failsafe logic: ✅ Unchanged
- VPS wallet: ✅ Unchanged
- SLR-01 format: ✅ Unchanged
- 23,100 checkpoint rules: ✅ Unchanged

**New Features Active:**
- ✅ MMN persistence enabled
- ✅ Checkpoint auto-payments live
- ✅ Signer wallet installed
- ✅ Payment verification available
- ✅ Transaction visibility enhanced
