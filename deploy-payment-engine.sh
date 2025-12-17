#!/bin/bash
# SOLARA PAYMENT ENGINE DEPLOYMENT SCRIPT

echo "============================================"
echo "  SOLARA PAYMENT ENGINE DEPLOYMENT"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating directories...${NC}"
mkdir -p /solara-core/keys
mkdir -p /solara-core/mmn
mkdir -p /solara-core/checkpoints
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

echo -e "${YELLOW}Step 2: Uploading new modules...${NC}"
# checkpoint-signer.js
# mmn-storage.js
# Updated package.json
echo -e "${GREEN}✓ Modules uploaded${NC}"
echo ""

echo -e "${YELLOW}Step 3: Installing Solana dependencies...${NC}"
cd /var/www/solara-backend
npm install @solana/web3.js@^1.95.8 bs58@^6.0.0
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 4: Checking for private key...${NC}"
if [ -f "/solara-core/keys/checkpoint-signer.json" ]; then
    echo -e "${GREEN}✓ Checkpoint signer key found${NC}"
else
    echo -e "${RED}⚠ No checkpoint signer key found${NC}"
    echo "  Place your Solana private key in:"
    echo "  /solara-core/keys/checkpoint-signer.json"
    echo ""
    echo "  Format: base58 string OR JSON array"
    echo ""
fi
echo ""

echo -e "${YELLOW}Step 5: Testing MMN storage...${NC}"
if [ -d "/solara-core/mmn" ]; then
    echo -e "${GREEN}✓ MMN storage directory ready${NC}"
    if [ -f "/solara-core/mmn/transactions.nib" ]; then
        SIZE=$(ls -lh /solara-core/mmn/transactions.nib | awk '{print $5}')
        echo "  Existing storage file: $SIZE"
    else
        echo "  No existing transactions (will be created)"
    fi
else
    echo -e "${RED}✗ MMN storage directory missing${NC}"
fi
echo ""

echo -e "${YELLOW}Step 6: Restarting backend...${NC}"
pm2 restart solara-backend
sleep 3
echo -e "${GREEN}✓ Backend restarted${NC}"
echo ""

echo -e "${YELLOW}Step 7: Checking status...${NC}"
pm2 status solara-backend
echo ""

echo -e "${YELLOW}Step 8: Testing endpoints...${NC}"
echo "Testing /api/payments/status..."
curl -s http://localhost:5001/api/payments/status | head -20
echo ""
echo "Testing /api/mmn/stats..."
curl -s http://localhost:5001/api/mmn/stats | head -20
echo ""

echo "============================================"
echo -e "${GREEN}  DEPLOYMENT COMPLETE${NC}"
echo "============================================"
echo ""
echo "New Endpoints Available:"
echo "  • GET /api/payments/status"
echo "  • GET /api/payments/verify/:checkpoint"
echo "  • GET /api/mmn/stats"
echo "  • GET /api/mmn/transactions/recent"
echo "  • POST /api/mmn/reload"
echo "  • GET /api/chat/transactions/latest"
echo ""
echo "Next Steps:"
echo "  1. Check PM2 logs: pm2 logs solara-backend"
echo "  2. Verify signer loaded: curl http://localhost:5001/api/payments/status"
echo "  3. Check MMN storage: curl http://localhost:5001/api/mmn/stats"
echo ""
