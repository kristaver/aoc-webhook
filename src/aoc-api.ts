import { Env, LeaderboardData } from "./types";

export async function fetchLeaderboard(env: Env): Promise<LeaderboardData> {
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

  return await response.json();
}
