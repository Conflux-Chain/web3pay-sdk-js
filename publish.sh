#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

TAG="latest"
ACCESS="public"
OTP=""
ALLOW_DIRTY=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --access)
      ACCESS="${2:-}"
      shift 2
      ;;
    --otp)
      OTP="${2:-}"
      shift 2
      ;;
    --allow-dirty)
      ALLOW_DIRTY=1
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./publish.sh [options]

Options:
  --tag <tag>          npm dist-tag to publish with (default: latest)
  --access <access>    npm access level (default: public)
  --otp <code>         npm 2FA one-time password
  --allow-dirty        allow publishing with uncommitted changes
  -h, --help           show this help
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [ "$ALLOW_DIRTY" -ne 1 ] && [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash changes first, or use --allow-dirty." >&2
  exit 1
fi

PKG_NAME="$(node -p "require('./package.json').name")"
PKG_VERSION="$(node -p "require('./package.json').version")"

echo "Publishing ${PKG_NAME}@${PKG_VERSION}"
echo "Running build..."
npm run build

echo "Running package preview..."
npm run pubpreview

PUBLISH_CMD=(npm publish --access "$ACCESS" --tag "$TAG")
if [ -n "$OTP" ]; then
  PUBLISH_CMD+=(--otp "$OTP")
fi

echo "Publishing to npm (tag=$TAG, access=$ACCESS)..."
"${PUBLISH_CMD[@]}"

echo "Publish complete: ${PKG_NAME}@${PKG_VERSION}"
