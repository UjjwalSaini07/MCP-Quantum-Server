import GitHub from "github-api";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
function validateEnvVariables() {
  const required = ["GITHUB_TOKEN", "GITHUB_REPO_OWNER"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

validateEnvVariables();

// Initialize GitHub Client
const gh = new GitHub({ token: process.env.GITHUB_TOKEN });

/**
 * Check if a repository exists.
 * @param {string} repoName - The name of the repository.
 * @returns {boolean} - True if the repository exists, otherwise false.
 */
async function checkRepoExists(repoName) {
  try {
    console.log(`Checking if repository "${repoName}" exists...`);
    const repo = gh.getRepo(process.env.GITHUB_REPO_OWNER, repoName);
    const response = await repo.getDetails();
    console.log(`Repository "${repoName}" found.`);
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`Repository "${repoName}" does not exist.`);
      return false;
    }
    console.error("Error checking repository existence:", error);
    throw new Error("Failed to check repository existence.");
  }
}

/**
 * Create a new repository.
 * @param {string} repoName - The name of the repository.
 * @param {string} description - A short description for the repository.
 * @returns {string} - The URL of the created repository.
 */
async function createRepository(repoName, description) {
  try {
    console.log(`Creating repository "${repoName}"...`);
    const user = gh.getUser();
    const response = await user.createRepo({
      name: repoName,
      description,
      private: false,
    });
    console.log(`Repository "${repoName}" created at: ${response.data.html_url}`);
    return response.data.html_url;
  } catch (error) {
    console.error("Error creating repository:", error);
    throw new Error("Failed to create repository.");
  }
}

/**
 * Main automation function.
 * @param {string} repoName - The name of the repository to manage.
 * @param {string} description - A short description for the repository.
 */
async function manageRepository(repoName, description) {
  try {
    const exists = await checkRepoExists(repoName);
    if (exists) {
      console.log(`Repository "${repoName}" already exists. No action taken.`);
    } else {
      const repoUrl = await createRepository(repoName, description);
      console.log(`Repository created successfully: ${repoUrl}`);
    }
  } catch (error) {
    console.error("Error managing repository:", error.message);
  }
}

// Example Execution
(async () => {
  try {
    const repoName = "example-repo";
    const description = "This is an automated repository created by MCP server.";
    await manageRepository(repoName, description);
  } catch (err) {
    console.error("Execution failed:", err.message);
  }
})();
