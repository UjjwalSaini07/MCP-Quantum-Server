import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
import chalk from "chalk";
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
    console.error(
      chalk.red.bold(`Missing Twitter credentials: ${missing.join(", ")}`)
    );
    throw new Error(`Missing Twitter credentials: ${missing.join(", ")}`);
  }

  console.log(chalk.green("Twitter credentials validated successfully."));
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
    console.log(chalk.blue("Tweeting status..."));

    const newPost = await twitterClient.v2.tweet({
      text: status.length > 280 ? status.slice(0, 275) + "..." : status,
    });

    if (!newPost?.data?.text) {
      throw new Error("Failed to create tweet: No response data");
    }

    console.log(chalk.green.bold("Tweeted successfully:"), newPost.data.text);
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
      console.error(
        chalk.red.bold("Twitter API error:"),
        chalk.yellow(JSON.stringify({
          detail: error.data.detail,
          status: error.data.status,
          title: error.data.title,
        }))
      );

      switch (error.data.status) {
        case 403:
          throw new Error(
            chalk.red("Twitter API: Authentication failed. Please check your API keys and tokens.")
          );
        case 429:
          throw new Error(
            chalk.red("Twitter API: Rate limit exceeded. Please try again later.")
          );
        default:
          throw new Error(chalk.red(`Twitter API: ${error.data.detail}`));
      }
    }

    console.error(chalk.red.bold("Twitter API error:"), error);
    throw new Error(
      chalk.red("Failed to create tweet: " + (error.message || "Unknown error"))
    );
  }
}
