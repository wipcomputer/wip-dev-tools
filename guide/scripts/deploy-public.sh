#!/usr/bin/env bash
#
# deploy-public.sh ... sync a private repo to its public counterpart
#
# Usage:
#   bash deploy-public.sh <private-repo-path> <public-github-repo>
#
# Example:
#   bash deploy-public.sh /path/to/memory-crystal wipcomputer/memory-crystal
#
# Convention:
#   - Private repo: {name}-private (where all work happens)
#   - Public repo:  {name} (deployment target, never work here directly)
#   - ai/ folder is excluded from public deploys
#   - Old ai/ in public git history is fine, just not going forward
#
# Location: wip-dev-guide-private/scripts/deploy-public.sh (one script for all repos)

set -euo pipefail

PRIVATE_REPO="$1"
PUBLIC_REPO="$2"

if [[ -z "$PRIVATE_REPO" || -z "$PUBLIC_REPO" ]]; then
  echo "Usage: bash deploy-public.sh <private-repo-path> <public-github-repo>"
  echo "Example: bash deploy-public.sh /path/to/memory-crystal wipcomputer/memory-crystal"
  exit 1
fi

if [[ ! -d "$PRIVATE_REPO/.git" ]]; then
  echo "Error: $PRIVATE_REPO is not a git repository"
  exit 1
fi

# Get the latest commit message from private repo
COMMIT_MSG=$(cd "$PRIVATE_REPO" && git log -1 --pretty=format:"%s")
COMMIT_HASH=$(cd "$PRIVATE_REPO" && git log -1 --pretty=format:"%h")

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Cloning public repo $PUBLIC_REPO..."
gh repo clone "$PUBLIC_REPO" "$TMPDIR/public" -- --depth 1 2>/dev/null || {
  echo "Public repo is empty or doesn't exist. Initializing..."
  mkdir -p "$TMPDIR/public"
  cd "$TMPDIR/public"
  git init
  git remote add origin "git@github.com:${PUBLIC_REPO}.git"
  cd - > /dev/null
}

echo "Syncing files from private repo (excluding ai/, .git/)..."

# Remove all tracked files in public (except .git) so deleted files get removed
find "$TMPDIR/public" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

# rsync from private, excluding ai/ and .git/
rsync -a \
  --exclude='ai/' \
  --exclude='.git/' \
  --exclude='.DS_Store' \
  "$PRIVATE_REPO/" "$TMPDIR/public/"

cd "$TMPDIR/public"

# Check if there are changes
if git diff --quiet HEAD -- 2>/dev/null && git diff --cached --quiet HEAD -- 2>/dev/null && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  echo "No changes to deploy."
  exit 0
fi

BRANCH="mini/deploy-$(date +%Y%m%d-%H%M%S)"

git checkout -b "$BRANCH"
git add -A
git commit -m "$COMMIT_MSG (from $COMMIT_HASH)"

echo "Pushing branch $BRANCH to $PUBLIC_REPO..."
git push -u origin "$BRANCH"

echo "Creating PR..."
PR_URL=$(gh pr create -R "$PUBLIC_REPO" \
  --head "$BRANCH" \
  --title "$COMMIT_MSG" \
  --body "Synced from private repo (commit $COMMIT_HASH).")

echo "Merging PR..."
PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')
gh pr merge "$PR_NUMBER" -R "$PUBLIC_REPO" --squash

echo "Done. Public repo updated via PR."
echo "  PR: $PR_URL"
echo "  Commit: $COMMIT_MSG (from $COMMIT_HASH)"
