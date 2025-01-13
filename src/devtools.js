// Webpack imports
import "./devtools.css";

// Create a Sidebar Panel under Elements panel in dev console
chrome.devtools.panels.elements.createSidebarPane(
  "Sidebar Panel Name",
  (sidebar) => {
    sidebar.setPage("panel.html");
  }
);
