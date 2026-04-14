

## style guide

color: Primary Palette (Monochromatic Lean): The image is dominated by cool tones to create a "clean," high-tech, and professional atmosphere.
High-Contrast Accents: To prevent the image from looking flat, vibrant "pop" colors are used for containers orange, red, yellow, and green.
Style: The style is a clean, technical digital drawing with a futuristic sci-fi aesthetic. Labels with text in futuristic, semi-transparent UI callout boxes.
resolution: 8k resolution, architectural concept art style.
Atmosphere: Scientific, clinical, and innovative.
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile.
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.


## task

* Generate infographics for `systems use in port`.
* ensure TOS and its 4 modules are grouped as 1 group. And PCS is a separate group.
* ensure each modules is distinctively separated.
* Do not include `title`


## systems used in port

Terminal Operating System (TOS + Core Modules)
TOS is the central brain of the port terminal, like an ERP system for ports
4 core operational modules mainly using rule-based engine and proven math algorithm:

Terminal OS:
  * Berth Planning
    create vessel-to-berth plan - assign best-fit berth to vessel
      * combine vessel ETA against berth availability
      * and rule-engine that checks safety and compatibility (depth, length, cranes, cargo type)
        (IF vessel.draft <= berth.depth - 0.5 AND vessel.LengthOverall <= berth.length - 15 AND berth.cranes >= vessel.requested_cranes THEN assign berth)

  * Crane Scheduling
    * creates crane-to-bay plan - combines traditional rule-engine with math optimization technique `mixed-integer linear programming` to select suitable cranes to vessel
    * assigns crane jobs to crane operators on terminal screen

  * Fleet Management
    * plan AGV, stackers routes - uses preconfigured rules in rule engine to tracks and dispatch AGVs and reach stackers.
      rules e.g: allowed paths, Speed limits by zone, No-go zones (people, gas stations, maintenance, etc)
    * Assigns transport jobs between quay ↔ yard

  * Yard Management
    * creates or updates Yard Allocation Plan - Based on efficiency and safety rules in rule engine
      e.g: Heavy container goes to the bottom. 
      * assign yard block near berth
      * assign yard block near berth
      * Container leaving earliest, put on top
    * Decides where each container is stored in yard
    Ensures yard space, stacking rules, and retrieval sequence
 

Port Community System
* a public facing portal 
* shipping lines companies submits "paper work" e.g: vessel and cargo registration
* vessel submits vessel-bay-plan to TOS
* get digital custom permit 
* billing and invoicing
* more...
 
system relationships:
* PCS -> TOS (PCS sends Vessel Bay Plan to TOS)
* vessels -> TOS: vessels broadcast Automatic Identification System (AIS) data containing Vessel Arrival ETA to TOS. example AIS data:
    Vessel Name: OCEAN TRADER
    Status: Under Way 
    Destination: SINGAPORE 
    ETA: 04-12 14:30 UTC 
    Latitude: 1.29 N 
    Longitude: 103.85 E

