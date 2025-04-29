import readline from "readline";
const MCP_SERVER_URL = "http://localhost:3001";

/**
 * Send a POST request to a specific tool endpoint on the MCP server.
 * @param {string} toolName - The name of the tool (e.g., "checkRepoExists").
 * @param {object} data - Payload to send in the request.
 * @returns {Promise<string>} - Parsed message from the server.
 */
async function callTool(toolName, data) {
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
}

// CLI prompt
function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(question, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  try {
    const action = await ask(
      `Choose action: check | create | manage\n> `
    );

    const repoName = await ask("Enter repository name:\n> ");

    let description = "";
    if (action === "create" || action === "manage") {
      description = await ask("Enter description (optional):\n> ");
    }

    switch (action.toLowerCase()) {
      case "check": {
        const msg = await callTool("checkRepoExists", { repoName });
        console.log("\n✅ " + msg);
        break;
      }
      case "create": {
        const msg = await callTool("createRepository", {
          repoName,
          description,
        });
        console.log("\n✅ " + msg);
        break;
      }
      case "manage": {
        const msg = await callTool("manageRepository", {
          repoName,
          description,
        });
        console.log("\n✅ " + msg);
        break;
      }
      default:
        console.log("❌ Invalid action.");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
