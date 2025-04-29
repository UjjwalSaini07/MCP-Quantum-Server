import { GoogleGenAI } from "@google/genai";
import { createPost } from "./main_mcp.tool";
import dotenv from "dotenv";

dotenv.config();

export interface OnThisDayLink {
  0: string; // HTML anchor tag
  1: string; // URL
  2: string; // Link text
}

export interface OnThisDayEvent {
  text: string;
  html: string;
  links: Record<string, OnThisDayLink>;
}

export interface OnThisDayData {
  Events: OnThisDayEvent[];
}

export interface OnThisDayResponse {
  info: string;
  date: string;
  updated: string;
  data: OnThisDayData;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateRecap(today: string): Promise<string> {
  const prompt = `Here are the top 2 event from today in history:

${today}

Please create a concise and engaging recap of these in under 280 characters. Format it as a tweet, including relevant emojis. Make it informative, sarcastic yet casual.`;
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

function getTodayPath() {
  const now = new Date();
  const month = String(now.getMonth() + 1);
  const day = String(now.getDate());
  return `https://today.zenquotes.io/api/${month}/${day}`;
}

async function fetchTodayEvent(): Promise<string> {
  const url = getTodayPath();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch today's event");
  }
  const datajson = (await response.json()) as OnThisDayResponse;
  if (
    !datajson?.data?.Events ||
    !Array.isArray(datajson.data.Events) ||
    !datajson.data.Events[0]?.text
  ) {
    throw new Error("Invalid event data");
  }
  return `On this day ${datajson.date}: ${datajson.data.Events[0].text} & ${
    datajson.data.Events[1]?.text || ""
  }`;
}

async function main() {
  try {
    const event = await fetchTodayEvent();
    console.log(event);
    const recap = await generateRecap(event);
    const result = await createPost(recap);
    if (result.content && result.content[0]) {
      console.log(
        "Posted today-in-history successfully:",
        result.content[0].text
      );
    } else {
      console.error("Failed to retrieve post content.");
    }
  } catch (error) {
    console.error("Failed to post today-in-history:", error);
    process.exit(1);
  }
}

main();
