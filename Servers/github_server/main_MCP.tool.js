import GitHub from "github-api";
import { Octokit } from "@octokit/rest";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
function validateEnvVariables() {
  const required = ["GITHUB_TOKEN", "GITHUB_REPO_OWNER"];
  const missing = required.filter((key) => !process.env[key]);
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN, });
  
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is not set. Please set it before running the server.");
  }

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

validateEnvVariables();

// Initialize GitHub Client
const gh = new GitHub({ token: process.env.GITHUB_TOKEN });
const GITHUB_API_BASE = 'https://api.github.com';
const OWNER = process.env.GITHUB_REPO_OWNER;
const HEADERS = {
  'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'node-fetch-client'
};

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
export async function manageRepository(repoName, description, options = {}) {
  try {
    console.log(`Managing repository "${repoName}"...`);
    const exists = await checkRepoExists(repoName);

    if (exists) {
      console.log(`Repository "${repoName}" exists.`);
      
      // Fetch repository details
      const repo = gh.getRepo(process.env.GITHUB_REPO_OWNER, repoName);
      const { data: details } = await repo.getDetails();

      // Check if description needs an update
      if (description && description !== details.description) {
        console.log(`Updating description for repository "${repoName}"...`);
        await repo.updateRepository({ description });
        console.log(`Description updated to: "${description}"`);
      }

      // Return existing repository details
      return {
        message: `Repository "${repoName}" exists.`,
        details: {
          url: details.html_url,
          description: details.description,
          stats: {
            stars: details.stargazers_count,
            forks: details.forks_count,
            watchers: details.watchers_count,
          },
        },
      };
    } else {
      console.log(`Repository "${repoName}" does not exist. Creating...`);
      const isPrivate = options.private || false;

      const user = gh.getUser();
      const response = await user.createRepo({
        name: repoName,
        description,
        private: isPrivate,
      });

      console.log(`Repository "${repoName}" created at: ${response.data.html_url}`);
      return {
        message: `Repository created successfully.`,
        url: response.data.html_url,
      };
    }
  } catch (error) {
    console.error("Error managing repository:", error.message);
    throw error;
  }
}

// List all repositories for the authenticated user
export async function listRepositories() {
  try {
    console.log("Fetching list of repositories...");
    const user = gh.getUser();
    const { data: repos } = await user.listRepos();
    const repoNames = repos.map((repo) => repo.name);
    console.log(`Found ${repoNames.length} repositories.`);
    return repoNames;
  } catch (error) {
    console.error("Error listing repositories:", error);
    throw new Error("Failed to list repositories.");
  }
}

// Delete a repository
export async function deleteRepository(repoName) {
  try {
    console.log(`Deleting repository "${repoName}"...`);
    const repo = gh.getRepo(process.env.GITHUB_REPO_OWNER, repoName);
    await repo.deleteRepo();
    console.log(`Repository "${repoName}" deleted successfully.`);
    return `Repository "${repoName}" has been deleted.`;
  } catch (error) {
    console.error("Error deleting repository:", error);
    throw new Error("Failed to delete repository.");
  }
}

// View details of a repository
export async function viewRepository(repoName) {
  try {
    console.log(`Fetching details for repository "${repoName}"...`);
    const repo = gh.getRepo(process.env.GITHUB_REPO_OWNER, repoName);
    const { data: details } = await repo.getDetails();
    console.log(`Repository "${repoName}" details fetched.`);
    return details;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`Repository "${repoName}" does not exist.`);
      return `Repository "${repoName}" does not exist.`;
    }
    console.error("Error viewing repository:", error);
    throw new Error("Failed to fetch repository details.");
  }
}

// Add Collaborator
export async function addCollaborator(repoName, collaboratorUsername, permission = "push") {
  try {
    const owner = process.env.GITHUB_REPO_OWNER;
    const token = process.env.GITHUB_TOKEN;

    const url = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/collaborators/${collaboratorUsername}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({ permission }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add collaborator.");
    }

    console.log(`Collaborator "${collaboratorUsername}" added successfully.`);
    return `Collaborator "${collaboratorUsername}" added successfully with "${permission}" permission.`;
  } catch (error) {
    console.error("Error adding collaborator:", error);
    throw new Error("Failed to add collaborator.");
  }
}

// Remove Collaborator
export async function removeCollaborator(repoName, collaboratorUsername) {
  try {
    const owner = process.env.GITHUB_REPO_OWNER;
    const token = process.env.GITHUB_TOKEN;

    const url = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/collaborators/${collaboratorUsername}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to remove collaborator.");
    }

    console.log(`Collaborator "${collaboratorUsername}" removed successfully.`);
    return `Collaborator "${collaboratorUsername}" removed successfully.`;
  } catch (error) {
    console.error("Error removing collaborator:", error);
    throw new Error("Failed to remove collaborator.");
  }
}

// Get User Details
export async function getUserDetails(username) {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/users/${username}`, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data) {
      throw new Error("User details not found.");
    }

    return data;
  } catch (error) {
    throw new Error(`Error fetching details for '${username}': ${error.message}`);
  }
}

// Get Repository Traffic
export async function getRepositoryTraffic(repoName) {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${OWNER}/${repoName}/traffic/views`, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText);
    }

    const data = await res.json();

    return {
      totalCount: data.count,
      totalUniques: data.uniques,
      views: data.views.map(view => ({
        timestamp: view.timestamp,
        count: view.count,
        uniques: view.uniques,
      })),
    };
  } catch (error) {
    throw new Error(`Error fetching traffic for repository '${repoName}': ${error.message}`);
  }
}

// Set Repository Visibility
export async function setRepositoryVisibility(repoName, visibility) {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${OWNER}/${repoName}`, {
      method: 'PATCH',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        private: visibility === 'private'
      })
    });
    if (!res.ok) throw new Error(await res.text());
    return `Repository '${repoName}' visibility set to '${visibility}'.`;
  } catch (error) {
    throw new Error(`Error setting visibility for repository '${repoName}': ${error.message}`);
  }
}

// Rename Repository
export async function renameRepository(repoName, newName) {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${OWNER}/${repoName}`, {
      method: 'PATCH',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newName })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return `Repository renamed from '${repoName}' to '${data.full_name}'.`;
  } catch (error) {
    throw new Error(`Error renaming repository '${repoName}': ${error.message}`);
  }
}

// Create Issue
export async function createIssue(repoName, issueTitle, issueBody = '') {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${OWNER}/${repoName}/issues`, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return `Issue created: ${data.html_url}`;
  } catch (error) {
    throw new Error(`Error creating issue in '${repoName}': ${error.message}`);
  }
}