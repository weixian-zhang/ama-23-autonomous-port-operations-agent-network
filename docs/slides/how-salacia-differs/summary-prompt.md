

## tasks

create a mainstream TOS vs Salacia simple and concise comparison like before vs after in terms of 4 operations:
berth scheduling, crane scheduling, fleet management and yard management

Focus on the static rule based with simple math heuristic of mainstream TOS vs dynamic real-time cognitive method od Salacia to handle port disruption


mainstream TOS

• berth planning
    ○ Plans 1 vessel at a time in TOS with built-in rule-engine
    ○ uses traditional rule-engine with rules e.g: 
        § Berth water depth vs. vessel draft
        § by cargo type 
        IF vessel.draft <= berth.depth - 0.5 AND vessel.LengthOverall <= berth.length - 15 AND berth.cranes >= vessel.requested_cranes THEN assign berth
        
• crane scheduling
    ○ creates crane-to-bay plan in TOS
        ○ TOS combines rule-engine with math optimization technique `mixed-integer linear programming` to select suitable cranes, It is an math optimization technique to get the best possible result within a budget and a set of rules
    ○ using deterministic rule engine and follows fixed sequencing logics to assign crane jobs to cranes for operators to perform load and unload
    
• Fleet management
    ○ preconfigured Route & Traffic Rules:
        • Allowed paths
        • Speed limits by zone
        • No-go zones (people, trucks, maintenance)
        • more…
        
    ○ FMS uses preconfigured Route & Traffic Rules + Nearest Available Heuristic to select AGV and stackers to assign transport job to.
    heuristic e.g: nearest AGV, idling AGV or match equipment capability
    
• Yard management
    ○ creates or updates Yard Allocation Plan based on Rule-Based Slotting + Simple Math Heuristics 
        • Vessel / voyage → same vessel containers go to same yard zone
        • Port of destination → pre-sort for outbound loading sequence
        • Size → 20ft and 40ft in separate rows/bays
        • math heuristic
            § Avoid blocks over threshold >85% full


Salacia Terminal OS


Berth planner Agents
        Apex Planner Agent
        Role: The Master Conductor
        label: Implements Supervisor design pattern - Orchestrates the Berth Planner, Crane Auctioneer, and Yard King agents to produce and continuously refine vessel-to-berth, crane-to-bay, and yard allocation plans.
        
            
        Berth Planner Agent
        Role: The Docking Coordinator.
        * Uses Oracle Agent arrival predictions to dynamically adjust vessel‑to‑berth schedules, optimizing dock utilization with real‑time data.
        * chat agent answer vessel ETA and berth plan

        Vessel Arrival Oracle Agent (subagent of Berth Planner Agent)
        Role: The Predictive Strategist.
        label: Combines XGBoost ML for ETA forecasting with GenAI to reason over external factors (e.g., weather warnings or captain risk profiles).

Crane scheduling with:
Crane Auctioneer Agent
            * Uses a Job-Auction-Cognitive Bidding Pattern to auction-bid-award jobs to cranes.
            * chat agent answer crane assignment and move status
     
Fleet management with:
Fleet Market Agent
 Role: The Logistics Broker.
            * Uses a Job-Auction-Cognitive Bidding Pattern to auction transport jobs to AGV and stackers
            * syncs with MetaRealm for AGV and stackers position and state.
            * chat agent answer query on routes, AGV and stackers location and status

Yard management
Yard King agent
 Role: The Spatial Strategist.
        * creates the Yard Allocation Plan by simulating "what-if" scenarios based on stowage data and yard maps.
        * chat agent answers yard position query