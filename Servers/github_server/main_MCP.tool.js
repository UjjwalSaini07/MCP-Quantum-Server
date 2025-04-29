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

// Check if a repository exists.
export async function checkRepoExists(repoName) {
  try {
    console.log(`Checking if repository "${repoName}" exists...`);
    const repo = gh.getRepo(process.env.GITHUB_REPO_OWNER, repoName);
    await repo.getDetails();
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

// Create a new repository.
export async function createRepository(repoName, description) {
  try {
    console.log(`Creating repository "${repoName}"...`);
    const user = gh.getUser();
    const response = await user.createRepo({
      name: repoName,
      description,
      private: false,
    });
    console.log(
      `Repository "${repoName}" created at: ${response.data.html_url}`
    );
    return response.data.html_url;
  } catch (error) {
    console.error("Error creating repository:", error);
    throw new Error("Failed to create repository.");
  }
}

// Manage a repository: check if it exists, and create it if it doesn't.
export async function manageRepository(repoName, description) {
  try {
    const exists = await checkRepoExists(repoName);
    if (exists) {
      const message = `Repository "${repoName}" already exists.`;
      console.log(message);
      return message;
    } else {
      const repoUrl = await createRepository(repoName, description);
      const successMessage = `Repository created successfully: ${repoUrl}`;
      console.log(successMessage);
      return successMessage;
    }
  } catch (error) {
    console.error("Error managing repository:", error.message);
    throw error;
  }
}
