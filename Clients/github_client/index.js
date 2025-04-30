import readline from "readline";
import chalk from "chalk";
import fetch from "node-fetch";
import fs from "fs";
import ora from "ora";
import prompts from "prompts";
import dotenv from "dotenv";

dotenv.config();

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";
const LOG_FILE = "action_history.log";

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

    if (toolName === "getRepositoryTraffic" || toolName === "getUserDetails") {
      return result;
    }
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
          "check | create | manage | list | delete | view | collaborator | getuser | help | exit"
        )}\n> `
      );

      if (action.toLowerCase() === "exit" || action === "10") {
        console.log(chalk.bold.greenBright("\n👋 Thank you for using the MCP Repository Manager!"));
        console.log(chalk.blueBright("🔚 GoodBye... Have a great day!\n"));
        process.exit(0);
      }      

      if (action.toLowerCase() === "help" || action === "9") {
        console.log(chalk.magentaBright("\nAvailable Commands:"));
        console.log(chalk.yellow("check") + ": Check if a repository exists.");
        console.log(chalk.yellow("create") + ": Create a new repository.");
        console.log(chalk.yellow("manage") + ": Manage an existing repository.");
        console.log(chalk.yellow("list") + ": List all repositories.");
        console.log(chalk.yellow("delete") + ": Delete a repository.");
        console.log(chalk.yellow("view") + ": View details of a repository.");
        // console.log(chalk.yellow("batch") + ": Batch create/manage repositories from a file.");
        console.log(chalk.yellow("collaborator") + ": Manage repository collaborators (add/remove).");
        console.log(chalk.yellow("getuser") + ": All Info of User using GitHub Username.");
        console.log(chalk.yellow("exit") + ": Exit the application.");
        continue;
      }

      if (action.toLowerCase() === "list" || action === "4") {
        const msg = await callTool("listRepositories", {});
        console.log(chalk.greenBright("\n📂 Repositories:"));
        console.log(msg);
        logAction("Listed all repositories.");
        continue;
      }

      // if (action.toLowerCase() === "batch" || action === "7") {
      //   const filePath = await ask("Enter the path to the batch JSON file:\n> ");
      //   if (!fs.existsSync(filePath)) {
      //     console.log(chalk.red("❌ File not found."));
      //     continue;
      //   }
      //   const batchData = JSON.parse(fs.readFileSync(filePath, "utf8"));
      //   for (const repo of batchData.repositories) {
      //     try {
      //       const msg = await callTool("createRepository", repo);
      //       console.log(chalk.green(`✅ ${repo.repoName}: ${msg}`));
      //     } catch (error) {
      //       console.log(chalk.red(`❌ ${repo.repoName}: ${error.message}`));
      //     }
      //   }
      //   logAction(`Processed batch file: ${filePath}`);
      //   continue;
      // }

      if (action.toLowerCase() === "getuser" || action === "8") {
        const username = await ask("Enter username:\n> ");
        
        try {
          const response = await callTool("getUserDetails", { username });
          // console.log("Full Response:", response);
          if (response && response.userDetails) {
            console.log(chalk.greenBright("\n👤 User Details:"));
            console.log(response.userDetails);
          } else {
            console.log(chalk.red("❌ No user details found."));
          }
          logAction(`Fetched details for '${username}'`);
        } catch (error) {
          console.error(chalk.red("❌ Error fetching user details: "), error.message);
        }
      
        continue;
      }

      const repoName = await ask("Enter repository name:\n> ");
      if (!repoName) {
        console.log(chalk.red("❌ Repository name cannot be empty."));
        continue;
      }

      if (action.toLowerCase() === "delete" || action === "5") {
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

      if (action.toLowerCase() === "view" || action === "6") {
        const msg = await callTool("viewRepository", { repoName });
        console.log(chalk.greenBright("\n📄 Repository Details:"));
        console.log(msg);
        logAction(`Viewed repository: ${repoName}`);
        continue;
      }

      let description = "";
      if (action === "create" || action === "2") {
        description = await ask("Enter description (optional):\n> ");
      }

      if (action.toLowerCase() === "collaborator" || action === "7") {
        const collaboratorAction = await ask(
          `Do you want to add or remove a collaborator? (add/remove)\n> `
        );
      
        if (!["add", "remove"].includes(collaboratorAction.toLowerCase())) {
          console.log(chalk.red("❌ Invalid action. Please choose 'add' or 'remove'."));
          continue;
        }
      
        const collaboratorUsername = await ask(
          "Enter the username of the collaborator:\n> "
        );
      
        if (collaboratorAction.toLowerCase() === "add") {
          const permission = await ask(
            "Enter the permission level (pull/push/admin, default is push):\n> "
          );
          const msg = await callTool("addCollaborator", {
            repoName,
            collaboratorUsername,
            permission: permission || "push",
          });
          console.log(chalk.green("\n✅ " + msg));
          logAction(`Added collaborator: ${collaboratorUsername} to ${repoName}`);
        } else if (collaboratorAction.toLowerCase() === "remove") {
          const msg = await callTool("removeCollaborator", {
            repoName,
            collaboratorUsername,
          });
          console.log(chalk.green("\n✅ " + msg));
          logAction(`Removed collaborator: ${collaboratorUsername} from ${repoName}`);
        }
        continue;
      }

      switch (action.toLowerCase()) {
        case "check" :
          case "1": {
          const msg = await callTool("checkRepoExists", { repoName });
          console.log(chalk.green("\n✅ " + msg));
          logAction(`Checked repository: ${repoName}`);
          break;
        }
        case "create" :
          case "2": {
          const msg = await callTool("createRepository", {
            repoName,
            description,
          });
          console.log(chalk.green("\n✅ " + msg));
          logAction(`Created repository: ${repoName}`);
          break;
        }
        case "manage":
          case "3": {
            const { action } = await prompts({
              type: "select",
              name: "action",
              message: "Select repository management action",
              choices: [
                { title: "Get Repository Traffic", value: "getRepositoryTraffic" },
                { title: "Set Repository Visibility", value: "setRepositoryVisibility" },
                { title: "Rename Repository", value: "renameRepository" },
                { title: "Create Issue", value: "createIssue" },
              ],
            });

            const { repoName } = await prompts({
              type: "text",
              name: "repoName",
              message: "Repository name:",
              validate: (value) => (value ? true : "Repository name is required"),
            });

            let data = { repoName };
            let toolName = action;

            switch (action) {
              case "setRepositoryVisibility": {
                const { visibility } = await prompts({
                  type: "select",
                  name: "visibility",
                  message: "Set visibility to:",
                  choices: [
                    { title: "Public", value: "public" },
                    { title: "Private", value: "private" },
                  ],
                });
                data.visibility = visibility;
                break;
              }

              case "renameRepository": {
                const { newName } = await prompts({
                  type: "text",
                  name: "newName",
                  message: "New repository name:",
                  validate: (value) => (value ? true : "New name is required"),
                });
                data.newName = newName;
                break;
              }

              case "createIssue": {
                const { issueTitle, issueBody } = await prompts([
                  {
                    type: "text",
                    name: "issueTitle",
                    message: "Issue title:",
                    validate: (value) => (value ? true : "Issue title is required"),
                  },
                  {
                    type: "text",
                    name: "issueBody",
                    message: "Issue body (optional):",
                  },
                ]);
                data.issueTitle = issueTitle;
                if (issueBody) data.issueBody = issueBody;
                break;
              }
            }

            try {
              if (toolName === "getRepositoryTraffic") {
                const result = await callTool(toolName, data);
                const traffic = result?.traffic;
              
                if (!traffic || !traffic.views) {
                  console.log(chalk.red("❌ No traffic data available."));
                } else {
                  console.log(chalk.bold.blue("\n📊 Repository Traffic:"));
                  console.log(chalk.greenBright(`Total Views: ${traffic.totalCount}`));
                  console.log(chalk.green(`Unique Visitors: ${traffic.totalUniques}`));

                  console.log(chalk.yellowBright("\nDaily Breakdown:"));
                  traffic.views.forEach(({ timestamp, count, uniques }) => {
                    console.log(
                      chalk.white(`- ${timestamp}: `) + 
                      chalk.greenBright(`${count} views, `) + 
                      chalk.red(`${uniques} unique visitors`)
                    );
                  });
                }
              
                logAction(`Viewed traffic for repository: ${repoName}`);
              } else {
                const msg = await callTool(toolName, data);
                console.log(chalk.green("\n✅ " + msg));
                logAction(`Ran '${toolName}' on '${repoName}'`);
              }
            } catch (error) {
              console.error(chalk.red("❌ " + error.message));
            }
            break;
          }

        default:
          console.log(chalk.red("❌ Invalid Re-Try action."));
      }
    } catch (error) {
      console.error(chalk.red("❌ Error: "), error.message);
    }
  }
}

main();
