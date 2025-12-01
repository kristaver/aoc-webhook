import { Env, LeaderboardData, Member, StoredCompletion } from "./types";

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"];

export function formatCompletionMessage(
  completions: StoredCompletion[]
): string {
  // Group completions by member
  const byMember = new Map<string, StoredCompletion[]>();
  for (const completion of completions) {
    const key = `${completion.memberId}-${completion.memberName}`;
    if (!byMember.has(key)) {
      byMember.set(key, []);
    }
    byMember.get(key)!.push(completion);
  }

  let message = "🎄 *New Advent of Code Completions!* ⭐\n\n";

  for (const [memberKey, memberCompletions] of byMember) {
    const memberName = memberCompletions[0].memberName;
    message += `*${memberName}*\n`;

    // Sort by day and part
    memberCompletions.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.part - b.part;
    });

    for (const completion of memberCompletions) {
      // Check if this is completing part 2 (gold star) or part 1 (silver star)
      const starType =
        completion.part === 2 ? "🥇 Gold Star" : "🥈 Silver Star";
      message += `  • Day ${completion.day} - ${starType}\n`;
    }
    message += "\n";
  }

  return message;
}

export function formatDailyLeaderboard(leaderboard: LeaderboardData): string {
  const members = Object.values(leaderboard.members).filter((m) => m.stars > 0);

  if (members.length === 0) {
    return "🎄 *Advent of Code 2025 Leaderboard*\n\nNo completions yet. Get coding! 💻";
  }

  // Sort by local score (descending), then by stars, then by last star time (ascending)
  members.sort((a, b) => {
    if (b.local_score !== a.local_score) {
      return b.local_score - a.local_score;
    }
    if (b.stars !== a.stars) {
      return b.stars - a.stars;
    }
    return a.last_star_ts - b.last_star_ts;
  });

  let message = "🎄 *Advent of Code 2025 - Daily Leaderboard* 🎄\n\n";

  members.forEach((member, index) => {
    const position = index + 1;
    const medal = index < 3 ? MEDAL_EMOJIS[index] + " " : `${position}. `;
    const name = member.name || `Anonymous User #${member.id}`;
    const stars = "⭐".repeat(member.stars);

    message += `${medal}*${name}*\n`;
    message += `   Score: ${member.local_score} | Stars: ${member.stars} ${stars}\n`;
    message += `   Progress: ${formatProgress(member)}\n\n`;
  });

  message += `_Last updated: ${new Date().toLocaleString("en-US", {
    timeZone: "Europe/Oslo",
  })}_`;

  return message;
}

function formatProgress(member: Member): string {
  const days = 12; // 2025 has 12 days instead of 25
  let progress = "";

  for (let day = 1; day <= days; day++) {
    const dayData = member.completion_day_level[day.toString()];
    if (!dayData) {
      progress += "⬜"; // Gray - no stars
    } else if (dayData["2"]) {
      progress += "🥇"; // Gold - both stars
    } else if (dayData["1"]) {
      progress += "🥈"; // Silver - first star only
    }

    // Add space every 4 days for readability (since we have 12 days)
    if (day % 4 === 0 && day < days) {
      progress += " ";
    }
  }

  return progress;
}

export async function sendToGoogleChat(
  env: Env,
  message: string
): Promise<void> {
  const payload = {
    text: message,
  };

  const response = await fetch(env.GOOGLE_CHAT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to send to Google Chat: ${response.status} ${text}`
    );
  }
}
