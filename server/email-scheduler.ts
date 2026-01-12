import { storage } from "./storage";
import * as nylas from "./nylas";

let schedulerInterval: NodeJS.Timeout | null = null;

async function processPendingSends() {
  try {
    const readySends = await storage.getPendingSendsReady();
    
    for (const send of readySends) {
      try {
        const claimed = await storage.claimPendingSendForProcessing(send.id);
        
        if (!claimed) {
          console.log(`[EmailScheduler] Skipping email ${send.id} - already cancelled or processed`);
          continue;
        }
        
        const { to, cc, bcc, subject, body, replyToMessageId } = claimed.payload;
        await nylas.sendMessage(claimed.grantId, to, subject, body, replyToMessageId, cc, bcc);
        nylas.invalidateMessagesCache(claimed.grantId);
        await storage.markPendingSendSent(claimed.id);
        console.log(`[EmailScheduler] Successfully sent email ${claimed.id} to ${to.join(", ")}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await storage.markPendingSendFailed(send.id, errorMessage);
        console.error(`[EmailScheduler] Failed to send email ${send.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[EmailScheduler] Error processing pending sends:", error);
  }
}

export function startEmailScheduler() {
  if (schedulerInterval) {
    console.log("[EmailScheduler] Scheduler already running");
    return;
  }
  
  console.log("[EmailScheduler] Starting email scheduler (polling every 1 second)");
  schedulerInterval = setInterval(processPendingSends, 1000);
  
  processPendingSends();
}

export function stopEmailScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[EmailScheduler] Scheduler stopped");
  }
}
