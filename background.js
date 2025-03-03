// Import env loader
import { loadEnv } from "./env-loader.js";

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  apiKey: "",
  model: "gpt-3.5-turbo",
  temperature: 0.3,
  maxTokens: 50,
  cacheEnabled: true,
};

// Cache for storing recent completions
let completionCache = {};

// Initialize settings
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Text Autocomplete extension installed");

  // Load environment variables
  const env = await loadEnv();

  // Get existing settings and merge with defaults
  chrome.storage.sync.get(DEFAULT_SETTINGS, (data) => {
    // Use API key from .env if available and not already set
    if (env.OPENAI_API_KEY && !data.apiKey) {
      data.apiKey = env.OPENAI_API_KEY;
    }

    chrome.storage.sync.set(data);
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TEXT_BOX_UPDATED") {
    handleTextUpdate(request, sender.tab.id);
  }
  return true;
});

// Handle text updates
async function handleTextUpdate(request, tabId) {
  try {
    const { textBoxContent, cursorPosition } = request;

    // Skip if content is too short
    if (!textBoxContent || textBoxContent.length < 5) {
      return;
    }

    // Get text before cursor
    const textBeforeCursor = textBoxContent.slice(0, cursorPosition);

    // Skip if text before cursor is too short
    if (textBeforeCursor.length < 5) {
      return;
    }

    // Make API request
    const response = await fetch("https://api.openai.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-instruct",
        prompt: textBeforeCursor,
        max_tokens: 50,
        temperature: 0.3,
        stop: ["\n", ".", "?", "!"],
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const completion = data.choices[0].text.trim();

    // Send completion to content script
    chrome.tabs.sendMessage(tabId, {
      type: "COMPLETION_RECEIVED",
      completion: completion,
    });
  } catch (error) {
    console.error("Error generating completion:", error);
    chrome.tabs.sendMessage(tabId, {
      type: "COMPLETION_RECEIVED",
      error: error.message,
    });
  }
}
