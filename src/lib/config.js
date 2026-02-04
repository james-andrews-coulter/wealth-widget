// config.js - Environment detection and path resolution
// Enables git-ready development with iCloud production deployment

const CONFIG = {
  transactionsFileName: "transactions.csv",
  pricesFileName: "prices.csv",
  currencySymbol: "EUR",
  iCloudFolderName: "WealthWidget",
  gitRepoPath: "/Users/jamesalexander/wealth_widget/data"
};

// Detect if running in development (local Mac) or production (iPhone/widget)
// Only true if the git repo path actually exists (i.e., on development Mac)
function isDevelopment() {
  try {
    const localFm = FileManager.local();
    return localFm.fileExists(CONFIG.gitRepoPath);
  } catch (e) {
    return false;
  }
}

// Get FileManager instance (local for Mac dev, iCloud for iPhone)
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
    // Development Mac: Use git repo path
    return CONFIG.gitRepoPath;
  } else {
    // iPhone/Production: Use iCloud
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

  try {
    if (!fm.fileExists(dataPath)) {
      fm.createDirectory(dataPath, true);
    }

    // Wait for iCloud sync if needed
    if (!isDevelopment() && !fm.isFileDownloaded(dataPath)) {
      await fm.downloadFileFromiCloud(dataPath);
    }
  } catch (e) {
    console.error("Could not ensure data directory: " + e);
    // Directory might already exist or we don't have permissions
    // Try to continue anyway
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
