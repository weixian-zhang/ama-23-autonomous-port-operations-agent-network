import { AzureChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity'
import { StateGraph, Annotation, MemorySaver, interrupt, Command } from '@langchain/langgraph'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Signal data ──────────────────────────────────────────────────────

const AGV_SIGNALS = JSON.parse(
  readFileSync(join(__dirname, 'data/agv-signal-data.json'), 'utf-8'),
)
const STACKER_SIGNALS = JSON.parse(
  readFileSync(join(__dirname, 'data/stacker-signal-data.json'), 'utf-8'),
)

// ── Agent names ──────────────────────────────────────────────────────

const AGV_NAMES = [
  'agv-berth-1-0', 'agv-berth-1-1', 'agv-berth-1-2', 'agv-berth-1-3',
  'agv-berth-2-0', 'agv-berth-2-1', 'agv-berth-2-2', 'agv-berth-2-3',
  'agv-berth-4-0', 'agv-berth-4-1', 'agv-berth-4-2', 'agv-berth-4-3',
  'agv-berth-5-0', 'agv-berth-5-1', 'agv-berth-5-2', 'agv-berth-5-3',
]

const STACKER_NAMES = [
  'stacker-yard-1-0', 'stacker-yard-1-1', 'stacker-yard-1-2', 'stacker-yard-1-3',
  'stacker-yard-2-0', 'stacker-yard-2-1', 'stacker-yard-2-2', 'stacker-yard-2-3',
  'stacker-yard-4-0', 'stacker-yard-4-1', 'stacker-yard-4-2', 'stacker-yard-4-3',
  'stacker-yard-5-0', 'stacker-yard-5-1', 'stacker-yard-5-2', 'stacker-yard-5-3',
]

// ── LLM setup ────────────────────────────────────────────────────────

const credential = new DefaultAzureCredential()
const azureADTokenProvider = getBearerTokenProvider(credential, 'https://cognitiveservices.azure.com/.default')

function createModel(temperature = 0.8) {
  return new AzureChatOpenAI({
    azureOpenAIBasePath: process.env.AZURE_OPENAI_BASE_PATH ?? '',
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? '',
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '',
    azureADTokenProvider,
    temperature,
  })
}

// ── Bid types ────────────────────────────────────────────────────────

export interface AgentBid {
  agentName: string
  type: 'agv' | 'stacker'
  bid: number
  reason: string
}

export interface AuctionResult {
  type: 'fleetmarket-vessel-late'
  'auction-result': Array<{ agvName: string; stackerName: string }>
}

// ── System prompt templates (loaded from .md files) ──────────────────

const AGV_EDGE_PROMPT_TEMPLATE = readFileSync(join(__dirname, 'prompts/agv-edge-system-prompt.md'), 'utf-8')
const STACKER_EDGE_PROMPT_TEMPLATE = readFileSync(join(__dirname, 'prompts/stacker-edge-system-prompt.md'), 'utf-8')
const FLEETMARKET_ANALYSIS_PROMPT = readFileSync(join(__dirname, 'prompts/fleetmarket-analysis-system-prompt.md'), 'utf-8')

function agvEdgeSystemPrompt(agentName: string, signal: Record<string, unknown>): string {
  return AGV_EDGE_PROMPT_TEMPLATE
    .replace('{{AGENT_NAME}}', agentName)
    .replace('{{SIGNAL_DATA}}', JSON.stringify(signal, null, 2))
}

function stackerEdgeSystemPrompt(agentName: string, signal: Record<string, unknown>): string {
  return STACKER_EDGE_PROMPT_TEMPLATE
    .replace('{{AGENT_NAME}}', agentName)
    .replace('{{SIGNAL_DATA}}', JSON.stringify(signal, null, 2))
}

// ── Graph state ──────────────────────────────────────────────────────

const AuctionState = Annotation.Root({
  /** The trigger message from Teams */
  triggerMessage: Annotation<string>,
  /** All 32 bids collected */
  bids: Annotation<AgentBid[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  /** FleetMarket's final auction result JSON */
  auctionResult: Annotation<AuctionResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  /** Stream log messages for live feedback */
  streamLogs: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  /** Human-in-the-loop: true = approved, false = rejected, null = pending */
  humanApproval: Annotation<boolean | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
})

// ── Helper: pick random signal ───────────────────────────────────────

function randomSignal(signals: unknown[]): Record<string, unknown> {
  return signals[Math.floor(Math.random() * signals.length)] as Record<string, unknown>
}

// ── Helper: parse bid JSON from LLM response ────────────────────────

function parseBid(agentName: string, type: 'agv' | 'stacker', content: string): AgentBid {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? content)
    return {
      agentName,
      type,
      bid: Math.max(1, Math.min(5, Number(parsed.bid) || 3)),
      reason: String(parsed.reason ?? 'Silent bid.'),
    }
  } catch {
    return { agentName, type, bid: 3, reason: 'Signal garbled — submitting neutral bid.' }
  }
}

// ── Node: collect AGV bids (16 in parallel) ──────────────────────────

async function collectAgvBids(
  _state: typeof AuctionState.State,
): Promise<Partial<typeof AuctionState.State>> {
  const model = createModel()
  const results = await Promise.all(
    AGV_NAMES.map(async (name) => {
      const signal = randomSignal(AGV_SIGNALS)
      const resp = await model.invoke([
        new SystemMessage(agvEdgeSystemPrompt(name, signal)),
        new HumanMessage('Submit your bid now.'),
      ])
      const content = typeof resp.content === 'string' ? resp.content : JSON.stringify(resp.content)
      return parseBid(name, 'agv', content)
    }),
  )
  return {
    bids: results,
    streamLogs: results.map((b) => `🚛 ${b.agentName} bid ${b.bid}/5 — ${b.reason}`),
  }
}

// ── Node: collect Stacker bids (16 in parallel) ──────────────────────

async function collectStackerBids(
  _state: typeof AuctionState.State,
): Promise<Partial<typeof AuctionState.State>> {
  const model = createModel()
  const results = await Promise.all(
    STACKER_NAMES.map(async (name) => {
      const signal = randomSignal(STACKER_SIGNALS)
      const resp = await model.invoke([
        new SystemMessage(stackerEdgeSystemPrompt(name, signal)),
        new HumanMessage('Submit your bid now.'),
      ])
      const content = typeof resp.content === 'string' ? resp.content : JSON.stringify(resp.content)
      return parseBid(name, 'stacker', content)
    }),
  )
  return {
    bids: results,
    streamLogs: results.map((b) => `🏗️ ${b.agentName} bid ${b.bid}/5 — ${b.reason}`),
  }
}

// ── Node: FleetMarket analyzes bids and picks winners ────────────────

async function fleetMarketAnalyze(
  state: typeof AuctionState.State,
): Promise<Partial<typeof AuctionState.State>> {
  const model = createModel(0.4)
  const bidsText = state.bids
    .map((b) => `[${b.type.toUpperCase()}] ${b.agentName}: bid=${b.bid} reason="${b.reason}"`)
    .join('\n')

  const resp = await model.invoke([
    new SystemMessage(FLEETMARKET_ANALYSIS_PROMPT),
    new HumanMessage(`Here are all 32 bids:\n\n${bidsText}\n\nSelect the winners.`),
  ])
  const content = typeof resp.content === 'string' ? resp.content : JSON.stringify(resp.content)

  let auctionResult: AuctionResult
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? content) as Partial<AuctionResult>
    // Always force the discriminator type — the LLM occasionally omits it,
    // which causes the frontend's `socketClient.on('fleetmarket-vessel-late', …)`
    // subscriber to never fire and the vessel-late animation to never trigger.
    auctionResult = {
      type: 'fleetmarket-vessel-late',
      'auction-result': parsed['auction-result'] ?? [],
    }
  } catch {
    // Fallback: pick top 2 AGV and top 2 Stacker by bid score
    const agvBids = state.bids.filter((b) => b.type === 'agv').sort((a, b) => b.bid - a.bid)
    const stackerBids = state.bids.filter((b) => b.type === 'stacker').sort((a, b) => b.bid - a.bid)
    auctionResult = {
      type: 'fleetmarket-vessel-late',
      'auction-result': [
        { agvName: agvBids[0].agentName, stackerName: stackerBids[0].agentName },
        { agvName: agvBids[1].agentName, stackerName: stackerBids[1].agentName },
      ],
    }
  }

  const winners = auctionResult['auction-result']
  const summary = `🏆 FleetMarket Auction Complete!\nWinning pairs:\n` +
    winners.map((w, i) => `  ${i + 1}. AGV: ${w.agvName} + Stacker: ${w.stackerName}`).join('\n')

  return {
    auctionResult,
    streamLogs: [summary],
  }
}

// ── Node: human-in-the-loop — interrupt for Teams confirmation ───────

function humanApprovalNode(
  state: typeof AuctionState.State,
): Partial<typeof AuctionState.State> {
  const result = state.auctionResult!
  const winners = result['auction-result']
  const summary = winners
    .map((w, i) => `${i + 1}. AGV: **${w.agvName}** + Stacker: **${w.stackerName}**`)
    .join('\n')

  // This interrupts the graph and waits for human input
  const approval = interrupt({
    question: `Fleet Market Transport Job Auction Result — Dispatch confirmation needed:\n\n${summary}\n\nApprove dispatch?`,
    auctionResult: result,
  })

  // When resumed, approval is the value passed via Command
  return { humanApproval: approval === true || approval === 'yes' || approval === 'Yes' }
}

// ── Node: dispatch (broadcast to frontend) ───────────────────────────

function dispatchNode(
  state: typeof AuctionState.State,
): Partial<typeof AuctionState.State> {
  if (state.humanApproval) {
    return {
      streamLogs: ['✅ Dispatch approved! Broadcasting to frontend...'],
    }
  }
  return {
    streamLogs: ['❌ Dispatch rejected by operator.'],
  }
}

// ── Build the graph ──────────────────────────────────────────────────

function buildAuctionGraph() {
  const graph = new StateGraph(AuctionState)
    .addNode('collectAgvBids', collectAgvBids)
    .addNode('collectStackerBids', collectStackerBids)
    .addNode('fleetMarketAnalyze', fleetMarketAnalyze)
    .addNode('humanApprovalGate', humanApprovalNode)
    .addNode('dispatch', dispatchNode)

    // Start: fan-out to both bid collectors in parallel
    .addEdge('__start__', 'collectAgvBids')
    .addEdge('__start__', 'collectStackerBids')

    // Both bid collectors feed into FleetMarket analysis
    .addEdge('collectAgvBids', 'fleetMarketAnalyze')
    .addEdge('collectStackerBids', 'fleetMarketAnalyze')
    
    // Analysis → human approval → dispatch
    .addEdge('fleetMarketAnalyze', 'humanApprovalGate')
    .addEdge('humanApprovalGate', 'dispatch')
    .addEdge('dispatch', '__end__')

  const memory = new MemorySaver()
  return graph.compile({ checkpointer: memory })
}

// ── Exported auction runner ──────────────────────────────────────────

export type StreamCallback = (log: string) => void | Promise<void>

export class FleetMarketAuctionAgent {
  private app = buildAuctionGraph()

  /**
   * Start the auction workflow. Streams log messages via the callback.
   * Returns the thread_id needed for the human-in-the-loop resume.
   */
  async runAuction(
    triggerMessage: string,
    onStream: StreamCallback,
  ): Promise<{ threadId: string; auctionResult: AuctionResult | null }> {
    const threadId = `auction-${Date.now()}`
    const config = { configurable: { thread_id: threadId } }

    const stream = await this.app.stream(
      { triggerMessage },
      { ...config, streamMode: 'updates' },
    )

    let auctionResult: AuctionResult | null = null

    for await (const event of stream) {
      // event is { nodeName: { ...partialState } }
      for (const [nodeName, update] of Object.entries(event)) {
        const upd = update as Partial<typeof AuctionState.State>
        if (upd.streamLogs) {
          for (const log of upd.streamLogs) {
            await onStream(log)
          }
        }
        if (upd.auctionResult) {
          auctionResult = upd.auctionResult
        }
        if (nodeName === '__interrupt__') {
          // Graph is paused for human approval
          await onStream('⏸️ Awaiting operator approval in Teams...')
        }
      }
    }

    return { threadId, auctionResult }
  }

  /**
   * Resume the auction after human approval (Teams Action card response).
   * Returns the final auction result if approved, or null if rejected.
   */
  async resumeWithApproval(
    threadId: string,
    approved: boolean,
    onStream: StreamCallback,
  ): Promise<AuctionResult | null> {
    const config = { configurable: { thread_id: threadId } }

    const stream = await this.app.stream(
      new Command({ resume: approved }),
      { ...config, streamMode: 'updates' },
    )

    let auctionResult: AuctionResult | null = null

    for await (const event of stream) {
      for (const [, update] of Object.entries(event)) {
        const upd = update as Partial<typeof AuctionState.State>
        if (upd.streamLogs) {
          for (const log of upd.streamLogs) {
            await onStream(log)
          }
        }
        if (upd.auctionResult) {
          auctionResult = upd.auctionResult
        }
      }
    }

    // Get final state to check approval
    const finalState = await this.app.getState(config)
    const state = finalState.values as typeof AuctionState.State
    if (state.humanApproval && state.auctionResult) {
      return state.auctionResult
    }
    return auctionResult
  }
}
