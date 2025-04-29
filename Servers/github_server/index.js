import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import dotenv from "dotenv";
import { checkRepoExists, createRepository } from "./main_MCP.tool.js";

dotenv.config();

// Initialize MCP Server
const server = new McpServer({
  name: "github-repo-server",
  version: "1.0.0",
});

// Express app setup
const app = express();

// Define tools
server.tool(
  "checkRepoExists",
  "Check if a GitHub repository exists",
  {
    repoName: z.string(),
  },
  async (arg) => {
    const { repoName } = arg;
    const exists = await checkRepoExists(repoName);
    return {
      content: [
        {
          type: "text",
          text: exists
            ? `The repository "${repoName}" exists.`
            : `The repository "${repoName}" does not exist.`,
        },
      ],
    };
  }
);

server.tool(
  "createRepository",
  "Create a new GitHub repository",
  {
    repoName: z.string(),
    description: z.string().optional(),
  },
  async (arg) => {
    const { repoName, description } = arg;
    const repoUrl = await createRepository(repoName, description || "");
    return {
      content: [
        {
          type: "text",
          text: `Repository created at: ${repoUrl}`,
        },
      ],
    };
  }
);

// Manage server-sent events (SSE)
const transports = {};

app.get("/sse", async (_, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

// Handle messages
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

// Start the server
app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});
