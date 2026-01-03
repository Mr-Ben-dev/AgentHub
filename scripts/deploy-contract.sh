#!/bin/bash

# ============================================================================
# Deploy Linera Contract to Conway Testnet
# ============================================================================

set -e

# Check if chain ID is provided
if [ -z "$1" ]; then
  echo "Usage: ./scripts/deploy-contract.sh <HUB_CHAIN_ID>"
  echo ""
  echo "Get your chain ID from: linera wallet show"
  exit 1
fi

HUB_CHAIN_ID=$1

echo "🚀 Deploying AgentHub Contract to Conway Testnet..."
echo "   Hub Chain ID: $HUB_CHAIN_ID"

# Build first
./scripts/build-contract.sh

# Deploy
linera publish-and-create \
  target/wasm32-unknown-unknown/release/agent_hub_contract.wasm \
  target/wasm32-unknown-unknown/release/agent_hub_service.wasm \
  --json-argument "{\"hub_chain_id\": \"$HUB_CHAIN_ID\"}"

echo ""
echo "✅ Contract deployed!"
echo ""
echo "📋 Next steps:"
echo "   1. Copy the Application ID from the output above"
echo "   2. Add it to your frontend/.env as VITE_LINERA_APP_ID"
echo "   3. Add your chain ID as VITE_LINERA_CHAIN_ID"
