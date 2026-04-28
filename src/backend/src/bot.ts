import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  type TurnContext,
  type ConversationReference,
  ActivityHandler,
  MessageFactory,
  TurnContext as TurnContextClass,
} from 'botbuilder';
import { broadcast } from './websocket.js';
import { FleetMarketAgentChat } from './agents/fleet-market/FleetMarketAgentChat.js';

// ── Conversation references for proactive messaging ──────────────────

const conversationReferences = new Map<string, Partial<ConversationReference>>();

// ── Bot logic ────────────────────────────────────────────────────────

class TeamsBot extends ActivityHandler {
  private fleetMarketAgent = new FleetMarketAgentChat();

  constructor() {
    super();

    this.onMessage(async (context: TurnContext, next) => {
      // Store conversation reference for proactive messaging
      const ref = TurnContextClass.getConversationReference(context.activity);
      conversationReferences.set(ref.conversation!.id, ref);

      const text = context.activity.text?.trim() ?? '';
      const from = context.activity.from?.name ?? 'unknown';
      console.log(`[Bot] Message from ${from}: ${text}`);

      // Forward the message to all connected WebSocket clients (frontend)
      broadcast({
        type: 'teams-message',
        from,
        text,
        timestamp: new Date().toISOString(),
      });

      // Send to FleetMarketAgentChat and get reply
      const reply = await this.fleetMarketAgent.chat(text);

      // Broadcast agent reply to frontend
      broadcast({ type: 'fleet-market', message: reply });

      // Reply back to Teams
      await context.sendActivity(MessageFactory.text(reply));

      await next();
    });

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded ?? []) {
        if (member.id !== context.activity.recipient?.id) {
          await context.sendActivity(
            MessageFactory.text('Welcome to Salacia Port Operations!')
          );
        }
      }
      await next();
    });
  }
}

// ── Adapter & bot singletons ─────────────────────────────────────────

const appId = process.env.MICROSOFT_APP_ID ?? '';
const botFrameworkAuth = new ConfigurationBotFrameworkAuthentication({
  MicrosoftAppId: appId,
  MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD ?? '',
  MicrosoftAppType: appId ? 'SingleTenant' : 'MultiTenant',
  MicrosoftAppTenantId: process.env.MICROSOFT_APP_TENANT_ID ?? '',
});

export const adapter = new CloudAdapter(botFrameworkAuth);

// Error handler
adapter.onTurnError = async (context, error) => {
  console.error('[Bot] Unhandled error:', error);
  await context.sendActivity('Sorry, something went wrong.');
};

export const bot = new TeamsBot();

/**
 * Send a proactive message to all stored Teams conversations.
 */
export async function sendToTeams(text: string): Promise<void> {
  for (const ref of conversationReferences.values()) {
    try {
      await adapter.continueConversationAsync(
        process.env.MICROSOFT_APP_ID ?? '',
        ref,
        async (ctx) => {
          await ctx.sendActivity(MessageFactory.text(text));
        },
      );
    } catch (err) {
      console.error('[Bot] Failed to send proactive message:', err);
    }
  }
}
