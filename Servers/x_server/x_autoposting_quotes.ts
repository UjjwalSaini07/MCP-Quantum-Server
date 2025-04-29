import { createPost } from "./main_mcp.tool";
import dotenv from "dotenv";

dotenv.config();

async function fetchRandomQuote(): Promise<string> {
  const response = await fetch("https://zenquotes.io/api/quotes/");
  if (!response.ok) {
    throw new Error("Failed to fetch quote");
  }
  const data = await response.json();
  if (!Array.isArray(data) || !data[0]?.q || !data[0]?.a) {
    throw new Error("Invalid quote data");
  }
  return `"${data[0].q}" — ${data[0].a}`;
}

async function main() {
  try {
    const quote = (await fetchRandomQuote()) + "🤓";
    console.log(quote);
    const result = await createPost(quote);
    if (result.content && result.content[0]) {
      console.log("Posted quote successfully:", result.content[0].text);
    } else {
      console.error("Failed to retrieve post content.");
    }
  } catch (error) {
    console.error("Failed to post quote:", error);
    process.exit(1);
  }
}

main();
