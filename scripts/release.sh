#!/usr/bin/env bash
set -euo pipefail

BUMP="${1:-patch}"

if [[ "$BUMP" != "major" && "$BUMP" != "minor" && "$BUMP" != "patch" ]]; then
  echo "Usage: $0 [major|minor|patch]  (default: patch)"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree has uncommitted changes. Commit or stash them first."
  exit 1
fi

LATEST=$(git tag -l 'v*' --sort=-v:refname | head -n1)
if [ -z "$LATEST" ]; then
  LATEST="v0.0.0"
fi

MAJOR=$(echo "$LATEST" | sed 's/^v//' | cut -d. -f1)
MINOR=$(echo "$LATEST" | sed 's/^v//' | cut -d. -f2)
PATCH_NUM=$(echo "$LATEST" | sed 's/^v//' | cut -d. -f3)

case "$BUMP" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH_NUM=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH_NUM=0
    ;;
  patch)
    PATCH_NUM=$((PATCH_NUM + 1))
    ;;
esac

VERSION="v${MAJOR}.${MINOR}.${PATCH_NUM}"

echo "$LATEST -> $VERSION ($BUMP)"
read -rp "Create and push tag $VERSION? [y/N] " CONFIRM
if [[ "$CONFIRM" != [yY] ]]; then
  echo "Aborted."
  exit 0
fi

git tag -a "$VERSION" -m "Release $VERSION"
git push origin "$VERSION"

REMOTE_URL=$(git remote get-url origin | sed 's/\.git$//' | sed 's|git@github.com:|https://github.com/|')
echo ""
echo "Tag $VERSION pushed."
echo "Create a GitHub Release: ${REMOTE_URL}/releases/new?tag=${VERSION}"
