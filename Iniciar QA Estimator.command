#!/bin/bash
cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo ""
  echo "[ERRO] Node.js/npm não encontrado neste computador."
  echo "Instale o Node.js em https://nodejs.org antes de continuar."
  echo ""
  read -p "Pressione Enter para sair..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Primeira execução: instalando dependências, isso pode levar alguns minutos..."
  npm install
  if [ $? -ne 0 ]; then
    echo ""
    echo "[ERRO] Falha ao instalar dependências. Verifique sua conexão com a internet."
    echo ""
    read -p "Pressione Enter para sair..."
    exit 1
  fi
fi

echo "Iniciando QA Estimator..."
npm start

if [ $? -ne 0 ]; then
  echo ""
  echo "[ERRO] O aplicativo fechou com erro. Veja as mensagens acima."
  read -p "Pressione Enter para sair..."
fi
