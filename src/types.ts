export interface Env {
  AOC_STATE: KVNamespace;
  AOC_SESSION_COOKIE: string;
  AOC_LEADERBOARD_ID: string;
  GOOGLE_CHAT_WEBHOOK_URL: string;
}

export interface Member {
  id: string;
  name: string;
  stars: number;
  local_score: number;
  global_score: number;
  last_star_ts: number;
  completion_day_level: Record<string, Record<string, { get_star_ts: number }>>;
}

export interface LeaderboardData {
  event: string;
  owner_id: string;
  members: Record<string, Member>;
}

export interface StoredCompletion {
  memberId: string;
  memberName: string;
  day: number;
  part: number;
  timestamp: number;
}

export interface StoredState {
  lastChecked: number;
  completions: StoredCompletion[];
}
