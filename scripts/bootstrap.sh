#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Installing server dependencies"
npm install --prefix "$ROOT_DIR/server"

echo "==> Installing panel UI dependencies"
npm install --prefix "$ROOT_DIR/panel-ui"

echo "==> Building panel UI CSS"
npm run --prefix "$ROOT_DIR/panel-ui" build:css

echo "==> Building Go helper"
if [[ "$(uname -s)" == "MINGW"* || "$(uname -s)" == "MSYS"* || "$(uname -s)" == "CYGWIN"* ]]; then
  (cd "$ROOT_DIR/helper" && go build -o shortcut-helper.exe main.go)
else
  (cd "$ROOT_DIR/helper" && go build -o shortcut-helper main.go)
fi

echo
echo "Setup complete."
echo "Next steps:"
echo "  1. cd \"$ROOT_DIR/server\""
echo "  2. node server.js"
echo "  3. Open http://localhost:3000/setup.html"
