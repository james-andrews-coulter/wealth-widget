// config.js - Environment detection and path resolution
// Enables git-ready development with iCloud production deployment

const CONFIG = {
  transactionsFileName: "transactions.csv",
  pricesFileName: "prices.csv",
  currencySymbol: "EUR",
  iCloudFolderName: "WealthWidget",
  gitRepoPath: "/Users/jamesalexander/wealth_widget/data"
};

// Detect if running in development (local) or production (widget)
function isDevelopment() {
  // When running as widget, config.runsInWidget is true
  // In development/testing, it's typically false or undefined
  return !config.runsInWidget;
}

// Get FileManager instance (iCloud or local)
function getFileManager() {
  if (isDevelopment()) {
    return FileManager.local();
  } else {
    return FileManager.iCloud();
  }
}

// Get data directory path based on environment
function getDataPath() {
  const fm = getFileManager();

  if (isDevelopment()) {
    // Development: Use local git repo
    return CONFIG.gitRepoPath;
  } else {
    // Production: Use iCloud
    const docsDir = fm.documentsDirectory();
    return fm.joinPath(docsDir, CONFIG.iCloudFolderName);
  }
}

// Get full path for transactions file
function getTransactionsPath() {
  const fm = getFileManager();
  const dataPath = getDataPath();
  return fm.joinPath(dataPath, CONFIG.transactionsFileName);
}

// Get full path for prices cache file
function getPricesPath() {
  const fm = getFileManager();
  const dataPath = getDataPath();
  return fm.joinPath(dataPath, CONFIG.pricesFileName);
}

// Ensure data directory exists
async function ensureDataDirectory() {
  const fm = getFileManager();
  const dataPath = getDataPath();

  if (!fm.fileExists(dataPath)) {
    fm.createDirectory(dataPath, true);
  }

  // Wait for iCloud sync if needed
  if (!isDevelopment() && !fm.isFileDownloaded(dataPath)) {
    await fm.downloadFileFromiCloud(dataPath);
  }
}

export {
  CONFIG,
  isDevelopment,
  getFileManager,
  getDataPath,
  getTransactionsPath,
  getPricesPath,
  ensureDataDirectory
};
