import readline from "readline/promises";
import dotenv from "dotenv";
import chalk from "chalk";
import { GoogleGenAI, type FunctionDeclaration, type FunctionCall, } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

dotenv.config();

interface Tool {
  name: string;
  description: string | undefined;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
    default?: any;
  };
}

interface ChatMessage {
  role: "user" | "model";
  parts: Array<{
    text: string;
    type: string;
    functionCall?: FunctionCall;
  }>;
}

interface ToolResult {
  content: Array<{
    text: string;
  }>;
}

let tools: Tool[] = [];
if (!process.env.GEMINI_API_KEY) {
  console.error(chalk.red.bold("Error: GEMINI_API_KEY environment variable is not set"));
  throw new Error("GEMINI_API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const mcpClient = new Client({
  name: "example-client",
  version: "1.0.0",
});

const chatHistory: ChatMessage[] = [];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

mcpClient
  .connect(new SSEClientTransport(new URL("http://localhost:3001/sse")))
  .then(async () => {
    console.clear();
    console.log(chalk.green.bold('\n====================================='));
    console.log(chalk.green.bold('✅ Connected to MCP server : ') + chalk.cyan.bold('Online'));
    console.log(chalk.green.bold('=====================================\n'));

    tools = (await mcpClient.listTools()).tools.map((tool) => {
      if (!tool.inputSchema.properties) {
        console.error(chalk.red.bold(`Error: Tool ${tool.name} has no properties defined`));
        throw new Error(`Tool ${tool.name} has no properties defined`);
      }
      const required = Array.isArray(tool.inputSchema.required)
        ? tool.inputSchema.required
        : [];
      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: tool.inputSchema.type,
          properties: tool.inputSchema.properties,
          required,
        },
      };
    });

    console.log(chalk.cyan.bold(`Loaded ${tools.length} tools successfully.\n`));
    chatLoop();
  });

async function chatLoop(toolCall?: FunctionCall): Promise<void> {
  if (toolCall && toolCall.name) {
    console.log(chalk.blue.bold(`\n🔧 Calling tool: ${toolCall.name}`));

    chatHistory.push({
      role: "model",
      parts: [
        {
          text: `Calling tool ${toolCall.name}`,
          type: "text",
        },
      ],
    });

    const toolResult = (await mcpClient.callTool({
      name: toolCall.name,
      arguments: toolCall.args,
    })) as ToolResult;

    if (toolResult.content[0]?.text) {
      console.log(chalk.yellow(`\nTool result: ${toolResult.content[0].text}`));
      chatHistory.push({
        role: "user",
        parts: [
          {
            text: `Tool result: ${toolResult.content[0].text}`,
            type: "text",
          },
        ],
      });
    }
  } else {
    const question = await rl.question(chalk.magenta("You: "));
    chatHistory.push({
      role: "user",
      parts: [
        {
          text: question,
          type: "text",
        },
      ],
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: chatHistory,
    config: {
      tools: [
        {
          functionDeclarations: tools as FunctionDeclaration[],
        },
      ],
    },
  });

  if (!response.candidates?.length) {
    console.error(chalk.red.bold("Error: No candidates in response"));
    return chatLoop();
  }

  const firstCandidate = response.candidates[0];
  if (!firstCandidate?.content?.parts?.length) {
    console.error(chalk.red.bold("Error: No content or parts in first candidate"));
    return chatLoop();
  }

  const functionCall = firstCandidate.content.parts[0]?.functionCall ?? null;
  const responseText = firstCandidate.content.parts[0]?.text ?? "";

  if (functionCall) {
    return chatLoop(functionCall);
  }

  chatHistory.push({
    role: "model",
    parts: [
      {
        text: responseText,
        type: "text",
      },
    ],
  });

  console.log(chalk.greenBright(`AI: ${responseText}`));

  chatLoop();
}
