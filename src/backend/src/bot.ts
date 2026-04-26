import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  type TurnContext,
  ActivityHandler,
  MessageFactory,
} from 'botbuilder';
import { broadcast } from './websocket.js';

// ── Bot logic ────────────────────────────────────────────────────────

class TeamsBot extends ActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context: TurnContext, next) => {
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

      // Reply back to Teams
      await context.sendActivity(
        MessageFactory.text(`Received: "${text}"`)
      );

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
