
## task

* Create an infographic of a flow chart cum software architecture diagram that shows the traffic flow between the cloud agents and the edge agent 
* Do not include title.

## style

color: can be colorful according to the realistic physical object doesn't have to be dull colored
Style: The style is a clean, technical digital drawing with a futuristic sci-fi aesthetic. Labels with text in futuristic, semi-transparent UI callout boxes. Soft, ambient lighting, high-tech efficient atmosphere, 8k resolution, architectural concept art style.
Atmosphere: Scientific, clinical, and innovative. 
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile. 
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.


## cloud agents

* Berth Planner
* Crane Auctioneer
* Fleet Market
* Yard King
* Metallic Queen

## edge agents

* Crane Edge Agent
* AGV (Automated Guided Vehicle) Edge Agent
* Stacker Edge Agent

## cloud an dedge agents relationship

• MetaRealm
    • Edge Agent -> Gateway -> MetaRealm API | sends digital twin data
    • Salacia Hive -> (websocket) Gateway ->  MetaRealm API  | fetch digital twin data to shown on 3D view
    • Salacia Nomad -> Gateway -> MetaRealm API | sends digital twin data
    

• Salacia Agents
    • Terminal OS API <- (get vessel arrival ETA) Grant Agent -> Berth Planner Agent  (activate Berth Planner Agent create vessel-to-berth plan based on vessel arrival ETA info)
    • Terminal OS API <- (get vessel arrival ETA) Grant Agent -> Crane Auctioneer Agent (activate Crane Auctioneer Agent create cranes-to-bay plan( when vessel at berth))

    • Berth Planner 
        • Grand Agent -> ACP -> Berth Planner ()
    
    • Crane Auctioneer
        • Crane Edge Agent -> Salacia Event Mesh -> Crane Auctioneer Agent -> AI Computer Vision API (sends crane operator video feeds to Crane Auctioneer Agent to detect operator falling asleep)
        • Crane Auctioneer Agent -> Salacia Event Mesh -> Crane Edge Agent (sound crane pod alarm if operator falling asleep)
        • Crane Edge Agent -> Salacia Event Mesh -> Crane Auctioneer Agent (bid for crane-to-bay assignment)
        • Crane Edge Agent -> Salacia Event Mesh -> Crane Auctioneer Agent (bid for container-move job qhen cranes load/unload containers from vessel)
        • Crane Auctioneer Agent -> Salacia Event Mesh -> Crane Edge Agent (award crane-to-berth assignment to winning crane who won bid)
        • Crane Auctioneer Agent -> Salacia Event Mesh -> Crane Edge Agent (award container-move job to crane who won bid)
        • Crane Auctioneer Agent -> Agent2Agent protocol -> Fleet Market Agent (request for AGV to berth to move containers to yard)
        • Crane Auctioneer Agent -> Agent2Agent protocol  -> Berth Planner Agent (if crane delay on container over, tell Berth Planner Agent to assign vessels to other berth)
        • Hive ->  Gateway -> Crane Auctioneer (chat query crane assignment info, crane health and container-move state and statistics)
        • Nomad->  Gateway -> Crane Auctioneer (chat query crane assignment info, crane health and container-move state and statistics)
        

    • Fleet Market
        • AGV Edge Agent -> Salacia Event Mesh -> Fleet Market Agent (bid for transport job)
        • Fleet Market Agent -> Salacia Event Mesh -> AGV Edge Agent (award transport job to winning AGV who won bid)
        • Reacher Edge Agent -> Salacia Event Mesh -> Fleet Market Agent (bid for stacking job)
        • Fleet Market Agent -> Salacia Event Mesh -> Reacher Edge Agent (award transport job to winning Reacher who won bid)
        • Fleet Market Agent  -> ACP -> Crane Auctioneer Agent (in rare multiple AGV/reacher failure, tell Crane Auctioneer to slow down container move)
        • Fleet Market Agent  -> ACP -> Berth Planner Agent (in rare multiple AGV/reacher failure, tell Berth Planner to delay berthing time of vessel)
        • Fleet Market -> ACP -> Yard King (get yard position)
        
    • Yard King
        • Grand Agent -> ACP -> Yard King (create yard allocation plan)
        * Fleet Market Agent -> ACP -> Yard King (get container yard postion before dispatching AGV and Stackers)
        • Hive ->  Gateway -> Yard King (chat query crane assignment info, crane health and container-move state and statistics)
        

    • Metallic Queen
        • Crane Edge Agent -> Salacia Event Mesh -> Metallic Queen (send health telemetry)
        • Stacker Edge Agent -> Salacia Event Mesh -> Metallic Queen (send health telemetry)
        • AGV Edge Agent -> Salacia Event Mesh -> Metallic Queen (send health telemetry)
        * Salacia Hive -> Salacia Gateway -> Metallic Queen (get equipment health status)
        * Salacia Nomad -> Salacia Gateway -> Metallic Queen (get equipment health status)
        * Metallic Queen -> Salacia Event Mesh -> Alert Microservice (sends Teams group message to equipment technician on equipment failure)
    


• Salacia Hive
    • Salacia Hive -> (web socket) Gateway ->  Berth Planner Agent (stream Berth Planner Agent reasoning and result)
    • Salacia Hive -> (web socket) Gateway ->  Crane Auctioneer Agent (stream Crane Auctioneer Agent reasoning and result)
    • Salacia Hive -> (web socket) Gateway ->  Fleet Market Agent (stream Fleet Market Agent reasoning and result)
    • Salacia Hive -> (web socket) Gateway ->  Yard King Agent (stream Yard King Agent reasoning and result)
    • Salacia Hive -> (web socket) Gateway ->  Metallic Queen Agent (stream Metallic QueenAgent reasoning and result)
    • Salacia Hive ->  (web socket) Gateway -> MetaRealm API (digital twin data)
        
• MS Teams client -> Salacia Gateway -> Fleet Market (fleet supervisor can chat with Fleet Market Agent to manually dispatch AGV)
