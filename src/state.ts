import {
  Env,
  LeaderboardData,
  Member,
  StoredCompletion,
  StoredState,
} from "./types";

const STATE_KEY = "leaderboard_state";

export async function getStoredState(env: Env): Promise<StoredState | null> {
  const stored = await env.AOC_STATE.get(STATE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export async function saveState(env: Env, state: StoredState): Promise<void> {
  await env.AOC_STATE.put(STATE_KEY, JSON.stringify(state));
}

export function extractCompletions(
  leaderboard: LeaderboardData
): StoredCompletion[] {
  const completions: StoredCompletion[] = [];

  for (const [memberId, member] of Object.entries(leaderboard.members)) {
    for (const [day, parts] of Object.entries(member.completion_day_level)) {
      for (const [part, data] of Object.entries(parts)) {
        completions.push({
          memberId,
          memberName: member.name || `Anonymous User #${memberId}`,
          day: parseInt(day),
          part: parseInt(part),
          timestamp: data.get_star_ts,
        });
      }
    }
  }

  return completions;
}

export function findNewCompletions(
  currentCompletions: StoredCompletion[],
  previousCompletions: StoredCompletion[]
): StoredCompletion[] {
  const previousSet = new Set(
    previousCompletions.map((c) => `${c.memberId}-${c.day}-${c.part}`)
  );

  return currentCompletions.filter(
    (c) => !previousSet.has(`${c.memberId}-${c.day}-${c.part}`)
  );
}

export function sortMembersByScore(members: Member[]): Member[] {
  return members.sort((a, b) => {
    if (b.local_score !== a.local_score) {
      return b.local_score - a.local_score;
    }
    if (b.stars !== a.stars) {
      return b.stars - a.stars;
    }
    return a.last_star_ts - b.last_star_ts;
  });
}
