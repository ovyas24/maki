#!/usr/bin/env bash
# Publish Maki to the AUR.
#
# Prerequisites (one-time):
#   - AUR account with your SSH public key added (https://aur.archlinux.org,
#     My Account -> SSH Public Key).
#   - The GitHub release for this version must already exist, because the
#     PKGBUILD's source= points at the release tarball and updpkgsums downloads
#     it to compute the checksum. Cut the release first (git tag vX.Y.Z).
#   - Tools: base-devel, git, and ideally namcap (pacman -S namcap).
#
# Usage:
#   packaging/aur/publish.sh 0.1.0
#
# What it does: clones the AUR repo, copies this PKGBUILD in, fills the real
# sha256, regenerates .SRCINFO, test-builds locally, then commits and pushes.
set -euo pipefail

VERSION="${1:?usage: publish.sh <version>, e.g. publish.sh 0.1.0}"
PKG=maki
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d)"

echo ">> Cloning AUR repo (ssh://aur@aur.archlinux.org/$PKG.git)"
git clone "ssh://aur@aur.archlinux.org/$PKG.git" "$WORK/$PKG"
cd "$WORK/$PKG"

echo ">> Staging PKGBUILD at pkgver=$VERSION"
sed "s/^pkgver=.*/pkgver=$VERSION/" "$HERE/PKGBUILD" > PKGBUILD

echo ">> Computing checksums from the GitHub release tarball"
updpkgsums

echo ">> Regenerating .SRCINFO"
makepkg --printsrcinfo > .SRCINFO

echo ">> Test build + install"
makepkg -si --noconfirm
if command -v namcap >/dev/null; then
  namcap PKGBUILD "$PKG-$VERSION"-*.pkg.tar.zst || true
else
  echo "   (namcap not installed — skipping lint; pacman -S namcap to enable)"
fi

echo ">> Committing and pushing to the AUR"
git add PKGBUILD .SRCINFO
git commit -m "v$VERSION"
git push

echo ">> Done. Check https://aur.archlinux.org/packages/$PKG"
echo "   Local clone kept at: $WORK/$PKG"
