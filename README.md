# Salacia

<img width="500" height="400" alt="image" src="https://github.com/user-attachments/assets/f80b0f09-7396-43b1-afec-fb146f6bef04" />

<br />

**Salacia** is a next-generation **Agentic Terminal Operating System (TOS)** for shipping ports

Named after the Roman goddess of the sea, Salacia replaces the static rule‑engines of mainstream TOS platforms with a **swarm of cooperating AI agents** that plan, bid, and react in real time across berths, cranes, yards, and fleets.

---

## What is a Terminal OS?

A **Terminal Operating System (TOS)** is essentially the **ERP system for a shipping port** — the same way SAP runs the day‑to‑day operations of a manufacturer or retailer, a TOS runs the day‑to‑day operations of a container terminal. It is the central nervous system of the port: every container that comes off a vessel and onto a truck or train passes through it, and every piece of equipment, work order, and billing event is tracked inside it.

A TOS typically coordinates:

| Operation | What it decides |
| --- | --- |
| **Berth planning** | Which vessel docks at which berth, and when |
| **Crane scheduling** | Which quay crane unloads which bay of which vessel |
| **Fleet management** | Which AGV (Automated Guided Vehicle) or reach stacker moves which container |
| **Yard management** | Where each container is stacked in the yard, and for how long |

Mainstream TOS platforms (e.g. Navis N4, CATOS, TOS+) rely on **deterministic rule engines** and **mixed-integer linear programming**. They plan one vessel at a time, struggle with disruption (late vessels, weather, equipment failure), and require human planners to manually re‑shuffle the plan when reality drifts from the schedule.

## Why Salacia is different

Salacia treats every piece of equipment as an **autonomous agent** with its own voice. When a vessel runs late, the system doesn't ask a human to re‑plan — the agents *bid* against each other in a live auction to absorb the disruption.

| Layer | Mainstream TOS | Salacia |
| --- | --- | --- |
| Berth planning | Rule engine, one vessel at a time | **Apex Planner** + **Vessel Arrival Oracle** (XGBoost ETA + GenAI reasoning) continuously refines plans |
| Crane scheduling | Static MILP optimisation | **Crane Auctioneer** runs cognitive bidding rounds against live crane telemetry |
| Fleet management | Nearest-available heuristic | **Fleet Market Agent** auctions transport jobs to 16 AGVs and 16 stackers in parallel |
| Yard management | Rule-based slotting | **Yard King** simulates "what-if" stowage scenarios over a live 3D yard map |
| Operator UX | Tabular dashboards | **MetaRealm** — a live 3D digital twin of the entire port (built in React Three Fiber) |
| Human-in-the-loop | Email + phone | **Microsoft Teams chatbot** with adaptive cards for approvals |

---

## Live demo

### Salacia Hive (web)

The live MetaRealm and operations console — a 3D digital twin of the Salacia port:

**[https://aca-ama-frontend.victoriouspond-ae9c07d8.southeastasia.azurecontainerapps.io](https://aca-ama-frontend.victoriouspond-ae9c07d8.southeastasia.azurecontainerapps.io)**

> Hosted on Azure Container Apps in Southeast Asia.

### Microsoft Teams chatbot

Talk to the Fleet Market, Yard King, and Crane Auctioneer agents directly from Teams.

1. Download the manifest package: [src/frontend/ms-teams/salacia-teams-bot.zip](src/frontend/ms-teams/salacia-teams-bot.zip)
2. In Microsoft Teams, open **Apps → Manage your apps → Upload an app → Upload a custom app**.
3. Select the downloaded `salacia-teams-bot.zip`.
4. Add the **Salacia** bot to a personal chat, group chat, or channel.

Try messages like:
- *"What's the status of crane berth-1-2?"*
- *"Where is container SALA 442109 4?"*
- *"The vessel for berth 4 is running late."* — triggers a live fleet auction with human approval via an adaptive card.

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────┐
│                         SALACIA HIVE                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  MetaRealm 3D    │  │   Teams Bot      │  │  Edge Agents  │  │
│  │  (React + R3F)   │  │   (Bot Framework)│  │  (Cranes,AGV) │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │  WebSocket          │  /api/messages     │          │
│           └──────────┬──────────┴────────────────────┘          │
│                      ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Salacia Gateway (Express + WS)               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                      │                                          │
│           ┌──────────┴──────────────────────────┐               │
│           ▼                                     ▼               │
│  ┌─────────────────┐                  ┌──────────────────────┐  │
│  │  Cloud Agents   │ ◄── LangGraph ──►│  Azure OpenAI (GPT)  │  │
│  │  • Apex Planner │                  │  + Azure Identity     │  │
│  │  • Crane Auct.  │                  └──────────────────────┘  │
│  │  • Fleet Market │                                            │
│  │  • Yard King    │                  ┌──────────────────────┐  │
│  │  • Oracle       │ ──── traces ───► │  App Insights / OTel │  │
│  └─────────────────┘                  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Tech stack**

- **Frontend** — React 19, Vite 6, MUI, Three.js, React Three Fiber, TailwindCSS
- **Backend** — Node 24, TypeScript, Express, LangGraph + LangChain, `botbuilder` for Teams
- **AI** — Azure OpenAI via `@langchain/openai` (Entra ID auth, no keys)
- **Observability** — OpenTelemetry + Azure Monitor + Traceloop
- **Hosting** — Azure Container Apps (frontend & backend) + Azure Bot Service

---

## Repository structure

```
src/
├── backend/                        Node + LangGraph agent runtime
│   ├── src/
│   │   ├── index.ts                Express bootstrap (HTTP + WS + /api/messages)
│   │   ├── bot.ts                  Teams bot — intent classifier + auction trigger
│   │   ├── websocket.ts            Live event stream to the MetaRealm
│   │   ├── tracing.ts              OTel + Azure Monitor instrumentation
│   │   └── agents/
│   │       ├── crane-auctioneer/   Quay crane bidding agent
│   │       ├── fleet-market/       AGV + stacker auction (LangGraph)
│   │       └── yard-king/          Yard allocation strategist
│   └── Dockerfile
├── frontend/
│   ├── src/                        Vite + React MetaRealm (3D digital twin)
│   ├── ms-teams/                   Teams bot manifest + icons + zip
│   └── blender/                    Source .blend files for the 3D port assets
docs/
└── slides/                         Architecture, flow, and design briefs
```

<br />
---

## Local development

### Prerequisites

- **Node.js 24+** and npm
- An **Azure OpenAI** deployment (the backend uses `DefaultAzureCredential`, so `az login` is enough locally)
- For the Teams bot: an **Azure Bot Service** registration + [`ngrok`](https://ngrok.com/) for the message endpoint

### Backend

```bash
cd src/backend
npm install

export AZURE_OPENAI_BASE_PATH="https://<your-resource>.openai.azure.com/openai/deployments"
export AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o"
export AZURE_OPENAI_API_VERSION="2024-08-01-preview"

npm run dev                 # tsx watch on http://localhost:3978
```

Endpoints:

- `GET  /api/health` — health probe
- `POST /api/messages` — Bot Framework endpoint (point Azure Bot Service here via ngrok)
- `WS   /ws` — live stream consumed by the MetaRealm UI

### Frontend

```bash
cd src/frontend/src
npm install

export VITE_WS_URL="ws://localhost:3978/ws"

npm run dev                 # http://localhost:5173
```

A VS Code task `npm: run frontend` is also configured.

### Teams bot (local)

1. Start the backend.
2. Run the VS Code task **`start ngrok`** (or `ngrok http 3978`).
3. In Azure Bot Service, set the messaging endpoint to `https://<ngrok-id>.ngrok.io/api/messages`.
4. Re-zip the manifest if needed via the **`zip teams manifest`** task, then sideload it in Teams.

---

## Deployment

The repo ships with two GitHub Actions workflows under `.github/workflows/`:

- `deploy-backend.yml` — builds the backend image and rolls it out to Azure Container Apps.
- `deploy-frontend.yml` — builds the Vite SPA (with `VITE_WS_URL` baked in) and deploys it to Azure Container Apps fronted by Nginx.

---

## Status & disclaimer

Salacia is a **research / demo project**. The agents weave creative, fictional narratives around mock telemetry — none of this software is intended to operate a real container terminal. See agent system prompts under `src/backend/src/agents/**/*.md` for the storytelling personas.

## License

See [LICENSE](LICENSE).
