import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import dotenv from "dotenv";
import chalk from "chalk";
import { checkRepoExists, createRepository, manageRepository, listRepositories, deleteRepository, viewRepository, addCollaborator, removeCollaborator, getUserDetails} from "./main_MCP.tool.js";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

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

// Create Repository
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

// Managing Repository
server.tool(
  "manageRepository",
  "Manage a GitHub repository: create or update description, retrieve details",
  {
    repoName: z.string(),
    description: z.string().optional(),
    options: z.object({
      private: z.boolean().optional(),
    }).optional(),
  },
  async ({ repoName, description, options }) => {
    const result = await manageRepository(repoName, description, options || {});
    return {
      content: [
        {
          type: "text",
          text: `${result.message}\nDetails:\n${JSON.stringify(result.details || {}, null, 2)}`,
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

// Adding Collaborator
server.tool(
  "addCollaborator",
  "Add a collaborator to a GitHub repository",
  {
    repoName: z.string(),
    collaboratorUsername: z.string(),
    permission: z.string().optional(),
  },
  async ({ repoName, collaboratorUsername, permission }) => {
    const message = await addCollaborator(repoName, collaboratorUsername, permission || "push");
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

// Removing Collaborator
server.tool(
  "removeCollaborator",
  "Remove a collaborator from a GitHub repository",
  {
    repoName: z.string(),
    collaboratorUsername: z.string(),
  },
  async ({ repoName, collaboratorUsername }) => {
    const message = await removeCollaborator(repoName, collaboratorUsername);
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

// View Data of repository
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

// Delete repository
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

// List all repositories
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

// Manage repository
app.post("/tool/manageRepository", async (req, res) => {
  try {
    const { repoName, description, options } = req.body;
    const result = await manageRepository(repoName, description, options || {});
    res.json({
      content: [
        {
          type: "text",
          text: `${result.message}\nDetails:\n${JSON.stringify(result.details || {}, null, 2)}`,
        },
      ],
    });
  } catch (error) {
    console.error("Error in manageRepository:", error.message);
    res.status(500).send(error.message);
  }
});

// Add Collab
app.post("/tool/addCollaborator", async (req, res) => {
  try {
    const { repoName, collaboratorUsername, permission } = req.body;
    const message = await addCollaborator(repoName, collaboratorUsername, permission || "push");
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

// Remove Collab
app.post("/tool/removeCollaborator", async (req, res) => {
  try {
    const { repoName, collaboratorUsername } = req.body;
    const message = await removeCollaborator(repoName, collaboratorUsername);
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

app.post('/tool/getUserDetails', async (req, res) => {
  const { username } = req.body;
  try {
    const userDetails = await getUserDetails(username);

    res.status(200).json({
      message: 'User details fetched successfully.',
      userDetails: userDetails
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
app.listen(PORT, () => {
  console.clear();
  console.log(chalk.green.bold('\n========================================='));
  console.log(chalk.green.bold('🚀 Server Status: ') + chalk.cyan.bold('Online'));
  console.log(chalk.green.bold('🌐 Listening on: ') + chalk.yellow.underline(`http://localhost:${PORT}`));
  console.log(chalk.green.bold('📅 Started at: ') + chalk.magenta(new Date().toLocaleString()));
  console.log(chalk.green.bold('=========================================\n'));
});
