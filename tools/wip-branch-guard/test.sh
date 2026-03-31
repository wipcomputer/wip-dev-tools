#!/bin/bash
# Guard test runner. Run from the guard directory before merging.
# Usage: bash test.sh
#
# Pipes test JSON into guard.mjs and checks if it allows or blocks.
# Exit 0 = all tests pass. Exit 1 = at least one failed.
#
# Note: compound command tests (Bug 2) and on-main tests need CWD
# to be in a repo on main. The script auto-detects and skips those
# tests if running from a branch/worktree.

GUARD="$(dirname "$0")/guard.mjs"
PASS=0
FAIL=0
SKIP=0

# Check if we're on main (for tests that need main-branch context)
ON_MAIN=false
BRANCH=$(git branch --show-current 2>/dev/null)
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  ON_MAIN=true
fi

# Helper: build properly escaped JSON using node (avoids bash quote hell)
make_json() {
  local tool="$1" key="$2" value="$3"
  node -e "process.stdout.write(JSON.stringify({tool_name:'$tool',tool_input:{$key:process.argv[1]}}))" "$value"
}

# Helper: run a test case
# Args: description, expected (allow|deny), tool_name, command_or_filepath, [main_only]
test_case() {
  local desc="$1" expected="$2" tool="$3" input="$4" main_only="${5:-false}"

  if [[ "$main_only" == "true" && "$ON_MAIN" == "false" ]]; then
    echo "  SKIP: $desc (needs main branch)"
    ((SKIP++))
    return
  fi

  local json
  if [[ "$tool" == "Bash" ]]; then
    json=$(make_json Bash command "$input")
  elif [[ "$tool" == "Write" || "$tool" == "Edit" ]]; then
    json=$(make_json "$tool" file_path "$input")
  fi

  local output
  output=$(echo "$json" | node "$GUARD" 2>/dev/null)

  local actual="allow"
  if echo "$output" | grep -q '"deny"' 2>/dev/null; then
    actual="deny"
  fi

  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS: $desc"
    ((PASS++))
  else
    echo "  FAIL: $desc (expected $expected, got $actual)"
    ((FAIL++))
  fi
}

echo "=== Branch Guard Tests ==="
echo ""
echo "--- Destructive commands (should DENY on any branch) ---"
test_case "git clean -fd" deny Bash "git clean -fd"
test_case "git checkout -- file.txt" deny Bash "git checkout -- file.txt"
test_case "git checkout ." deny Bash "git checkout ."
test_case "git stash drop" deny Bash "git stash drop"
test_case "git stash pop" deny Bash "git stash pop"
test_case "git stash clear" deny Bash "git stash clear"
test_case "git reset --hard" deny Bash "git reset --hard"
test_case "git restore file.txt" deny Bash "git restore file.txt"
test_case "python file write bypass" deny Bash "python3 -c \"open('f','w').write('x')\""
test_case "node file write bypass" deny Bash "node -e \"require('fs').writeFileSync('f','d')\""

echo ""
echo "--- Quoted strings: should NOT match inside quotes (Bug 1, 3) ---"
test_case "gh issue with git checkout in body" allow Bash "gh issue create --body 'use git checkout -- to fix'"
test_case "echo with git commit in quotes" allow Bash "echo 'dont run git commit on main'"
test_case "gh issue with git reset in body" allow Bash "gh issue create --body 'tried git reset --hard'"

echo ""
echo "--- Compound commands: each segment checked independently (Bug 2) ---"
echo "  (These only run when CWD is on main branch)"
test_case "rm with echo should still block" deny Bash "rm -f file ; echo done" true
test_case "safe compound (ls && echo)" allow Bash "ls -la && echo done" true
test_case "cd then rm should block" deny Bash "cd /tmp && rm -rf somedir" true

echo ""
echo "--- Safe commands (should ALLOW) ---"
test_case "git status" allow Bash "git status"
test_case "git log" allow Bash "git log --oneline -5"
test_case "git diff" allow Bash "git diff"
test_case "git checkout branch" allow Bash "git checkout feature-branch"
test_case "git worktree add" allow Bash "git worktree add .worktrees/repo--branch -b feat"
test_case "git stash list" allow Bash "git stash list"
test_case "git stash show" allow Bash "git stash show"
test_case "git restore --staged" allow Bash "git restore --staged file.txt"
test_case "ls command" allow Bash "ls -la"
test_case "grep command" allow Bash "grep -r pattern ."
test_case "gh pr create" allow Bash "gh pr create --title test"
test_case "gh pr merge" allow Bash "gh pr merge 123 --merge"
test_case "echo" allow Bash "echo hello"
test_case "wip-release dry-run" allow Bash "wip-release patch --dry-run"
test_case "ldm install" allow Bash "ldm install"
test_case "mkdir .worktrees" allow Bash "mkdir -p .worktrees/repo--branch"

echo ""
echo "--- Plan files (should ALLOW Write/Edit) ---"
test_case "Edit plan file" allow Edit "$HOME/.claude/plans/my-plan.md"

echo ""
echo "=== Results: $PASS passed, $FAIL failed, $SKIP skipped ==="
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
