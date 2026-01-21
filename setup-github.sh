#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up GitHub repo for scraping-service${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Run this from scraping-service directory${NC}"
    exit 1
fi

# Get GitHub username
echo -e "${BLUE}Enter your GitHub username:${NC}"
read GITHUB_USER

if [ -z "$GITHUB_USER" ]; then
    GITHUB_USER="shayhaimgalaxys2"
    echo -e "${GREEN}Using default: $GITHUB_USER${NC}"
fi

# Set up remote
echo -e "${BLUE}📦 Setting up Git remote...${NC}"
git remote add origin "https://github.com/$GITHUB_USER/scraping-service.git" 2>/dev/null || \
git remote set-url origin "https://github.com/$GITHUB_USER/scraping-service.git"

# Rename branch to main
echo -e "${BLUE}🌿 Renaming branch to main...${NC}"
git branch -M main

# Push to GitHub
echo -e "${BLUE}⬆️  Pushing to GitHub...${NC}"
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Success! Repo pushed to GitHub${NC}"
    echo ""
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo "1. Go to https://railway.app"
    echo "2. Click 'New Project' → 'Deploy from GitHub repo'"
    echo "3. Select 'scraping-service'"
    echo "4. Add environment variables (see DEPLOY-NOW.md)"
    echo ""
    echo -e "${GREEN}Repository URL: https://github.com/$GITHUB_USER/scraping-service${NC}"
else
    echo ""
    echo -e "${RED}❌ Push failed. You may need to:${NC}"
    echo "1. Create the repo on GitHub first: https://github.com/new"
    echo "2. Name it: scraping-service"
    echo "3. Run this script again"
fi
