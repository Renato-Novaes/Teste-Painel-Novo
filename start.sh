#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==================================="
echo "  PalletControl - Sistema de Pallets"
echo "==================================="

# Kill any existing processes on these ports
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

echo ""
echo "▶ Iniciando Backend (porta 3001)..."
cd "$SCRIPT_DIR/backend"
NO_DEPRECATION=1 node --no-warnings src/app.js &
BACKEND_PID=$!

sleep 2
echo "▶ Iniciando Frontend (porta 5173)..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Sistema iniciado!"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "   Acesse: http://localhost:5173"
echo "   Login:  admin / admin123"
echo ""
echo "Pressione Ctrl+C para encerrar..."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
