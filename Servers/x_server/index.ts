import express, { type Request, type Response } from "express";
import { z } from "zod";
import chalk from "chalk";
import dotenv from "dotenv";
import { createPost } from "./main_mcp.tool";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

dotenv.config();

const server = new McpServer({
  name: "x-post-server",
  version: "1.0.0",
});

const app = express();
const PORT = process.env.PORT || 3001;

server.tool(
  "createPost",
  "Create a post on X formally known as Twitter ",
  {
    status: z.string(),
  },
  async (arg) => {
    const { status } = arg;
    const post = await createPost(status);
    return {
      content: [
        {
          type: "text",
          text: post.content?.[0]?.text || "Post created",
        },
      ],
    };
  }
);

const transports: { [sessionId: string]: SSEServerTransport } = {};

app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
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