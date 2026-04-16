

## style guide

Style: The style is a clean, technical digital drawing with a AI agentic style. Labels with text in futuristic, semi-transparent UI callout boxes.
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

    art and science of curating what goes into context window:
    * system prompt
    * tools
    * tool result
    * skills
    * grounding doc
    * memory file
    * user text


* Memory
    * location - /.salacia/memory/
    * Memory.md - long-term memory. Durable facts and decisions.
    * memory/dd-mm-yyyy.md - daily logs of activities
    * session/user-id.md - chat logs, agent should remember conversations 30 mins ago

* Actions
    - filesystem - has access to local filesystem
    - shell - a sandbox shell to execute any bash command


* Tools

    * weather live feed tool
    * Guardian telemetry logging tool
    * memory tools
    * write memory
    * search memory


* RAG - semantic search of grounding data with Azure AI Search


* Observability
    * agent tracing with OpenTelemetry to Microsoft Foundry 
    * error logging to Azure Application Insights
  


