chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["patients", "sessions"]);
  if (!existing.patients) {
    await chrome.storage.local.set({ patients: {}, sessions: {} });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
