#!/bin/bash

# Git Push Script - Automates staging, committing, and pushing changes
# Usage: ./push-changes.sh [commit-message]
# If no message provided, a default message will be used

set -e  # Exit on error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Git Push Script${NC}\n"

# Show current git status
echo -e "${YELLOW}Current Git Status:${NC}"
git status

# Check if there are any changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}ℹ️  No changes to commit.${NC}"
  exit 0
fi

echo ""

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}Branch: ${CURRENT_BRANCH}${NC}"

# Prepare commit message
if [ -n "$1" ]; then
  COMMIT_MESSAGE="$1"
else
  COMMIT_MESSAGE="Update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo -e "${BLUE}Commit Message: ${COMMIT_MESSAGE}${NC}\n"

# Stage all changes
echo -e "${YELLOW}📝 Staging changes...${NC}"
git add -A
echo -e "${GREEN}✓ Changes staged${NC}\n"

# Commit changes
echo -e "${YELLOW}💾 Committing changes...${NC}"
git commit -m "$COMMIT_MESSAGE"
echo -e "${GREEN}✓ Changes committed${NC}\n"

# Push to origin
echo -e "${YELLOW}🚀 Pushing to origin/${CURRENT_BRANCH}...${NC}"
git push origin "$CURRENT_BRANCH"
echo -e "${GREEN}✓ Changes pushed${NC}\n"

# Show final status
echo -e "${YELLOW}Final Git Status:${NC}"
git status

echo -e "${GREEN}✅ All done!${NC}"
