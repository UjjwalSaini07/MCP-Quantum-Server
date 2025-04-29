import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { createPost } from "./main_mcp.tool";
import dotenv from "dotenv";

dotenv.config();

const server = new McpServer({
  name: "x-post-server",
  version: "1.0.0",
});

const app = express();

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

app.listen(3001, () => {
  console.log("Server is feining on http://localhost:3001");
});
