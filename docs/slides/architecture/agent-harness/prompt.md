

## style guide

Style: The style is a clean, technical digital drawing style
resolution: 8k resolution, architectural concept art style.
Atmosphere: Scientific, clinical, and innovative.
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile.
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.


## context

Salacia is an imaginery AI powered terminal OS used in port.
Salacia Cloud agents are designed and built using agent harness principles in `anatomy of Salacia agent`

## task

* create infographics of `anatomy of Salacia agent` and ensure `LLM model` is in the center of all other components 
* Do not include title 

## anatomy of Salacia agent

agent harness - the software infrastructure surrounding an LLM that enables it to interact with the real world, providing tools, memory, safety sandboxes, and loop control to manage long-running tasks

* LLM model (Microsoft Foundry)

    ReAct agent loop where agent:
    1. Reasoning - reason about action to take based on tool result
    2. Action - pick a tool or skill to execute 
    3. Observe - tool result
    4. backs to Reasoning


*Skills (loaded from Salacia Wisdom)

    Traffic Routing Skills
    * name: new danger zone
    description: new construction zone in port to avoid

    skills.md - for Fleet Market agent
    instructions.md - avoid 
    "geofence": { 
        "type": "Polygon", 
        "coordinates": [ 
    [1.2741, 103.8010], 
    [1.2745, 103.8015], 
    [1.2735, 103.8020], 
    [1.2741, 103.8010] ] }

    Equipment Skills
    * name: crane C134K model
    description: a new crane model with special stabilizers for very strong wind condition

    skills.md - for Fleet Market agent
    telemetry-schema.md: "telemetry": { "trolley_pos_meters": 42.5, 
    "hoist_height_meters": 12.2, 
    "gantry_pos_index": 104, 
    "spreader_state": "LOCKED", 
    "load_weight_tons": 28.4, 
    "wind_speed_mps": 8.5 
    },
    /scripts
    /assets


* Context Engineering

    art and science of assembly info in limited context window:
    * system prompt
    * user prompt
    * tools
    * skills - name and description
    * grounding docs
    * short-term episodic memory data
    * long-term user preference, tone, and more...


* Memory
  uses mem0 with Azure AI Search as vector store to store/query
  * short-term memory: past 2 days conversation
  * long-term memory: domain knowledge facts for RAG app, user facts, preferences and etc.


* Actions
    - filesystem - has access to local filesystem
    - shell - a sandbox shell to execute any bash commands
    - Node.js runtime - execute any node.js scripts


* Tools
    * weather live feed tool
    * Guardian telemetry logging tool
    * MetaRealm SQL query
    * MetaRealm write
    * more...


* Human in the loop - sends Action Card to Teams for human operators to manual override

* RAG - static RAG with fixed pipeline to search grounding data in Azure AI Search

* Observability
    * agent trace execution trajectory with OpenTelemetry to Aopp Insigts 
    * error logging to Azure Application Insights
  


