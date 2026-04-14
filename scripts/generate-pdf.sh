#!/bin/bash
# Script para gerar PDF a partir de um JSON
# Uso: ./scripts/generate-pdf.sh [arquivo.json] [saida.pdf]
#
# Requer que o servidor Next.js esteja rodando (npm run dev ou npm start)

INPUT_FILE="${1:-scripts/sample-resume.json}"
OUTPUT_FILE="${2:-output-resume.pdf}"
API_URL="${API_URL:-http://localhost:3000/api/generate-pdf}"

if [ ! -f "$INPUT_FILE" ]; then
  echo "Erro: Arquivo '$INPUT_FILE' nao encontrado"
  exit 1
fi

echo "Gerando PDF a partir de: $INPUT_FILE"
echo "Enviando para: $API_URL"

HTTP_CODE=$(curl -s -o "$OUTPUT_FILE" -w "%{http_code}" \
  -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d @"$INPUT_FILE")

if [ "$HTTP_CODE" -eq 200 ]; then
  SIZE=$(wc -c < "$OUTPUT_FILE")
  echo "PDF gerado com sucesso: $OUTPUT_FILE ($SIZE bytes)"
else
  echo "Erro HTTP $HTTP_CODE ao gerar PDF:"
  cat "$OUTPUT_FILE"
  rm -f "$OUTPUT_FILE"
  exit 1
fi
