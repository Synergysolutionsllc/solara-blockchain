# Solara Blockchain Node

High-performance blockchain node with P2P gossip networking, built on advanced compression and failsafe technology.

## Features

- **300,000+ TPS** theoretical throughput
- **P2P Gossip Network** with Tailscale VPN security
- **MMN Compression** - 92-95% storage reduction (40 bytes/TX)
- **Transaction Failsafe** - 99.9% success rate guarantee
- **Zero Transaction Fees** with VPS wallet
- **150 Validators** across 3 layers (Whisper, Echo, Resonance)

## Quick Start

### Prerequisites

- Ubuntu/Debian VPS
- Node.js 18+
- PM2 (`npm install -g pm2`)
- Tailscale account

### Installation

```bash
# 1. Clone the repository
cd /var/www
git clone https://github.com/YOUR_USERNAME/solara-blockchain.git solara-backend
cd solara-backend

# 2. Install dependencies
npm install

# 3. Install Tailscale (for secure P2P networking)
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Get your Tailscale IP
tailscale ip -4
# Example output: 100.x.x.x

# 4. Configure your node
cp .env.example .env
nano .env

# Update these values in .env:
# NODE_ID=YOUR-UNIQUE-ID
# NODE_IP=YOUR_TAILSCALE_IP (from step 3)
# NODE_NAME=YOUR-NODE-NAME
# BOOTSTRAP_PEERS=<existing_node_ips>

# 5. Create required directories
mkdir -p /solara-core/checkpoints
mkdir -p /solara-core/state
mkdir -p /solara-core/payments

# 6. Start the node
pm2 start server-ultimate.js --name solara-node

# 7. Check status
pm2 logs solara-node --lines 50
curl http://localhost:5001/api/health
curl http://localhost:5001/api/gossip/peers
```

## Joining the Network

To join the existing Solara network:

1. **Install Tailscale** and authenticate
2. **Get bootstrap peer IPs** from existing node operators
3. **Update .env** with your Tailscale IP and bootstrap peers
4. **Start your node** - it will automatically connect to the network

## API Endpoints

- `GET /api/health` - Node health and statistics
- `GET /api/validators` - All validators across 3 layers
- `GET /api/transactions` - Recent transactions
- `GET /api/gossip/peers` - Connected peers
- `GET /api/coordinators` - Coordinator status
- `POST /api/transaction` - Submit new transaction
- `POST /api/stress-test` - Performance testing

## P2P Gossip Network

The node uses WebSocket-based gossip protocol for real-time synchronization:

- **Port:** 8001 (over Tailscale VPN)
- **Latency:** <50ms between peers
- **Auto-reconnect:** 10-second retry on disconnect
- **Security:** Genesis hash verification

## Architecture

### 3-Layer Validator System
- **Whisper Layer:** 50 validators, 150K target TPS
- **Echo Layer:** 50 validators, 180K target TPS
- **Resonance Layer:** 50 validators, 120K target TPS

### Core Modules
- **MMN (MyMothersNibble):** Binary transaction compression
- **SLR-01 Format:** Structured transaction hashing
- **Transaction Failsafe:** Echo buffer with 99.9% success rate
- **VPS Wallet:** Zero-fee transaction signing

## Monitoring

```bash
# View logs
pm2 logs solara-node

# Check peers
curl http://localhost:5001/api/gossip/peers

# System metrics
curl http://localhost:5001/api/chatbot/metrics/live

# Network health
curl http://localhost:5001/api/health
```

## Troubleshooting

### Port 8001 not listening
```bash
# Check if gossip server started
pm2 logs solara-node | grep "Gossip server"

# Verify .env is loaded
cat /var/www/solara-backend/.env
```

### No peers connecting
```bash
# Check Tailscale is running
tailscale status

# Test connection to bootstrap peer
nc -zv <BOOTSTRAP_IP> 8001

# Check firewall (should be open for Tailscale)
tailscale ping <BOOTSTRAP_IP>
```

### Disk space issues
```bash
# PM2 logs can grow large - clear them
pm2 flush

# Or configure log rotation
pm2 install pm2-logrotate
```

## Contributing

Join our network by running a node! The more nodes, the more decentralized and resilient the network becomes.

## License

MIT

## Support

- Gossip Network: Fully operational with Tailscale VPN
- Bootstrap Peers: Auto-connect on startup
- Persistent: Survives restarts with auto-reconnect
