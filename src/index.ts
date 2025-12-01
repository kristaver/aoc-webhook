import { Env } from "./types";
import { fetchLeaderboard } from "./aoc-api";
import {
  getStoredState,
  saveState,
  extractCompletions,
  findNewCompletions,
} from "./state";
import {
  formatCompletionMessage,
  formatDailyLeaderboard,
  sendToGoogleChat,
} from "./google-chat";

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const cronTime = new Date(event.scheduledTime);
    const hour = cronTime.getUTCHours();

    // Check if this is the daily leaderboard cron (18:00 UTC = 19:00 UTC+1)
    const isDailyLeaderboard = hour === 18 && cronTime.getUTCMinutes() === 0;

    try {
      if (isDailyLeaderboard) {
        await handleDailyLeaderboard(env);
      } else {
        await handleCompletionCheck(env);
      }
    } catch (error) {
      console.error("Error in scheduled handler:", error);
      throw error;
    }
  },

  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Manual trigger endpoints for testing
    if (url.pathname === "/check") {
      try {
        await handleCompletionCheck(env);
        return new Response("Completion check completed", { status: 200 });
      } catch (error) {
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    if (url.pathname === "/daily") {
      try {
        await handleDailyLeaderboard(env);
        return new Response("Daily leaderboard sent", { status: 200 });
      } catch (error) {
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    if (url.pathname === "/reset") {
      try {
        await env.AOC_STATE.delete("leaderboard_state");
        return new Response("State reset", { status: 200 });
      } catch (error) {
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    return new Response(
      "AoC Webhook Worker\n\nEndpoints:\n  /check - Manual completion check\n  /daily - Send daily leaderboard\n  /reset - Reset stored state",
      {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }
    );
  },
};

async function handleCompletionCheck(env: Env): Promise<void> {
  console.log("Checking for new completions...");

  // Fetch current leaderboard
  const leaderboard = await fetchLeaderboard(env);
  const currentCompletions = extractCompletions(leaderboard);

  // Get previous state
  const previousState = await getStoredState(env);

  if (!previousState) {
    // First run - just store the current state
    console.log("First run - storing initial state");
    await saveState(env, {
      lastChecked: Date.now(),
      completions: currentCompletions,
    });
    return;
  }

  // Find new completions
  const newCompletions = findNewCompletions(
    currentCompletions,
    previousState.completions
  );

  if (newCompletions.length > 0) {
    console.log(`Found ${newCompletions.length} new completion(s)`);

    // Send notification
    const message = formatCompletionMessage(newCompletions);
    await sendToGoogleChat(env, message);

    // Update state
    await saveState(env, {
      lastChecked: Date.now(),
      completions: currentCompletions,
    });
  } else {
    console.log("No new completions");

    // Still update last checked time
    await saveState(env, {
      lastChecked: Date.now(),
      completions: previousState.completions,
    });
  }
}

async function handleDailyLeaderboard(env: Env): Promise<void> {
  console.log("Sending daily leaderboard...");

  // Fetch current leaderboard
  const leaderboard = await fetchLeaderboard(env);

  // Format and send daily leaderboard
  const message = formatDailyLeaderboard(leaderboard);
  await sendToGoogleChat(env, message);

  console.log("Daily leaderboard sent successfully");
}
