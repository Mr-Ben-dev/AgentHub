#!/bin/bash

# ============================================================================
# Linera Contract Build Script
# ============================================================================

set -e

echo "🔨 Building AgentHub Linera Contract..."

cd contracts/agent_hub

# Build for WASM target
cargo build --release --target wasm32-unknown-unknown

echo "✅ Contract built successfully!"
echo ""
echo "📦 Output files:"
echo "   - target/wasm32-unknown-unknown/release/agent_hub_contract.wasm"
echo "   - target/wasm32-unknown-unknown/release/agent_hub_service.wasm"
echo ""
echo "🚀 Deploy with:"
echo '   linera publish-and-create \'
echo '     target/wasm32-unknown-unknown/release/agent_hub_contract.wasm \'
echo '     target/wasm32-unknown-unknown/release/agent_hub_service.wasm \'
echo '     --json-argument '"'"'{"hub_chain_id": "<HUB_CHAIN_ID>"}'"'"
