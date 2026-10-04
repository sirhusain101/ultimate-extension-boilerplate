
// Open sidepanel on icon click (Chrome)
if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

// Open sidebar on icon click (Firefox)
if (typeof browser !== 'undefined' && browser.sidebarAction) {
  browser.action.onClicked.addListener(() => {
    browser.sidebarAction.toggle();
  });
}
