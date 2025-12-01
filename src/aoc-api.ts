import { Env, LeaderboardData } from "./types";

const RATE_LIMIT_KEY = "last_api_fetch";
const MIN_FETCH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export async function fetchLeaderboard(env: Env): Promise<LeaderboardData> {
  // Check rate limit
  const lastFetch = await env.AOC_STATE.get(RATE_LIMIT_KEY);
  if (lastFetch) {
    const timeSinceLastFetch = Date.now() - parseInt(lastFetch);
    if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
      const minutesRemaining = Math.ceil(
        (MIN_FETCH_INTERVAL_MS - timeSinceLastFetch) / 60000
      );
      throw new Error(
        `Rate limit: Must wait ${minutesRemaining} more minute(s) before fetching again (AoC API limit: 15min minimum)`
      );
    }
  }

  const url = `https://adventofcode.com/2025/leaderboard/private/view/${env.AOC_LEADERBOARD_ID}.json`;

  const response = await fetch(url, {
    headers: {
      Cookie: `session=${env.AOC_SESSION_COOKIE}`,
      "User-Agent": "AoC Leaderboard Webhook by github.com/kristaver",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch leaderboard: ${response.status} ${response.statusText}`
    );
  }

  // Update last fetch time
  await env.AOC_STATE.put(RATE_LIMIT_KEY, Date.now().toString());

  return await response.json();
}
