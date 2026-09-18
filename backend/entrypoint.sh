#!/bin/sh
set -e

# Ensure outputs directories exist and have open read/write permissions
mkdir -p /app/outputs/images /app/outputs/videos /app/outputs/audio /app/outputs/final /app/outputs/trash
chmod -R 777 /app/outputs 2>/dev/null || true

exec "$@"
