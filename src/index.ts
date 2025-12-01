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

    if (url.pathname === "/reset-rate-limit") {
      try {
        await env.AOC_STATE.delete("last_api_fetch");
        return new Response("Rate limit reset (use for testing only!)", {
          status: 200,
        });
      } catch (error) {
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    // Test endpoints that preview messages without sending
    if (url.pathname === "/preview-daily") {
      try {
        const leaderboard = await fetchLeaderboard(env);
        const message = formatDailyLeaderboard(leaderboard);
        return new Response(message, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch (error) {
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    if (url.pathname === "/preview-completions") {
      try {
        const leaderboard = await fetchLeaderboard(env);
        const currentCompletions = extractCompletions(leaderboard);
        const previousState = await getStoredState(env);

        if (!previousState) {
          return new Response(
            "No previous state. Run /check first to initialize.",
            {
              status: 200,
            }
          );
        }

        const newCompletions = findNewCompletions(
          currentCompletions,
          previousState.completions
        );

        if (newCompletions.length === 0) {
          return new Response("No new completions since last check.", {
            status: 200,
          });
        }

        const message = formatCompletionMessage(newCompletions);
        return new Response(message, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch (error) {
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    // Status endpoint
    if (url.pathname === "/status" || url.pathname === "/") {
      try {
        const lastFetch = await env.AOC_STATE.get("last_api_fetch");
        let statusMsg = "AoC Webhook Worker\n\n";

        if (lastFetch) {
          const timeSince = Date.now() - parseInt(lastFetch);
          const minutesAgo = Math.floor(timeSince / 60000);
          const canFetchIn = Math.max(0, 15 - minutesAgo);

          statusMsg += `Last API fetch: ${minutesAgo} minute(s) ago\n`;
          statusMsg += `Can fetch again in: ${canFetchIn} minute(s)\n\n`;
        } else {
          statusMsg += "No API fetches yet\n\n";
        }

        statusMsg += "Endpoints:\n";
        statusMsg += "  /check - Manual completion check\n";
        statusMsg += "  /daily - Send daily leaderboard\n";
        statusMsg += "  /reset - Reset stored state\n";
        statusMsg += "  /status - View rate limit status\n\n";
        statusMsg += "Test Endpoints (preview without sending):\n";
        statusMsg += "  /preview-daily - Preview daily leaderboard\n";
        statusMsg +=
          "  /preview-completions - Preview completion notifications\n\n";
        statusMsg += "Note: AoC API has 15-minute minimum between requests";

        return new Response(statusMsg, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      } catch (error) {
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
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
