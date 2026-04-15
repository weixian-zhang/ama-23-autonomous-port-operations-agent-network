
## style guide

color: dominated by cool tones to create a "clean," high-tech, and professional atmosphere.
High-Contrast Accents: To prevent the image from looking flat, vibrant "pop" colors.
Style: The style is a clean, technical digital drawing with a futuristic sci-fi aesthetic. Labels with text in futuristic, semi-transparent UI callout boxes.
resolution: 8k resolution, architectural concept art style.
Atmosphere: Scientific, clinical, and innovative.
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile.
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.

## context

Salacia is a fake next generation AI powered terminal OS used in port. Below contains core components of the system

## tasks

* Generate infographics for `core components`. Ensure each core component has a graphic to visually describe component
* Do not include title, and the words `frontend` and `backend`
* Create futuristic and innovative graphics to best visually describe each core component
* Special focus on metarealm 3d virtual world focus located in the center that connects everything 
* Separation between front end and back end have section of space between them
* create AI Agent graphics for each cloud agents

## core components


frontend
 * Salacia Edge Agents
    • Crane Edge Agent
    • AGV Edge Agent
    • Stack Reacher Edge Agent

 * Salacia Nomad A mobile/tablet app (iOS & Android) for field operators. It provides a read-only digital twin view of the MetaRealm 3D Map and key operational modules (Berth, Crane, Fleet, Yard, Metallic Queen).

 * MCP clients - enable external AI agents to use Salacia as AI tools

 * Teams chatbots - human operators uses Teams chat with Cloud Agents.


Salacia Gateway - The core communication channel between frontend and backend components.


Backend components

* Salacia MetaRealm A live 3D digital twin VR environment of the entire port—including vessels, yard, equipment, and personnel.

* Salacia Cloud Agents (The Intelligence Layer)
    * Berth Planner Agent: Automatically assigns vessels to berths and creates scheduling plans. Fully queryable via chat.
        * Vessel Arrival Oracle Agent - ombines XGBoost predictions of historical vessel arrival data with live weather feeds to accurately predicts vessel arrtival time 
    * Crane Auctioneer Agent: Dynamically allocates cranes to vessels and assigns specific container-move jobs to operators. Fully queryable via chat.
    * Fleet Market: An internal marketplace that dispatches AGVs and reach stackers. Supports chat queries for real-time positioning, status, and manual dispatch overrides.
    * Yard King: Optimizes yard storage by creating allocation plans and assigning precise drop-off locations to vehicles. Fully queryable via chat.
    * Guardian: Monitors the real-time health and telemetry of all cranes, AGVs, and reachers. Fully queryable via chat.

 * Services
    * Salacia Wisdom - A agent skills hub that equips Cloud and Edge Agents with domain-specific workflows to handle specialized tasks.
        * skills e.g:
            * Edge Agent can download new agent skill to manage new vehicle telemetry and features
            * Metallic Queen download new agent skill to monitor new vehicle type
     * Salacia MCP Server - expose Salacia features as AI tools to external AI agents
     * Alert microservice - Guardian sends alerts to Teams on vehicle breakdown
     * Human-Behavior Detection microservice - detects crane operator 
     TOS Adapter microservice - interfaces with existing Terminal OS


 * Edge Event Mesh A high-speed message hub enabling low-latency, event-driven communication between Cloud Agents and Edge Agents.



 * IoT Device Management (via Azure IoT Hub) Handles the secure onboarding, authentication, and patching of all hardware control devices (Cranes, AGVs, Reachers).

 * Computer Vision Object Detection - smart camera mounted in quay crane pod connected to Crane Edge Agent to monitor crane operator falling asleep
