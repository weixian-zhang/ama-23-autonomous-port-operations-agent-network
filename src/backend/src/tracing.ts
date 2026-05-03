// OpenTelemetry tracing bootstrap for Azure AI Foundry.
//
// This file MUST be imported before any other module (especially
// `@langchain/openai`, `openai`, `express`, etc.) so that the OpenTelemetry
// instrumentation can patch them at require-time.
//
// Pipeline:
//   LangChain.js / Azure OpenAI calls
//     └─► Traceloop OpenLLMetry auto-instrumentation (gen_ai.* spans)
//           └─► Azure Monitor OpenTelemetry distro
//                 └─► Application Insights linked to the Foundry project
//                       └─► Foundry portal → Tracing tab

import { useAzureMonitor } from '@azure/monitor-opentelemetry'
import * as traceloop from '@traceloop/node-server-sdk'

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING

if (!connectionString) {
  console.warn(
    '[Tracing] APPLICATIONINSIGHTS_CONNECTION_STRING is not set. ' +
      'Telemetry will NOT be exported to Azure AI Foundry.',
  )
} else {
  // 1. Send OTel data to the App Insights resource linked to the Foundry project.
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString,
    },
  })

  // 2. Auto-instrument LangChain.js and the underlying OpenAI/Azure OpenAI
  //    SDK so each model/chain/tool invocation becomes a span with the
  //    GenAI semantic conventions Foundry renders (model, tokens, prompt,
  //    completion, etc.). Modules are auto-detected at require-time.
  traceloop.initialize({
    appName: 'salacia-backend',
    disableBatch: false,
    // Required so prompts and completions are captured on spans
    // and rendered in the Foundry Tracing tab.
    traceContent: true,
  })

  console.log('[Tracing] OpenTelemetry → Application Insights initialised.')
}
