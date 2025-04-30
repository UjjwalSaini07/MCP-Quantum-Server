import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import dotenv from "dotenv";
import { checkRepoExists, createRepository, manageRepository, listRepositories, deleteRepository, viewRepository} from "./main_MCP.tool.js";

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

// List all repositories
server.tool(
  "listRepositories",
  "List all GitHub repositories for the user",
  {},
  async () => {
    const repos = await listRepositories();
    return {
      content: [
        {
          type: "text",
          text: `Repositories:\n${repos.join("\n")}`,
        },
      ],
    };
  }
);

// Delete repository
server.tool(
  "deleteRepository",
  "Delete a GitHub repository",
  { repoName: z.string() },
  async ({ repoName }) => {
    const message = await deleteRepository(repoName);
    return {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    };
  }
);

// View repository details
server.tool(
  "viewRepository",
  "View details of a GitHub repository",
  { repoName: z.string() },
  async ({ repoName }) => {
    const details = await viewRepository(repoName);
    return {
      content: [
        {
          type: "text",
          text: `Details for repository "${repoName}":\n${JSON.stringify(details, null, 2)}`,
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

app.post("/tool/viewRepository", async (req, res) => {
  try {
    const { repoName } = req.body;
    const details = await viewRepository(repoName);
    res.json({
      content: [
        {
          type: "text",
          text: `Details for repository "${repoName}":\n${JSON.stringify(details, null, 2)}`,
        },
      ],
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/tool/deleteRepository", async (req, res) => {
  try {
    const { repoName } = req.body;
    const message = await deleteRepository(repoName);
    res.json({
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/tool/listRepositories", async (req, res) => {
  try {
    const repos = await listRepositories();
    res.json({
      content: [
        {
          type: "text",
          text: `Repositories:\n${repos.join("\n")}`,
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
