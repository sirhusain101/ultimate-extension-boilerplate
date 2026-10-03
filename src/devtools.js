// USE CASE 1: Top-Level Panel
// Creates a brand new, dedicated tab at the very top of the DevTools window (like Elements, Console, Network).
// Best for: Massive, standalone debugging tools that need a lot of screen space (e.g., React DevTools).
chrome.devtools.panels.create("My Panel", null, "devpanel.html", () => {});

// USE CASE 2: Elements Sidebar Pane
// Creates a sidebar pane inside the existing "Elements" tab (next to Styles, Computed, Event Listeners).
// Best for: Tools that specifically analyze or modify the HTML DOM node that the user has currently selected.
chrome.devtools.panels.elements.createSidebarPane("My Sidebar", (sidebar) => {
  sidebar.setPage("devpanel.html");
});