// Simple .env file parser
async function loadEnv() {
  try {
    const url = chrome.runtime.getURL('.env');
    const response = await fetch(url);
    const text = await response.text();
    
    // Parse .env file
    const env = {};
    text.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;
      
      // Parse KEY=VALUE format
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        env[key] = value;
      }
    });
    
    return env;
  } catch (error) {
    console.error('Error loading .env file:', error);
    return {};
  }
}

export { loadEnv };