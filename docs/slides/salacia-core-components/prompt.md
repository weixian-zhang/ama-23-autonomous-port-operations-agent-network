
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
* shorten description of component if necessary to squeeze into infographics
* Create futuristic and innovative graphics to best visually describe each core component
* Special focus on metarealm 3d virtual world focus located in the center that connects everything 
* Separation between front end and back end have section of space between them
* create AI Agent graphics for each cloud agents

## core components


frontend
 * Salacia Edge Agents
        Crane Edge Agent
            ○ Bidding: Competes for crane-to-bay and container-move jobs auctioned by the Crane Auctioneer.
            ○ Safety: Streams crane operator images to detect fatigue or distress in real time.
            ○ Telemetry: Continuously reports crane health and performance data to the Health Guardian.
        
        AGV Edge Agent
            ○ Bidding: Competes for transport jobs auctioned by the Fleet Market Agent.
            ○ Telemetry: Continuously reports AGV health and performance data to the Health Guardian.
            
        Stacker Edge Agent
            ○ Bidding: Competes for transport jobs auctioned by the Fleet Market Agent.
    Telemetry: Continuously reports stacker health and performance data to the Health Guardian.

 * Salacia Nomad A mobile/tablet app (iOS & Android) for field operators. It provides a read-only digital twin view of the MetaRealm 3D Map and key operational modules (Berth, Crane, Fleet, Yard, Metallic Queen).

 * MCP clients - enable external AI agents to use Salacia as AI tools

 * Teams chatbots - human operators uses Teams chat with Cloud Agents.


Salacia Gateway - The core communication channel between frontend and backend components.


Backend components

* Salacia MetaRealm A live 3D digital twin VR environment of the entire port—including vessels, yard, equipment, and personnel.

* Salacia Cloud Agents
        Apex Planner Agent
        Role: The Master Conductor
            * Function: Implements the Supervisor design pattern - Orchestrates the Berth Planner, Crane Auctioneer, and Yard King agents to produce and continuously refine vessel-to-berth, crane-to-bay, and yard allocation plans.
            * Impact: One command hub that keeps berth, crane, and yard plans in sync, from vessel arrival to final container placement.
        
        Vessel Arrival Oracle Agent
        Role: The Predictive Strategist.
            * Intelligence: Combines XGBoost ML for ETA forecasting with GenAI to reason over external factors (e.g., weather warnings or captain risk profiles).
            * Impact: Refines raw data into high-confidence, context-aware arrival predictions.
            
        Berth Planner Agent
        Role: The Docking Coordinator.
            * Function: Consults the Oracle Agent for arrival certainties to dynamically create or adjust vessel-to-berth schedules.
            * Impact: Ensures optimal dock utilization based on real-time intelligence.
            
        Crane Auctioneer Agent
            * Workflow: Uses a Cognitive Bidding Pattern to auction jobs to cranes.
            * Optimization: Monitors container-move telemetry; if performance lags, it automatically auctions additional crane assignments to maintain the schedule.
            
        Fleet Market Agent
        Role: The Logistics Broker.
            * Operation: Awards transport jobs to AGVs and stackers via Market Auctioning.
            * Visibility: Syncs with MetaRealm for equipment telemetry and coordinates with the Yard King for precise container positioning.
            
        Yard King
        Role: The Spatial Strategist.
            * Function: Generates the Yard Allocation Plan by simulating "what-if" scenarios based on stowage data and yard maps.
            * Execution: Requests heavy machinery from the Fleet Market Agent to execute yard moves.
            
        Health Guardian
            * Monitoring: Tracks the mechanical health and status of all hardware (Cranes, AGVs, Stackers).
            * Alerting: Proactively broadcasts breakdown notifications and maintenance alerts to Teams channels

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
