document.addEventListener("DOMContentLoaded", function () {
  // Tab navigation
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");

      // Update active tab
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Show active content
      tabContents.forEach((content) => {
        content.classList.remove("active");
        if (content.id === tabId) {
          content.classList.add("active");
        }
      });
    });
  });

  // Load settings
  const enableToggle = document.getElementById("enableExtension");
  const apiKeyInput = document.getElementById("apiKey");
  const modelSelect = document.getElementById("model");
  const temperatureSlider = document.getElementById("temperature");
  const temperatureValue = document.getElementById("temperatureValue");
  const maxTokensInput = document.getElementById("maxTokens");
  const enableCacheToggle = document.getElementById("enableCache");

  // Update temperature display
  temperatureSlider.addEventListener("input", () => {
    temperatureValue.textContent = temperatureSlider.value;
  });

  // Load saved settings
  chrome.storage.sync.get(
    {
      isEnabled: true,
      apiKey: "",
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      maxTokens: 50,
      cacheEnabled: true,
    },
    function (data) {
      enableToggle.checked = data.isEnabled !== false;
      apiKeyInput.value = data.apiKey;
      modelSelect.value = data.model;
      temperatureSlider.value = data.temperature;
      temperatureValue.textContent = data.temperature;
      maxTokensInput.value = data.maxTokens;
      enableCacheToggle.checked = data.cacheEnabled;
    }
  );

  // Save state changes
  enableToggle.addEventListener("change", function () {
    chrome.storage.sync.set({
      isEnabled: enableToggle.checked,
    });
  });

  // Save API settings
  document
    .getElementById("saveApiSettings")
    .addEventListener("click", function () {
      const apiKey = apiKeyInput.value.trim();
      const model = modelSelect.value;
      const statusElement = document.getElementById("apiStatus");

      if (!apiKey) {
        statusElement.textContent = "Please enter an API key";
        statusElement.className = "status error";
        return;
      }

      chrome.storage.sync.set(
        {
          apiKey: apiKey,
          model: model,
        },
        function () {
          statusElement.textContent = "API settings saved!";
          statusElement.className = "status success";

          // Send message to update settings
          chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "updateSettings",
                settings: { apiKey, model },
              });
            }
          );

          // Clear status after 3 seconds
          setTimeout(() => {
            statusElement.className = "status";
          }, 3000);
        }
      );
    });

  // Save advanced settings
  document
    .getElementById("saveAdvancedSettings")
    .addEventListener("click", function () {
      const temperature = parseFloat(temperatureSlider.value);
      const maxTokens = parseInt(maxTokensInput.value);
      const cacheEnabled = enableCacheToggle.checked;
      const statusElement = document.getElementById("advancedStatus");

      chrome.storage.sync.set(
        {
          temperature: temperature,
          maxTokens: maxTokens,
          cacheEnabled: cacheEnabled,
        },
        function () {
          statusElement.textContent = "Advanced settings saved!";
          statusElement.className = "status success";

          // Send message to update settings
          chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "updateSettings",
                settings: { temperature, maxTokens, cacheEnabled },
              });
            }
          );

          // Clear status after 3 seconds
          setTimeout(() => {
            statusElement.className = "status";
          }, 3000);
        }
      );
    });
});
