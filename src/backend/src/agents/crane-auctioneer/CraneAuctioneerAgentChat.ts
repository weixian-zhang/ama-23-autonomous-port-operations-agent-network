import { AzureChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages'
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SYSTEM_PROMPT = readFileSync(join(__dirname, 'crane-auctioneer-chat-system-prompt.md'), 'utf-8')

const credential = new DefaultAzureCredential()
const azureADTokenProvider = getBearerTokenProvider(credential, 'https://cognitiveservices.azure.com/.default')

export class CraneAuctioneerAgentChat {
  private model: AzureChatOpenAI
  private history: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT)]

  constructor() {
    this.model = new AzureChatOpenAI({
      azureOpenAIBasePath: process.env.AZURE_OPENAI_BASE_PATH ?? '',
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? '',
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '',
      azureADTokenProvider,
      temperature: 0.7,
    })
  }

  async chat(userMessage: string): Promise<string> {
    this.history.push(new HumanMessage(userMessage))

    const response = await this.model.invoke(this.history)
    this.history.push(response)

    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)
  }
}
