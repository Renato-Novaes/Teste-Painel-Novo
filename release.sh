#!/usr/bin/env bash
# ─────────────────────────────────────────────────────
# release.sh — Cria uma nova release do PalletControl
# Uso: ./release.sh patch|minor|major
# ─────────────────────────────────────────────────────
set -euo pipefail

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Uso: ./release.sh [patch|minor|major]"
  exit 1
fi

# 1. Bump root package.json version
NEW_VERSION=$(npm version "$BUMP" --no-git-tag-version | tr -d 'v')
echo "📦 Nova versão: $NEW_VERSION"

# 2. Sync versionCode + versionName in Android build.gradle
GRADLE="frontend/android/app/build.gradle"
if [ -f "$GRADLE" ]; then
  # Increment versionCode
  OLD_CODE=$(grep -oP 'versionCode \K[0-9]+' "$GRADLE")
  NEW_CODE=$((OLD_CODE + 1))
  sed -i "s/versionCode $OLD_CODE/versionCode $NEW_CODE/" "$GRADLE"
  sed -i "s/versionName \"[^\"]*\"/versionName \"$NEW_VERSION\"/" "$GRADLE"
  echo "🤖 Android: versionCode=$NEW_CODE versionName=$NEW_VERSION"
fi

# 3. Build frontend
echo "🔨 Build frontend..."
cd frontend && npm run build && cd ..

# 4. Commit, tag, push
git add -A
git commit -m "release: v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo ""
echo "✅ Release v$NEW_VERSION criada!"
echo "   O GitHub Actions vai gerar automaticamente:"
echo "   • PalletControl Setup $NEW_VERSION.exe (Windows)"
echo "   • PalletControl-$NEW_VERSION.apk (Android)"
echo ""
echo "   Acompanhe em: https://github.com/Renato-Novaes/Teste-Painel-Novo/actions"
