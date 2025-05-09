import express from "express";
import { z } from "zod";
import dotenv from "dotenv";
import chalk from "chalk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { checkRepoExists, createRepository, manageRepository, listRepositories, deleteRepository, viewRepository, addCollaborator, removeCollaborator, getUserDetails, getRepositoryTraffic, setRepositoryVisibility, renameRepository, createIssue} from "./main_MCP.tool.js";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

// MCP TOOL SERVER
const server = new McpServer({
  name: "github-repo-server",
  version: "1.0.0",
});

// Check Repository
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

// Tool: Get Repository Traffic
server.tool(
  "getRepositoryTraffic",
  "Get traffic data for a GitHub repository",
  { repoName: z.string() },
  async ({ repoName }) => {
    const traffic = await getRepositoryTraffic(repoName);

    return {
      content: [
        {
          type: "text",
          text: `📊 Repository "${repoName}" Traffic:\n- Views: ${traffic.views}\n- Uniques: ${traffic.uniques}`,
        },
      ],
    };
  }
);

// Tool: Set Repository Visibility
server.tool(
  "setRepositoryVisibility",
  "Set repository visibility (public or private)",
  {
    repoName: z.string(),
    visibility: z.enum(["public", "private"]),
  },
  async ({ repoName, visibility }) => {
    const msg = await setRepositoryVisibility(repoName, visibility);
    return {
      content: [{ type: "text", text: msg }],
    };
  }
);

// Tool: Rename Repository
server.tool(
  "renameRepository",
  "Rename a GitHub repository",
  {
    repoName: z.string(),
    newName: z.string(),
  },
  async ({ repoName, newName }) => {
    const msg = await renameRepository(repoName, newName);
    return {
      content: [{ type: "text", text: msg }],
    };
  }
);

// Tool: Create Issue
server.tool(
  "createIssue",
  "Create a new issue in a repository",
  {
    repoName: z.string(),
    issueTitle: z.string(),
    issueBody: z.string().optional(),
  },
  async ({ repoName, issueTitle, issueBody }) => {
    const msg = await createIssue(repoName, issueTitle, issueBody);
    return {
      content: [{ type: "text", text: msg }],
    };
  }
);

// ==================================
// REST API ENDPOINTS FOR CLIENT SIDE
// ==================================

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

// Add Collaborator
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

// Remove Collaborator
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

// Get User Details
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

// Repository Traffic
app.post('/tool/getRepositoryTraffic', async (req, res) => {
  const { repoName } = req.body;
  console.log('Incoming repoName:', repoName); // Add this

  if (!repoName) {
    return res.status(400).json({ message: 'repoName is required' });
  }

  try {
    const traffic = await getRepositoryTraffic(repoName);
    // console.log('Fetched traffic:', traffic);

    res.status(200).json({ message: 'Repository traffic fetched.', traffic });
  } catch (error) {
    // console.error('Error fetching traffic:', error);
    res.status(500).json({ message: error.message });
  }
});

// Set Repository Visibility
app.post('/tool/setRepositoryVisibility', async (req, res) => {
  const { repoName, visibility } = req.body;
  if (!repoName || !visibility) {
    return res.status(400).json({ message: 'repoName and visibility are required' });
  }
  try {
    const msg = await setRepositoryVisibility(repoName, visibility);
    res.status(200).json({ message: msg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rename Repository
app.post('/tool/renameRepository', async (req, res) => {
  const { repoName, newName } = req.body;
  if (!repoName || !newName) {
    return res.status(400).json({ message: 'repoName and newName are required' });
  }
  try {
    const msg = await renameRepository(repoName, newName);
    res.status(200).json({ message: msg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Issue
app.post('/tool/createIssue', async (req, res) => {
  const { repoName, issueTitle, issueBody } = req.body;
  if (!repoName || !issueTitle) {
    return res.status(400).json({ message: 'repoName and issueTitle are required' });
  }
  try {
    const msg = await createIssue(repoName, issueTitle, issueBody);
    res.status(200).json({ message: msg });
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
const httpServer = app.listen(PORT, () => {
  console.clear();
  console.log(chalk.green.bold('\n========================================='));
  console.log(chalk.green.bold('🚀 Server Status: ') + chalk.cyan.bold('Online'));
  console.log(chalk.green.bold('🌐 Listening on: ') + chalk.yellow.underline(`http://localhost:${PORT}`));
  console.log(chalk.green.bold('📅 Started at: ') + chalk.magenta(new Date().toLocaleString()));
  console.log(chalk.green.bold('=========================================\n'));
});

// Handle server close event
httpServer.on('close', () => {
  console.log(chalk.red.bold('\n========================================='));
  console.log(chalk.red.bold('🛑 Server Status: ') + chalk.yellow.bold('Offline'));
  console.log(chalk.red.bold('🔔 Server has been closed.'));
  console.log(chalk.red.bold('=========================================\n'));
});

// Graceful shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log(chalk.blue.bold('Gracefully shutting down the server...'));
  httpServer.close(() => {
    console.log(chalk.blue.bold('Server shut down complete.'));
    process.exit(0);
  });
});