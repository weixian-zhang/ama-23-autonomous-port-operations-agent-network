

## style guide

color: dominated by cool tones to create a "clean," high-tech, and professional atmosphere.
Style: The style is a clean, technical digital drawing with a futuristic sci-fi aesthetic. Labels with text in futuristic, semi-transparent UI callout boxes.
resolution: 8k resolution, architectural concept art style.
Atmosphere: Scientific, clinical, and innovative.
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile.
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.

## context

Salacia is an imaginery AI powered terminal OS used in port.
Salacia Cloud agents are GenAI Agents and are part of Salacia system.
Use attached Image containing software architecture diagram of Salacia Cloud Agents to create infographics
communicatio between cloud agents are using ACP - Agent Communication Protocol.

## tasks

* use file `infographic-style` as the style guide
* Generate infographics workflow diagram of how Salacia edge agents and cloud agents work together
* put focus into saying edge and cloud agents performs Job Auction Cognitive Bidding but do not block view of any agents.
can be strong but not big that will block agents
* each core component has a graphic to visually describe component. free to replace existing icon in diagram
* include `cloud and edge agents description` into agents as description. free to shorten description if causing infographics to be distorted
* Do not include title 


## cloud and edge agents description

cloud agents

    planner agents

        Apex Planner Agent
        Role: The Master Conductor
            * Function: Implements the Supervisor design pattern - Orchestrates the Berth Planner, Crane Auctioneer, and Yard King agents to produce and continuously refine vessel-to-berth, crane-to-bay, and yard allocation plans.
            * Impact: One command hub that keeps berth, crane, and yard plans in sync, from vessel arrival to final container placement.
        
            
        Berth Planner Agent
        Role: The Docking Coordinator.
            * Function: Consults the Oracle Agent for arrival certainties to dynamically create or adjust vessel-to-berth schedules.
            * Impact: Ensures optimal dock utilization based on real-time intelligence.

            Vessel Arrival Oracle Agent (subagent of Berth Planner Agent)
            Role: The Predictive Strategist.
            * Intelligence: Combines XGBoost ML for ETA forecasting with GenAI to reason over external factors (e.g., weather warnings or captain risk profiles).
            * Impact: Refines raw data into high-confidence, context-aware arrival predictions.

        planner agent workflow
        Apex Planner planner coordinator of vessel-to-berth plan, crane-to-bay plan and yard alocation plans
        1. vessel-to-berth plan: Apex Planner -> Berth Planner -> Vessel Arrival Oracle Agent
    
    Container-Load/Unload Operations Agent
        Crane Auctioneer Agent
            1. when unloading container, Crane Auctioneer request AGV from Fleet Market.  Uses a Cognitive Bidding Pattern to auction jobs to cranes.
            * Optimization: Monitors container-move telemetry; if performance lags, it automatically auctions additional crane assignments to maintain the schedule.
            
        Fleet Market Agent
        Role: The Logistics Broker.
            * Operation: Awards transport jobs to AGVs and stackers via Market Auctioning.
            * Visibility: Syncs with MetaRealm for equipment telemetry and coordinates with the Yard King for precise container positioning.
            
        Yard King
        Role: The Spatial Strategist.
            * Function: Generates the Yard Allocation Plan by simulating "what-if" scenarios based on stowage data and yard maps.
            * Execution: Requests heavy machinery from the Fleet Market Agent to execute yard moves.
        
    Guardian
        * Monitoring: Tracks the mechanical health and status of all hardware (Cranes, AGVs, Stackers).
        * Alerting: Proactively broadcasts breakdown notifications and maintenance alerts to Teams channels.


edge agents

    Crane Edge Agent
        * Bidding: Competes for crane-to-bay and container-move jobs auctioned by the Crane Auctioneer.
        * Safety: Streams crane operator images to detect fatigue or distress in real time.
        * Telemetry: Continuously reports crane health and performance data to the Guardian cloud agent.
    
    AGV Edge Agent
        * Bidding: Competes for transport jobs auctioned by the Fleet Market Agent.
        * Telemetry: Continuously reports AGV health and performance data to the Guardian cloud agent.
        
    Stacker Edge Agent
        * Bidding: Competes for transport jobs auctioned by the Fleet Market Agent.
        * Telemetry: Continuously reports stacker health and performance data to the Guardian cloud agent.


<!-- ## style guide

color: dominated by cool tones to create a "clean," high-tech, and professional atmosphere.
Style: The style is a clean, technical digital drawing with a futuristic sci-fi aesthetic. Labels with text in futuristic, semi-transparent UI callout boxes.
resolution: 8k resolution, architectural concept art style.
Atmosphere: Scientific, clinical, and innovative.
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile.
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.

## context

Salacia is an imaginery AI powered terminal OS used in port.
Salacia Cloud agents are GenAI Agents and are part of Salacia system.
Use attached Image containing software architecture diagram of Salacia Cloud Agents to create infographics
communicatio between cloud agents are using ACP - Agent Communication Protocol.

## tasks

* use file `infographic-style` as the style guide
* Generate infographics for Salacia cloud agents software architecture diagram.
* Ensure diagram is easy to understand and sections are well separated.
* put focus into saying edge and cloud agents performs Job Auction Cognitive Bidding but do not block view of any agents.
can be strong but not big that will block agents
* each core component has a graphic to visually describe component. free to replace existing icon in diagram
* include `cloud and edge agents description` into agents as description. free to shorten description if causing infographics to be distorted
* Do not include title 


## cloud and edge agents description

cloud agents

    planner agents

        Apex Planner Agent
        Role: The Master Conductor
            * Function: Implements the Supervisor design pattern - Orchestrates the Berth Planner, Crane Auctioneer, and Yard King agents to produce and continuously refine vessel-to-berth, crane-to-bay, and yard allocation plans.
            * Impact: One command hub that keeps berth, crane, and yard plans in sync, from vessel arrival to final container placement.
        
            
        Berth Planner Agent
        Role: The Docking Coordinator.
            * Function: Consults the Oracle Agent for arrival certainties to dynamically create or adjust vessel-to-berth schedules.
            * Impact: Ensures optimal dock utilization based on real-time intelligence.

            Vessel Arrival Oracle Agent (subagent of Berth Planner Agent)
            Role: The Predictive Strategist.
            * Intelligence: Combines XGBoost ML for ETA forecasting with GenAI to reason over external factors (e.g., weather warnings or captain risk profiles).
            * Impact: Refines raw data into high-confidence, context-aware arrival predictions.
    
    Container-Move Operations Agent
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
        
    Guardian
        * Monitoring: Tracks the mechanical health and status of all hardware (Cranes, AGVs, Stackers).
        * Alerting: Proactively broadcasts breakdown notifications and maintenance alerts to Teams channels.


edge agents

    Crane Edge Agent
        * Bidding: Competes for crane-to-bay and container-move jobs auctioned by the Crane Auctioneer.
        * Safety: Streams crane operator images to detect fatigue or distress in real time.
        * Telemetry: Continuously reports crane health and performance data to the Guardian cloud agent.
    
    AGV Edge Agent
        * Bidding: Competes for transport jobs auctioned by the Fleet Market Agent.
        * Telemetry: Continuously reports AGV health and performance data to the Guardian cloud agent.
        
    Stacker Edge Agent
        * Bidding: Competes for transport jobs auctioned by the Fleet Market Agent.
        * Telemetry: Continuously reports stacker health and performance data to the Guardian cloud agent. -->