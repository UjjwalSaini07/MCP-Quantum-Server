import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
import type { CreatePostResponse } from "./automates_types";

dotenv.config();

function validateTwitterCredentials() {
  const required = [
    "TWITTER_API_KEY",
    "TWITTER_API_SECRET",
    "TWITTER_ACCESS_TOKEN",
    "TWITTER_ACCESS_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing Twitter credentials: ${missing.join(", ")}`);
  }
}

validateTwitterCredentials();

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
}).readWrite;

export async function createPost(status: string): Promise<CreatePostResponse> {
  try {
    console.log("Tweeting status...");

    const newPost = await twitterClient.v2.tweet({
      text: status.length > 280 ? status.slice(0, 275) + "..." : status,
    });

    if (!newPost?.data?.text) {
      throw new Error("Failed to create tweet: No response data");
    }

    console.log("Tweeted: ", newPost.data.text);
    return {
      content: [
        {
          type: "text",
          text: `Tweeted: ${status}`,
        },
      ],
    };
  } catch (error: any) {
    if (error?.data?.detail) {
      console.error("Twitter API error:", {
        detail: error.data.detail,
        status: error.data.status,
        title: error.data.title,
      });

      switch (error.data.status) {
        case 403:
          throw new Error(
            "Twitter API: Authentication failed. Please check your API keys and tokens."
          );
        case 429:
          throw new Error(
            "Twitter API: Rate limit exceeded. Please try again later."
          );
        default:
          throw new Error(`Twitter API: ${error.data.detail}`);
      }
    }

    console.error("Twitter API error:", error);
    throw new Error(
      "Failed to create tweet: " + (error.message || "Unknown error")
    );
  }
}
