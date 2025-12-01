# Advent of Code Webhook for Google Chat

A Cloudflare Worker that monitors your private Advent of Code 2025 leaderboard and sends updates to Google Chat.

## Features

- 🎄 **Automatic Updates**: Checks for new completions every 20 minutes
- ⭐ **Completion Notifications**: Instant notifications when team members complete challenges
- 📊 **Daily Leaderboard**: Full leaderboard summary sent daily at 19:00 UTC+1
- 🎨 **Rich Formatting**: Beautiful messages with emojis, medals, and progress bars
- 💾 **State Management**: Uses Cloudflare KV to track changes

## Setup

### Prerequisites

- Node.js 18+ installed
- A Cloudflare account (free tier works!)
- Your Advent of Code session cookie
- A Google Chat webhook URL

### 1. Install Dependencies

```bash
npm install
```

### 2. Create KV Namespace

```bash
# Create production KV namespace
npx wrangler kv:namespace create "AOC_STATE"

# Create preview KV namespace (for development)
npx wrangler kv:namespace create "AOC_STATE" --preview
```

Copy the namespace IDs from the output and update them in `wrangler.toml`.

### 3. Set Environment Variables

Create a `.env` file (or use `.dev.vars` for local dev):

```bash
cp .env.example .env
```

Fill in your values:

- **AOC_SESSION_COOKIE**: Your Advent of Code session cookie
  - Log into adventofcode.com
  - Open browser DevTools → Application/Storage → Cookies
  - Copy the value of the `session` cookie

- **AOC_LEADERBOARD_ID**: Your private leaderboard ID
  - Go to your private leaderboard: `https://adventofcode.com/2025/leaderboard/private/view/XXXXXX`
  - The number (XXXXXX) is your leaderboard ID

- **GOOGLE_CHAT_WEBHOOK_URL**: Your Google Chat webhook URL
  - In Google Chat, go to your space
  - Click the space name → Apps & integrations → Webhooks
  - Click "Add webhook" and copy the URL

### 4. Set Secrets in Cloudflare

```bash
# Set your secrets (they won't be stored in wrangler.toml)
echo "your_session_cookie_here" | npx wrangler secret put AOC_SESSION_COOKIE
echo "your_leaderboard_id_here" | npx wrangler secret put AOC_LEADERBOARD_ID
echo "your_webhook_url_here" | npx wrangler secret put GOOGLE_CHAT_WEBHOOK_URL
```

### 5. Deploy

```bash
npm run deploy
```

## Usage

### Automatic Operation

Once deployed, the worker runs automatically:

- **Every 20 minutes**: Checks for new completions and sends notifications
- **Daily at 19:00 UTC+1**: Sends full leaderboard summary

### Manual Testing

You can manually trigger the worker via HTTP:

```bash
# Check for completions now
curl https://aoc-webhook.YOUR_SUBDOMAIN.workers.dev/check

# Send daily leaderboard now
curl https://aoc-webhook.YOUR_SUBDOMAIN.workers.dev/daily

# Reset stored state (useful for testing)
curl https://aoc-webhook.YOUR_SUBDOMAIN.workers.dev/reset
```

### Local Development

```bash
# Start local dev server
npm run dev

# In another terminal, trigger endpoints
curl http://localhost:8787/check
curl http://localhost:8787/daily
```

## Message Formats

### Completion Notification
```
🎄 New Advent of Code Completions! ⭐

John Doe
  • Day 1 Part 1 ⭐
  • Day 1 Part 2 ⭐⭐

Jane Smith
  • Day 2 Part 1 ⭐
```

### Daily Leaderboard
```
🎄 Advent of Code 2025 - Daily Leaderboard 🎄

🥇 John Doe
   Score: 150 | Stars: 10 ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
   Progress: ⭐⭐⭐⭐⬜ ⬜⬜⬜⬜⬜ ...

🥈 Jane Smith
   Score: 120 | Stars: 8 ⭐⭐⭐⭐⭐⭐⭐⭐
   Progress: ⭐⭐⭐🌟⬜ ⬜⬜⬜⬜⬜ ...
```

Progress bar legend:
- ⭐ = Both parts completed
- 🌟 = Only part 1 completed
- ⬜ = Not started

## Monitoring

```bash
# View live logs
npm run tail

# Check worker status
npx wrangler deployments list
```

## Troubleshooting

**No notifications appearing?**
- Verify your session cookie is valid (try accessing the leaderboard URL in your browser)
- Check worker logs: `npm run tail`
- Manually trigger: `curl https://your-worker.workers.dev/check`

**"Failed to fetch leaderboard" error?**
- Session cookie may have expired - get a new one
- Leaderboard ID might be incorrect
- AoC API has rate limits - worker respects them

**Timezone issues?**
- Daily leaderboard is set to 18:00 UTC (19:00 UTC+1)
- Adjust the cron schedule in `wrangler.toml` if needed

## Configuration

### Adjust Check Frequency

Edit `wrangler.toml`:

```toml
crons = [
  "*/10 * * * *",      # Check every 10 minutes instead of 20
  "0 18 * 12 *"        # Keep daily at 18:00 UTC
]
```

### Change Daily Leaderboard Time

```toml
crons = [
  "*/20 * * * *",      # Keep 20-minute checks
  "0 17 * 12 *"        # Send at 17:00 UTC instead
]
```

## Cost

Cloudflare Workers Free Tier includes:
- 100,000 requests per day
- 10ms CPU time per request

This webhook uses approximately:
- ~72 requests/day (20-min checks) + 1 daily leaderboard = ~73 requests/day
- Well within free tier limits ✅

## License

MIT
