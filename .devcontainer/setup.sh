#!/usr/bin/env bash
set -euo pipefail
python -m pip install --upgrade pip
python -m pip install -r platform-prototype/backend/requirements.txt
npm --prefix platform-prototype/frontend install
