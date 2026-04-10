
## style

color: can be colorful according to the realistic physical object doesn't have to be dull colored
Style: The style is a clean, technical digital drawing with a futuristic sci-fi aesthetic. Labels with text in futuristic, semi-transparent UI callout boxes. 8k resolution, architectural concept art style.
Atmosphere: Scientific, clinical, and innovative.
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile.
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.


## task

* Generate infographics for `systems use in port`.

## systems used in port

Terminal Operating System (TOS + Core Modules)
TOS is the central brain of the port terminal, like an ERP system to port
It coordinates all container movements from vessel → yard → gate
4 core operational modules inside the TOS:
* Berth Planning
  * Uses vessel ETA and berth availability
  8 Plans where and when each vessel berths
* Crane Scheduling
  * Assigns quay cranes to vessels
  * assigns crane jobs to crane operators on terminal screen
* Fleet Management
  * tracks and dispatch AGVs, terminal tractors, reach stackers
  * Assigns transport jobs between quay ↔ yard
* Yard Management
  * Decides where each container is stored in yard
  * Ensures yard space, stacking rules, and retrieval sequence
 
Port Community System
* a public facing ePortal that lets shipping lines submits "paper work" e.g: vessel and cargo registration
* vessel submit Vessel Bay Plan (container stowage map) to port
* get digital custom permit 
* billing and invoicing
 
system relationships between PCS and TOS:
* PCS forwards Vessel Bay Plan to integrated TOS
* Vessels broadcast Automatic Identification System (AIS) data containing Vessel Arrival ETA to TOS. example AIS data:
    Vessel Name: OCEAN TRADER
    Status: Under Way 
    Destination: SINGAPORE 
    ETA: 04-12 14:30 UTC 
    Latitude: 1.29 N 
    Longitude: 103.85 E

* TOS updates subsystems with Vessel Bay Plan and vessel arrival ETA
Berth planner
Crane scheduling