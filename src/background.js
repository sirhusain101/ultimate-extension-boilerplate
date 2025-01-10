// Remove this if extension doesn't use sidepanel/sidebar
// Sidepanel/Sidebar toggle with icon click
if (typeof browser !== "undefined") {
  // If Firefox
  browser.action.onClicked.addListener(() => {
    browser.sidebarAction.toggle();
  });
} else {
  // If Chromium
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

// Remove this if you don't need to set unintall page
// Uninstall page
chrome.runtime.setUninstallURL("");
