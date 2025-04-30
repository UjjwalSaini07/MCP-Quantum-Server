import readline from "readline";
import chalk from "chalk";
import fetch from "node-fetch";

const MCP_SERVER_URL = "http://localhost:3001";

/**
 * Send a POST request to a specific tool endpoint on the MCP server.
 * @param {string} toolName - The name of the tool (e.g., "checkRepoExists").
 * @param {object} data - Payload to send in the request.
 * @returns {Promise<string>} - Parsed message from the server.
 */
async function callTool(toolName, data) {
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
    return result.content?.[0]?.text || result.message || "No response content.";
  } catch (error) {
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

async function main() {
  console.log(chalk.greenBright("Welcome to the MCP Repository Manager!"));
  console.log(chalk.blueBright("Type 'help' for a list of available commands.\n"));

  while (true) {
    try {
      const action = await ask(
        `Choose an action: ${chalk.yellow("check | create | manage | list | help | exit")}\n> `
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
        console.log(chalk.yellow("exit") + ": Exit the application.");
        continue;
      }

      if (action.toLowerCase() === "list") {
        const msg = await callTool("listRepositories", {});
        console.log(chalk.greenBright("\n📂 Repositories:"));
        console.log(msg);
        continue;
      }

      const repoName = await ask("Enter repository name:\n> ");
      if (!repoName) {
        console.log(chalk.red("❌ Repository name cannot be empty."));
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
          break;
        }
        case "create": {
          const msg = await callTool("createRepository", {
            repoName,
            description,
          });
          console.log(chalk.green("\n✅ " + msg));
          break;
        }
        case "manage": {
          const msg = await callTool("manageRepository", {
            repoName,
            description,
          });
          console.log(chalk.green("\n✅ " + msg));
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
