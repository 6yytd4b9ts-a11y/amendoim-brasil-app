#!/usr/bin/env bash
# Converte as imagens guardadas como texto (assets/*.b64) nos arquivos PNG do app.
set -euo pipefail
mkdir -p public/img public/icons
base64 -d assets/logo.png.b64 > public/img/logo.png
base64 -d assets/colombo.png.b64 > public/img/colombo.png
base64 -d assets/og.png.b64 > public/img/og.png   # imagem da prévia do link (WhatsApp, redes)
# Ícones: icon-512 com fundo transparente; icon-maskable-512 com fundo verde cheio (Android recorta em círculo, iPhone arredonda os cantos)
for n in icon-512 icon-maskable-512; do
  base64 -d "assets/$n.png.b64" > "public/icons/$n.png"
done
echo "Imagens prontas."
