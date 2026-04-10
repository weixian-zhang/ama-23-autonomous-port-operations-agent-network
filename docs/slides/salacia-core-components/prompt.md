## style

color: can be colorful according to the realistic physical object doesn't have to be dull colored
Style: The style is a clean, technical digital drawing with a futuristic sci-fi aesthetic. Labels with text in futuristic, semi-transparent UI callout boxes. 8k resolution, architectural concept art style.
Atmosphere: Scientific, clinical, and innovative.
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile.
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.

## context

Salacia is a fake next generation AI powered terminal OS used in port

## tasks

* Generate infographics for `core components`
* Do not include title 
* Create futuristic and innovative graphics to best visually describe each core component
* Special focus on metarealm 3d virtual world focus located in the center that connects everything 

## core components

Salacia MetaRealm A live 3D digital twin VR environment of the entire port—including vessels, yard, equipment, and personnel.

Agent Gateway The communication bridge. It connects external messaging (like MS Teams) and the Salacia HiveUI to the backend AI agents, utilizing WebSocket APIs and the MCP Server.

Salacia Cloud Agents (The Intelligence Layer)
    • 🚢 Berth Planner Agent: Automatically assigns vessels to berths and creates scheduling plans. Fully queryable via chat.
    • 🏗️ Crane Auctioneer Agent: Dynamically allocates cranes to vessels and assigns specific container-move jobs to operators. Fully queryable via chat.
    • 🚛 Fleet Market: An internal marketplace that dispatches AGVs and reach stackers. Supports chat queries for real-time positioning, status, and manual dispatch overrides.
    • 📦 Yard King: Optimizes yard storage by creating allocation plans and assigning precise drop-off locations to vehicles. Fully queryable via chat.
    • 🔧 Metallic Queen: Monitors the real-time health and telemetry of all cranes, AGVs, and reachers. Fully queryable via chat.

Salacia Edge Agents
    • Crane Edge Agent
    • AGV Edge Agent
    • Stack Reacher Edge Agent

Edge Event Mesh A high-speed message hub enabling low-latency, event-driven communication between Cloud Agents and Edge Agents.

Salacia Nomad A mobile/tablet app (iOS & Android) for field operators. It provides a read-only digital twin view of the MetaRealm 3D Map and key operational modules (Berth, Crane, Fleet, Yard, Metallic Queen).

🖥️ Salacia Hive The centralized Web UI command center for managing the entire Salacia platform.

💬 MS Teams → Agent Gateway Enables human operators to use MS Teams chat to interact directly with agents, such as instructing the Fleet Market to dispatch equipment or handle a breakdown.

🤖 MCP Server (Model Context Protocol) Connects users' AI assistants to port data. It translates requests to help the AI understand equipment breakdowns and health status.

🔌 IoT Device Management (via Azure IoT Hub) Handles the secure onboarding, authentication, and patching of all hardware control devices (Cranes, AGVs, Reachers).

👁️ Computer Vision Object Detection - smart camera mounted in quay crane pod connected to Crane Edge Agent to monitor crane operator falling asleep
