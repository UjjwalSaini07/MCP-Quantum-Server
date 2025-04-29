import { createPost } from "./main_mcp.tool.ts";
import type { Article, HNResponse } from "./automates_types.ts";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function fetchTopStories(num: number = 5): Promise<Article[]> {
  const url = "https://hn.algolia.com/api/v1/search";
  const yesterdayTimestamp = Math.floor(Date.now() / 1000) - 99000;
  const params = new URLSearchParams({
    tags: "story",
    hitsPerPage: num.toString(),
    numericFilters: `created_at_i>${yesterdayTimestamp}`,
  });

  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch Hacker News stories");
  }

  const data = (await response.json()) as HNResponse;
  console.log("Fetched top stories");
  return data.hits.map((hit) => ({
    title: hit.title,
    url: hit.url,
    points: hit.points,
    num_comments: hit.num_comments,
    _tags: hit._tags,
    author: hit.author,
    created_at: hit.created_at,
  }));
}

async function generateRecap(stories: Article[]): Promise<string> {
  const storiesInfo = stories
    .map(
      (story, i) =>
        `Story ${i + 1}:
      Title: ${story.title}
      Author: ${story.author}`
    )
    .join("\n\n");

  const prompt = `Here are the top 5 Hacker News stories from the last 24 hours:

${storiesInfo}

Please create a concise and engaging recap of these stories in under 280 characters. Format it as a tweet, including relevant emojis. Make it informative, sarcastic yet casual.`;
  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  });
  const response = result.text;
  console.log("Generated recap:", response);
  return response || "Failed to generate a recap.";
}

async function main() {
  try {
    const stories = await fetchTopStories(5);

    const recap = await generateRecap(stories);

    const result = await createPost(recap);

    if (result.content && result.content[0]) {
      console.log("Posted successfully:", result.content[0].text);
    } else {
      console.error("Failed to retrieve post content.");
    }
  } catch (error) {
    console.error("Failed to post:", error);
    process.exit(1);
  }
}

main();
