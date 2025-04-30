import readline from "readline";
import chalk from "chalk";
import fetch from "node-fetch";
import fs from "fs";
import ora from "ora";
import dotenv from "dotenv";

dotenv.config();

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";
const LOG_FILE = "action_history.log"; // File to store logs

/**
 * Send a POST request to a specific tool endpoint on the MCP server.
 * @param {string} toolName - The name of the tool (e.g., "checkRepoExists").
 * @param {object} data - Payload to send in the request.
 * @returns {Promise<string>} - Parsed message from the server.
 */
async function callTool(toolName, data) {
  const spinner = ora(`Processing ${toolName}...`).start();
  try {
    const response = await fetch(`${MCP_SERVER_URL}/tool/${toolName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const msg = await response.text();
      throw new Error(`${toolName} failed: ${response.status} ${msg}`);
    }

    const result = await response.json();
    spinner.succeed(`${toolName} succeeded.`);
    return result.content?.[0]?.text || result.message || "No response content.";
  } catch (error) {
    spinner.fail(`${toolName} failed.`);
    throw new Error(`Error in ${toolName}: ${error.message}`);
  }
}

/**
 * CLI utility for asking questions.
 * @param {string} question - The question to display to the user.
 * @returns {Promise<string>} - The user's input.
 */
function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(chalk.cyanBright(question), (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

/**
 * Log an action to a file.
 * @param {string} action - The action performed.
 */
function logAction(action) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action}\n`;
  fs.appendFileSync(LOG_FILE, logEntry, "utf8");
}

async function main() {
  console.log(chalk.greenBright("Welcome to the Enhanced MCP Repository Manager!"));
  console.log(chalk.blueBright("Type 'help' for a list of available commands.\n"));

  while (true) {
    try {
      const action = await ask(
        `Choose an action: ${chalk.yellow(
          "check | create | manage | list | delete | view | batch | help | exit"
        )}\n> `
      );

      if (action.toLowerCase() === "exit") {
        console.log(chalk.green("Goodbye!"));
        process.exit(0);
      }

      if (action.toLowerCase() === "help") {
        console.log(chalk.magentaBright("\nAvailable Commands:"));
        console.log(chalk.yellow("check") + ": Check if a repository exists.");
        console.log(chalk.yellow("create") + ": Create a new repository.");
        console.log(chalk.yellow("manage") + ": Manage an existing repository.");
        console.log(chalk.yellow("list") + ": List all repositories.");
        console.log(chalk.yellow("delete") + ": Delete a repository.");
        console.log(chalk.yellow("view") + ": View details of a repository.");
        console.log(chalk.yellow("batch") + ": Batch create/manage repositories from a file.");
        console.log(chalk.yellow("exit") + ": Exit the application.");
        continue;
      }

      if (action.toLowerCase() === "list") {
        const msg = await callTool("listRepositories", {});
        console.log(chalk.greenBright("\n📂 Repositories:"));
        console.log(msg);
        logAction("Listed all repositories.");
        continue;
      }

      if (action.toLowerCase() === "batch") {
        const filePath = await ask("Enter the path to the batch JSON file:\n> ");
        if (!fs.existsSync(filePath)) {
          console.log(chalk.red("❌ File not found."));
          continue;
        }
        const batchData = JSON.parse(fs.readFileSync(filePath, "utf8"));
        for (const repo of batchData.repositories) {
          try {
            const msg = await callTool("createRepository", repo);
            console.log(chalk.green(`✅ ${repo.repoName}: ${msg}`));
          } catch (error) {
            console.log(chalk.red(`❌ ${repo.repoName}: ${error.message}`));
          }
        }
        logAction(`Processed batch file: ${filePath}`);
        continue;
      }

      const repoName = await ask("Enter repository name:\n> ");
      if (!repoName) {
        console.log(chalk.red("❌ Repository name cannot be empty."));
        continue;
      }

      if (action.toLowerCase() === "delete") {
        const confirmation = await ask(`Are you sure you want to delete ${repoName}? (yes/no)\n> `);
        if (confirmation.toLowerCase() === "yes") {
          const msg = await callTool("deleteRepository", { repoName });
          console.log(chalk.green("\n✅ " + msg));
          logAction(`Deleted repository: ${repoName}`);
        } else {
          console.log(chalk.yellow("❌ Deletion cancelled."));
        }
        continue;
      }

      if (action.toLowerCase() === "view") {
        const msg = await callTool("viewRepository", { repoName });
        console.log(chalk.greenBright("\n📄 Repository Details:"));
        console.log(msg);
        logAction(`Viewed repository: ${repoName}`);
        continue;
      }

      let description = "";
      if (action === "create" || action === "manage") {
        description = await ask("Enter description (optional):\n> ");
      }

      switch (action.toLowerCase()) {
        case "check": {
          const msg = await callTool("checkRepoExists", { repoName });
          console.log(chalk.green("\n✅ " + msg));
          logAction(`Checked repository: ${repoName}`);
          break;
        }
        case "create": {
          const msg = await callTool("createRepository", {
            repoName,
            description,
          });
          console.log(chalk.green("\n✅ " + msg));
          logAction(`Created repository: ${repoName}`);
          break;
        }
        case "manage": {
          const msg = await callTool("manageRepository", {
            repoName,
            description,
          });
          console.log(chalk.green("\n✅ " + msg));
          logAction(`Managed repository: ${repoName}`);
          break;
        }
        default:
          console.log(chalk.red("❌ Invalid action."));
      }
    } catch (error) {
      console.error(chalk.red("❌ Error: "), error.message);
    }
  }
}

main();
