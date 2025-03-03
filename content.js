const debug = true;

// State tracking
let activeElement = null;
let currentGhostText = null;
let currentSuggestion = null;
let currentLastWord = null;
let debounceTimer = null;
let settings = {
  isEnabled: true,
  useGhostText: true,
};

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("AutoTab: Starting initialization");
  loadSettings();
  setupEventListeners();
});

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(["isEnabled", "useGhostText"], function (items) {
    if (chrome.runtime.lastError) {
      console.error("Failed to load settings:", chrome.runtime.lastError);
      return;
    }

    settings.isEnabled = items.isEnabled !== false;
    settings.useGhostText = items.useGhostText !== false;
    console.log("AutoTab: Settings loaded:", settings);
  });
}

// Set up all event listeners
function setupEventListeners() {
  document.addEventListener("focusin", handleFocus);
  document.addEventListener("input", handleInput);
  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("click", handleClick);
  document.addEventListener("scroll", handleScroll, true);
  console.log("AutoTab: Event listeners set up");
}

// Handle focus events
function handleFocus(event) {
  const element = event.target;
  if (isValidInputField(element)) {
    activeElement = element;
    console.log("AutoTab: Element focused", element.tagName);
  } else {
    activeElement = null;
  }
}

// Handle input events
function handleInput(event) {
  if (!settings.isEnabled || !activeElement) return;

  const element = event.target;
  const text = getElementText(element);

  if (text.length < 5) {
    removeGhostText();
    return;
  }

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    generateSuggestion(element, text);
  }, 500);
}

// Generate suggestion
function generateSuggestion(element, text) {
  chrome.runtime.sendMessage({
    type: "TEXT_BOX_UPDATED",
    textBoxContent: text,
    cursorPosition: getCursorPosition(element),
  });
}

// Handle keydown events
function handleKeyDown(event) {
  if (!settings.isEnabled || !activeElement) return;

  if (event.key === "Tab" && currentGhostText) {
    event.preventDefault();
    acceptSuggestion();
  } else if (event.key === "Escape" && currentGhostText) {
    event.preventDefault();
    removeGhostText();
  }
}

// Handle click events
function handleClick(event) {
  if (event.target !== activeElement) {
    removeGhostText();
  }
}

// Handle scroll events
function handleScroll() {
  removeGhostText();
}

// Check if element is a valid input field
function isValidInputField(element) {
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable
  );
}

// Get text from element
function getElementText(element) {
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    return element.value;
  } else if (element.isContentEditable) {
    return element.textContent;
  }
  return "";
}

// Get cursor position
function getCursorPosition(element) {
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    return element.selectionStart;
  } else if (element.isContentEditable) {
    const selection = window.getSelection();
    return selection.focusOffset;
  }
  return 0;
}

// Accept suggestion
function acceptSuggestion() {
  if (!activeElement || !currentGhostText) return;

  const text = getElementText(activeElement);
  const cursorPos = getCursorPosition(activeElement);
  const beforeCursor = text.slice(0, cursorPos);
  const afterCursor = text.slice(cursorPos);

  const newText = beforeCursor + currentGhostText.textContent + afterCursor;
  updateElementText(
    activeElement,
    newText,
    beforeCursor.length + currentGhostText.textContent.length
  );
  removeGhostText();
}

// Update element text
function updateElementText(element, text, cursorPos) {
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    element.value = text;
    element.setSelectionRange(cursorPos, cursorPos);
  } else if (element.isContentEditable) {
    element.textContent = text;
    const range = document.createRange();
    const selection = window.getSelection();
    range.setStart(element.firstChild, cursorPos);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

// Remove ghost text
function removeGhostText() {
  if (currentGhostText) {
    currentGhostText.remove();
    currentGhostText = null;
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "COMPLETION_RECEIVED" && activeElement) {
    if (request.error) {
      console.error("AutoTab: Error received:", request.error);
      return;
    }

    if (request.completion) {
      createGhostText(request.completion);
    }
  }
});

// Create ghost text
function createGhostText(completion) {
  if (!activeElement) return;

  removeGhostText();

  const ghostText = document.createElement("span");
  ghostText.className = "ai-ghost-text";
  ghostText.textContent = completion;
  ghostText.style.position = "absolute";
  ghostText.style.color = "rgba(128, 128, 128, 0.8)";
  ghostText.style.pointerEvents = "none";

  const rect = activeElement.getBoundingClientRect();
  ghostText.style.top = `${rect.bottom + window.scrollY}px`;
  ghostText.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(ghostText);
  currentGhostText = ghostText;
}

console.log("AutoTab: Content script loaded");
