#!/bin/bash

echo "🎄 Advent of Code Webhook Setup Script 🎄"
echo ""
echo "This script will help you set up your Cloudflare Worker."
echo ""

# Check if wrangler is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js first."
    exit 1
fi

echo "Step 1: Creating KV namespaces..."
echo ""
echo "Creating production namespace:"
npx wrangler kv:namespace create "AOC_STATE"
echo ""
echo "Creating preview namespace:"
npx wrangler kv:namespace create "AOC_STATE" --preview
echo ""
echo "⚠️  Copy the namespace IDs above and update them in wrangler.toml"
echo ""
read -p "Press Enter when you've updated wrangler.toml..."

echo ""
echo "Step 2: Setting up secrets..."
echo ""

read -p "Enter your AoC session cookie: " session_cookie
echo "$session_cookie" | npx wrangler secret put AOC_SESSION_COOKIE

read -p "Enter your AoC leaderboard ID: " leaderboard_id
echo "$leaderboard_id" | npx wrangler secret put AOC_LEADERBOARD_ID

read -p "Enter your Google Chat webhook URL: " webhook_url
echo "$webhook_url" | npx wrangler secret put GOOGLE_CHAT_WEBHOOK_URL

echo ""
echo "✅ Secrets set successfully!"
echo ""

read -p "Deploy now? (y/n): " deploy_choice
if [ "$deploy_choice" = "y" ] || [ "$deploy_choice" = "Y" ]; then
    echo "Deploying..."
    npm run deploy
    echo ""
    echo "🎉 Deployment complete!"
    echo ""
    echo "Your worker is now running and will:"
    echo "  • Check for completions every 20 minutes"
    echo "  • Send daily leaderboard at 19:00 UTC+1"
    echo ""
    echo "Test it manually:"
    echo "  curl https://aoc-webhook.YOUR_SUBDOMAIN.workers.dev/check"
else
    echo ""
    echo "Skipping deployment. Deploy later with: npm run deploy"
fi

echo ""
echo "✨ Setup complete! Happy coding! ✨"
