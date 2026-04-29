import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  type TurnContext,
  type ConversationReference,
  ActivityHandler,
  MessageFactory,
  TurnContext as TurnContextClass,
  CardFactory,
} from 'botbuilder';
import { broadcast } from './websocket.js';
import { FleetMarketChatAgent } from './agents/fleet-market/FleetMarketChatAgent.js';
import { FleetMarketAuctionAgent, type AuctionResult } from './agents/fleet-market/FleetMarketAuctionAgent.js';
import { AzureChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

// ── LLM intent classifier ────────────────────────────────────────────

const credential = new DefaultAzureCredential();
const azureADTokenProvider = getBearerTokenProvider(credential, 'https://cognitiveservices.azure.com/.default');

async function isVesselLateMessage(text: string): Promise<boolean> {
  const model = new AzureChatOpenAI({
    azureOpenAIBasePath: process.env.AZURE_OPENAI_BASE_PATH ?? '',
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? '',
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '',
    azureADTokenProvider,
    temperature: 0,
  });

  const resp = await model.invoke([
    new SystemMessage(
      `You are an intent classifier for a port terminal operating system called Salacia.
Your job is to determine whether an incoming message is reporting a vessel delay, a vessel arriving late, or requesting a fleet auction to reassign AGVs and stackers.

Respond with ONLY "yes" or "no".
- "yes" if the message is about a vessel being late, delayed, behind schedule, or requesting an auction/fleet reallocation.
- "no" for anything else.`,
    ),
    new HumanMessage(text),
  ]);

  const content = typeof resp.content === 'string' ? resp.content : JSON.stringify(resp.content);
  return content.trim().toLowerCase() === 'yes';
}

// ── Conversation references for proactive messaging ──────────────────

const conversationReferences = new Map<string, Partial<ConversationReference>>();

// ── Pending auctions awaiting human approval ─────────────────────────

interface PendingAuction {
  threadId: string
  auction: FleetMarketAuctionAgent
  auctionResult: AuctionResult | null
}
const pendingAuctions = new Map<string, PendingAuction>();

// ── Bot logic ────────────────────────────────────────────────────────

class TeamsBot extends ActivityHandler {
  private fleetMarketAgent = new FleetMarketChatAgent();

  constructor() {
    super();

    this.onMessage(async (context: TurnContext, next) => {

      // Store conversation reference for proactive messaging
      const ref = TurnContextClass.getConversationReference(context.activity);
      conversationReferences.set(ref.conversation!.id, ref);

      // Handle Action card submit (human-in-the-loop)
      const submitValue = context.activity.value as Record<string, unknown> | undefined;
      if (submitValue && submitValue.action === 'auction-approval') {
        await this.handle_HITL_LateVesselDisptachApproval(context, submitValue);
        await next();
        return;
      }

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

      // Check if the message triggers the auction workflow
      if (await isVesselLateMessage(text)) {
        await this.runAuction(context, text);
      } else {
        // Send to FleetMarketAgentChat and get reply
        const reply = await this.fleetMarketAgent.chat(text);

        // Broadcast agent reply to frontend
        broadcast({ type: 'fleet-market', message: reply });

        // Reply back to Teams
        await context.sendActivity(MessageFactory.text(reply));
      }

      await next();
    });

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded ?? []) {
        if (member.id !== context.activity.recipient?.id) {
          await context.sendActivity(
            MessageFactory.text('Welcome to Salacia Cloud Agents, I am your assistant for fleet management and operations.'),
          );
        }
      }
      await next();
    });
  }

  private async runAuction(context: TurnContext, triggerMessage: string) {
    await context.sendActivity(
      MessageFactory.text('🏁 **Fleet Market Transport Job Auction** initiated — querying 32 edge agents...'),
    );
    broadcast({ type: 'fleet-market-auction-log', message: 'FleetMarket Transport Job Auction initiated...' });

    const auction = new FleetMarketAuctionAgent();
    const { threadId, auctionResult } = await auction.runAuction(
      triggerMessage,
      async (log) => {
        await context.sendActivity(MessageFactory.text(log));
        broadcast({ type: 'fleet-market-auction-log', message: log });
      },
    );

    if (!auctionResult) {
      await context.sendActivity(MessageFactory.text('⚠️ Auction produced no result.'));
      return;
    }

    // Store pending auction for human-in-the-loop
    const auctionId = `auction-${Date.now()}`;
    pendingAuctions.set(auctionId, { threadId, auction, auctionResult });

    // Send Teams Adaptive Card for approval
    const winners = auctionResult['auction-result'];
    const card = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '🏆 FleetMarket Auction — Dispatch Approval',
          size: 'Medium',
          weight: 'Bolder',
        },
        {
          type: 'TextBlock',
          text: 'The following fleet pairs have been selected for Berth 3:',
          wrap: true,
        },
        ...winners.map((w, i) => ({
          type: 'ColumnSet' as const,
          columns: [
            {
              type: 'Column' as const,
              width: 'auto' as const,
              items: [{ type: 'TextBlock' as const, text: `**${i + 1}.** AGV: ${w.agvName}`, wrap: true }],
            },
            {
              type: 'Column' as const,
              width: 'auto' as const,
              items: [{ type: 'TextBlock' as const, text: `Stacker: ${w.stackerName}`, wrap: true }],
            },
          ],
        })),
        {
          type: 'TextBlock',
          text: 'Approve dispatch of these 2 AGVs and 2 Stackers?',
          wrap: true,
          spacing: 'Medium',
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '✅ Yes — Dispatch',
          data: { action: 'auction-approval', auctionId, approved: 'yes' },
        },
        {
          type: 'Action.Submit',
          title: '❌ No — Cancel',
          data: { action: 'auction-approval', auctionId, approved: 'no' },
        },
      ],
    });

    await context.sendActivity({ attachments: [card] });
  }

  private async handle_HITL_LateVesselDisptachApproval(context: TurnContext, submitValue: Record<string, unknown>) {
    const auctionId = submitValue.auctionId as string;
    const approved = submitValue.approved === 'yes';
    const pending = pendingAuctions.get(auctionId);

    if (!pending) {
      await context.sendActivity(
        MessageFactory.text('⚠️ Auction session expired or not found.'),
      );
      return;
    }

    pendingAuctions.delete(auctionId);
    const dispatchResult = await pending.auction.resumeWithApproval(
      pending.threadId,
      approved,
      async (log) => {
        await context.sendActivity(MessageFactory.text(log));
        broadcast({ type: 'fleet-market-auction-log', message: log });
      },
    );

    // Teams Action Card Approve or Cancel
    if (approved && dispatchResult) {
      broadcast({ ...dispatchResult });
      await context.sendActivity(
        MessageFactory.text('✅ Dispatch confirmed. Fleet is mobilising!'),
      );
    } else {
      await context.sendActivity(
        MessageFactory.text('❌ Dispatch cancelled by operator.'),
      );
    }
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
