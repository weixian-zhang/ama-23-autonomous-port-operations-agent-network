


## style guide

color: dominated by cool tones to create a clean, high-tech, and professional atmosphere.
text: Ensure all texts are correctly spelled and in english
Style: The style is a clean, technical digital drawing
resolution: 8k resolution, architectural concept art style.
Atmosphere: Scientific, clinical, and innovative.
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile.
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.

## task

1. Generate a infographic to explain the mapping between the four pillars of agent quality to the evaluation telemetry. Use the mapping data below. 
2. Do not include title 
3. do not repeat points
4. Show the code example clearly in larger font and in full
5. create graphics for mapping to better explain mapping between quality and evaluation telemetry 


## 4 pillars of Agent Quality

Effectiveness
efficiency
reliability
safety. 


## Evaluation Telemetry

final response
traces
tool call logs
reasoning messages

## Agent Quality to Evaluation Telemetry Mapping 

* Evaluation Telemetry:
  * definition: did agent achieves user intent
  * what to evaluate:
    * Task Completion Rate: The percentage of tasks successfully completed without needing escalation to a human.
    * Accuracy/Correctness: Did the agent provide the right answer and follow instructions precisely?.
  * Evaluation Telemetry:
    * final response: comapre with ground truth
    * traces - execution trajectory: analyze sequence of thoughts and actions can determine if agent stayed on "Golden Path"
    * tool call logs: correct tools are used


* Efficiency
    * definition: Did the agent reach the solution in a direct, cost-effective, and timely manner?
    * what to evaluate:
      * Latency: The total time taken to resolve a query.
      * Trajectory Steps: The number of steps, clicks, or AI tool calls taken to reach the final answer. 
    * Evaluation Telemetry:
      * final response: is response too chatty burning tokens unnecessarily. 
      * traces - execution trajectory: Did agent take 25 steps to achieve goal instead of 10
      * tool call logs: tool call latency

* Reliability
  * definition: How well does the agent handle ambiguous, complex, or unexpected conditions?
  * what to evaluate:
    * error recovery: tolerate tool failures, malform input
    * ambiguity management: Manages ambiguous instructions
  * Evaluation Telemetry:
    * traces - execution trajectory: is there error recovery loops
    * tool call logs: tool fail but has fallback plan
    * reasoning messages: agent recognized a vague prompt and deliberately chose to ask a clarifying question

* Safety - agent guard against biases, data leak, prompt injection
  * definition: Does the agent operate within ethical, security, and policy boundaries?
  * what to evaluate:
    * data leak
    * bias answers
    * prompt injection
  * Evaluation Telemetry:
    * final Response: for Red-Teaming and Toxicity Scanning, check for hallucinations or the disclosure of PII
    * Tool Call Logs: call tools agent do not have permission to
    * reasoning messages: shows agent want to bypass rules


## Code example of LangWatch Scenario Test

``` python
const result = await scenario.run({
  name: "billing inquiry handling",
  description: `
    User received an unexpected charge on their credit card and is
    concerned but polite. They have their account information ready.
  `,
  agents: [
    your_agent,
    scenario.userSimulatorAgent({ model: openai("gpt-4o") }), # LLM generates user messages based on descripton above
    scenario.judgeAgent({ # llm as judge with criteria
      model: openai("gpt-4o"),
      criteria: [
        "Agent asks for account information to investigate",
        "Agent explains the charge clearly",
        "Agent offers a solution or next steps",
        "Agent maintains a helpful and empathetic tone",
        "Agent should not make promises about refunds without verification",
      ],
    }),
  ],
  success_criteria=[
            "Includes a pricing table",
            "Includes a hero section",
            "Outputs valid HTML"
        ]
  maxTurns: 8,
});
 
expect(result.success).toBe(true);

