#!/usr/bin/env bash
# Converte as imagens guardadas como texto (assets/*.b64) nos arquivos PNG do app.
set -euo pipefail
mkdir -p public/img public/icons
base64 -d assets/logo.png.b64 > public/img/logo.png
base64 -d assets/icon-512.png.b64 > public/icons/icon-512.png
echo "Imagens prontas."
