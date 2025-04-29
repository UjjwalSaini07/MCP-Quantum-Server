import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import dotenv from "dotenv";
import { checkRepoExists, createRepository, manageRepository, } from "./main_MCP.tool.js";

dotenv.config();

const app = express();
app.use(express.json());

// MCP TOOL SERVER
const server = new McpServer({
  name: "github-repo-server",
  version: "1.0.0",
});

// Register MCP tools (message-based usage like /sse)
server.tool(
  "checkRepoExists",
  "Check if a GitHub repository exists",
  { repoName: z.string() },
  async ({ repoName }) => {
    const exists = await checkRepoExists(repoName);
    return {
      content: [
        {
          type: "text",
          text: exists
            ? `Repository "${repoName}" exists.`
            : `Repository "${repoName}" does not exist.`,
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
  async ({ repoName, description }) => {
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

// ============================
// REST API ENDPOINTS FOR CLIENT
// ============================

// Check if repository exists
app.post("/tool/checkRepoExists", async (req, res) => {
  try {
    const { repoName } = req.body;
    const exists = await checkRepoExists(repoName);
    res.json({
      content: [
        {
          type: "text",
          text: exists
            ? `Repository "${repoName}" exists.`
            : `Repository "${repoName}" does not exist.`,
        },
      ],
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Create repository
app.post("/tool/createRepository", async (req, res) => {
  try {
    const { repoName, description } = req.body;
    const repoUrl = await createRepository(repoName, description || "");
    res.json({
      content: [
        {
          type: "text",
          text: `Repository created at: ${repoUrl}`,
        },
      ],
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Optional: combined manage endpoint
app.post("/tool/manageRepository", async (req, res) => {
  try {
    const { repoName, description } = req.body;
    const message = await manageRepository(repoName, description || "");
    res.json({ message });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// SERVER-SENT EVENTS (MCP)
const transports = {};

app.get("/sse", async (_, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

// MAIN SERVER START
app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});
