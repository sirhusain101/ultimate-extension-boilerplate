const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { webpack } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const { RawSource } = require("webpack").sources;

// ==========================================
// Firefox ID Persistence Logic
// ==========================================
const getFirefoxId = () => {
  const idFile = path.resolve(__dirname, ".firefox-id");
  if (fs.existsSync(idFile)) {
    return fs.readFileSync(idFile, "utf8").trim();
  } else {
    const newId = `{${crypto.randomUUID()}}`;
    fs.writeFileSync(idFile, newId, "utf8");
    return newId;
  }
};
const FIREFOX_ID = getFirefoxId();

// ==========================================
// 1. THE SWITCHBOARD
// ==========================================
const EXT_CONFIG = {
  meta: {
    name: "My Extension",
    version: "1.0",
    description: "A web browser extension.",
  },

  permissions: {
    storage: true,
    activeTab: true,
    scripting: true,
    tabs: false,
    contextMenus: false,
    alarms: false,
    downloads: false,
  },

  hostPermissions: {
    "https://*.youtube.com/*": true,
    "https://*.github.com/*": false,
    "<all_urls>": false,
  },

  features: {
    popup: true, // Requires src/popup.html & src/popup.js
    sidepanel: false, // Requires src/sidepanel.html & src/sidepanel.js
    devtools: false, // Requires src/devtools.html/js & src/devpanel.html/js
    background: true, // Requires src/background.js
    libsFolder: false, // Copies src/libs folder directly to output
    aboutFolder: {
      coffee: false, // Processes src/about/coffee.html (if true)
      rate: true, // Processes src/about/rate.html (if true)
      contact: true, // Processes src/about/contact.html (if true)
    },
  },

  contentScripts: {
    default: {
      enabled: true,
      matches: ["<all_urls>", "https://*.youtube.com/*"],
      css: true,
    },
    extra: [
      {
        enabled: false,
        name: "content_website1",
        matches: ["https://*.youtube.com/*"],
        css: true,
      },
      {
        enabled: false,
        name: "content_website2",
        matches: ["https://*.github.com/*"],
        css: false,
      },
    ],
  },
};

// ==========================================
// 1.5 AUTO-SCAFFOLDER
// ==========================================
const scaffoldFile = (filePath, content) => {
  const absolutePath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(path.dirname(absolutePath))) {
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  }
  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, content, "utf8");
    console.log(`✨ Auto-generated missing file: ${filePath}`);
  }
};

const templates = {
  html: (title) =>
    `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${title}</title>\n</head>\n<body>\n  <h1>${title} Loaded</h1>\n</body>\n</html>`,
  uiJs: (name) => `import "./${name}.css";`,
  uiCss: () =>
    `* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial;\n  padding: 16px;\n}`,
  bgJs: (hasSidepanel) => {
    let code = ``;
    if (hasSidepanel) {
      code += `\n// Open sidepanel on icon click (Chrome)\n`;
      code += `if (typeof chrome !== 'undefined' && chrome.sidePanel) {\n`;
      code += `  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });\n`;
      code += `}\n\n`;
      code += `// Open sidebar on icon click (Firefox)\n`;
      code += `if (typeof browser !== 'undefined' && browser.sidebarAction) {\n`;
      code += `  browser.action.onClicked.addListener(() => {\n`;
      code += `    browser.sidebarAction.toggle();\n`;
      code += `  });\n`;
      code += `}\n`;
    }
    return code;
  },
  contentJs: (name) => `import "./${name}.css";`,
  contentCss: () => ``,
  devtoolsJs: () => `// USE CASE 1: Top-Level Panel
chrome.devtools.panels.create("My Panel", null, "devpanel.html", () => {});

// USE CASE 2: Elements Sidebar Pane
chrome.devtools.panels.elements.createSidebarPane("My Sidebar", (sidebar) => {
  sidebar.setPage("devpanel.html");
});`,
};

const runScaffolder = () => {
  if (EXT_CONFIG.features.popup) {
    scaffoldFile("src/popup.html", templates.html("Popup"));
    scaffoldFile("src/popup.js", templates.uiJs("popup"));
    scaffoldFile("src/popup.css", templates.uiCss());
  }
  if (EXT_CONFIG.features.sidepanel) {
    scaffoldFile("src/sidepanel.html", templates.html("Sidepanel"));
    scaffoldFile("src/sidepanel.js", templates.uiJs("sidepanel"));
    scaffoldFile("src/sidepanel.css", templates.uiCss());
  }
  if (EXT_CONFIG.features.devtools) {
    scaffoldFile("src/devtools.html", templates.html("Devtools"));
    scaffoldFile("src/devtools.js", templates.devtoolsJs());
    scaffoldFile("src/devpanel.html", templates.html("DevPanel"));
    scaffoldFile("src/devpanel.js", templates.uiJs("devpanel"));
    scaffoldFile("src/devpanel.css", templates.uiCss());
  }
  if (EXT_CONFIG.features.background) {
    scaffoldFile(
      "src/background.js",
      templates.bgJs(EXT_CONFIG.features.sidepanel),
    );
  }

  const checkContentScript = (scriptObj) => {
    if (scriptObj.enabled) {
      const name = scriptObj.name || "content";
      scaffoldFile(`src/${name}.js`, templates.contentJs(name));
      if (scriptObj.css)
        scaffoldFile(`src/${name}.css`, templates.contentCss());
    }
  };

  checkContentScript({ ...EXT_CONFIG.contentScripts.default, name: "content" });
  EXT_CONFIG.contentScripts.extra.forEach(checkContentScript);
};

runScaffolder();

// ==========================================
// 2. MANIFEST GENERATOR
// ==========================================
const generateManifest = (browser) => {
  const activePermissions = Object.keys(EXT_CONFIG.permissions).filter(
    (key) => EXT_CONFIG.permissions[key],
  );

  if (EXT_CONFIG.features.sidepanel && browser === "chrome") {
    activePermissions.push("sidePanel");
  }

  const activeHostPermissions = Object.keys(EXT_CONFIG.hostPermissions).filter(
    (key) => EXT_CONFIG.hostPermissions[key],
  );

  const activeContentScripts = [];
  if (EXT_CONFIG.contentScripts.default.enabled) {
    activeContentScripts.push({
      matches: EXT_CONFIG.contentScripts.default.matches,
      js: ["content.js"],
      ...(EXT_CONFIG.contentScripts.default.css && { css: ["content.css"] }),
    });
  }

  EXT_CONFIG.contentScripts.extra.forEach((script) => {
    if (script.enabled) {
      activeContentScripts.push({
        matches: script.matches,
        js: [`${script.name}.js`],
        ...(script.css && { css: [`${script.name}.css`] }),
      });
    }
  });

  return {
    manifest_version: 3,
    name: EXT_CONFIG.meta.name,
    version: EXT_CONFIG.meta.version,
    description: EXT_CONFIG.meta.description,

    ...(activePermissions.length > 0 && { permissions: activePermissions }),
    ...(activeHostPermissions.length > 0 && {
      host_permissions: activeHostPermissions,
    }),

    ...(EXT_CONFIG.features.sidepanel && {
      action: {},
      ...(browser === "chrome"
        ? { side_panel: { default_path: "sidepanel.html" } }
        : {
            sidebar_action: {
              default_panel: "sidepanel.html",
              open_at_install: true,
            },
          }),
    }),

    ...(EXT_CONFIG.features.popup &&
      !EXT_CONFIG.features.sidepanel && {
        action: { default_popup: "popup.html" },
      }),

    ...(EXT_CONFIG.features.devtools && {
      devtools_page: "devtools.html",
    }),

    ...(activeContentScripts.length > 0 && {
      content_scripts: activeContentScripts,
    }),

    ...(EXT_CONFIG.features.background && {
      background:
        browser === "chrome"
          ? { service_worker: "background.js" }
          : { scripts: ["background.js"] },
    }),

    icons: {
      48: "assets/icon-48.png",
      128: "assets/icon-128.png",
    },

    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: FIREFOX_ID,
          data_collection_permissions: { required: ["none"] },
        },
      },
    }),
  };
};

// ==========================================
// 3. CUSTOM PLUGINS
// ==========================================
class GenerateManifestPlugin {
  constructor(browser) {
    this.browser = browser;
  }
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      "GenerateManifestPlugin",
      (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: "GenerateManifestPlugin",
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
          },
          () => {
            const content = JSON.stringify(
              generateManifest(this.browser),
              null,
              2,
            );
            compilation.emitAsset("manifest.json", new RawSource(content));
          },
        );
      },
    );
  }
}

class StrictSyncPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap("StrictSyncPlugin", (compilation) => {
      const outputPath = compiler.options.output.path;
      if (!fs.existsSync(outputPath)) return;

      const expectedFiles = new Set(Object.keys(compilation.assets));

      const walkDir = (dir, fileList = []) => {
        fs.readdirSync(dir).forEach((file) => {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isDirectory()) {
            walkDir(filePath, fileList);
          } else {
            fileList.push(
              path.relative(outputPath, filePath).split(path.sep).join("/"),
            );
          }
        });
        return fileList;
      };

      const physicalFiles = walkDir(outputPath);

      physicalFiles.forEach((file) => {
        if (!expectedFiles.has(file)) {
          fs.unlinkSync(path.join(outputPath, file));
          console.log(`🗑️ StrictSync removed ghost file: ${file}`);
        }
      });
    });
  }
}

// ==========================================
// 4. WEBPACK CONFIGURATION
// ==========================================
const isProduction = process.env.NODE_ENV === "production";
const outputDir = path.resolve(__dirname, isProduction ? "dist" : "live");

const createConfig = (browser) => {
  const entry = {};

  if (EXT_CONFIG.features.background) entry.background = "./src/background.js";
  if (EXT_CONFIG.features.popup) entry.popup = "./src/popup.js";
  if (EXT_CONFIG.features.sidepanel) entry.sidepanel = "./src/sidepanel.js";
  if (EXT_CONFIG.features.devtools) {
    entry.devtools = "./src/devtools.js";
    entry.devpanel = "./src/devpanel.js";
  }

  // Register Shared 'About' CSS directly (no JS file needed in your src folder)
  const about = EXT_CONFIG.features.aboutFolder;
  if (about.coffee || about.rate || about.contact) {
    entry.about = "./src/about/about.css";
  }

  if (EXT_CONFIG.contentScripts.default.enabled) {
    entry.content = "./src/content.js";
  }

  EXT_CONFIG.contentScripts.extra.forEach((script) => {
    if (script.enabled) entry[script.name] = `./src/${script.name}.js`;
  });

  const htmlPlugins = [];
  const addHtml = (name) =>
    htmlPlugins.push(
      new HtmlWebpackPlugin({
        template: `./src/${name}.html`,
        filename: `${name}.html`,
        chunks: [name],
        minify: isProduction
          ? { collapseWhitespace: true, removeComments: true }
          : false,
      }),
    );

  if (EXT_CONFIG.features.popup) addHtml("popup");
  if (EXT_CONFIG.features.sidepanel) addHtml("sidepanel");
  if (EXT_CONFIG.features.devtools) {
    addHtml("devtools");
    addHtml("devpanel");
  }

  // Register About HTML Pages
  const addAboutHtml = (name) =>
    htmlPlugins.push(
      new HtmlWebpackPlugin({
        template: `./src/about/${name}.html`,
        filename: `about/${name}.html`,
        chunks: ["about"], // Automatically injects about.css into the HTML
        minify: isProduction
          ? { collapseWhitespace: true, removeComments: true }
          : false,
      }),
    );

  if (about.coffee) addAboutHtml("coffee");
  if (about.rate) addAboutHtml("rate");
  if (about.contact) addAboutHtml("contact");

  const copyPatterns = [
    { from: "./src/assets/", to: "assets", noErrorOnMissing: true },
    { from: "./README.md", to: "" },
    { from: "./LICENSE", to: "" },
  ];

  if (EXT_CONFIG.features.libsFolder) {
    copyPatterns.push({
      from: "./src/libs/",
      to: "libs",
      no,
      ErrorOnMissing: true,
    });
  }

  return {
    mode: isProduction ? "production" : "development",

    cache: {
      type: "filesystem",
      buildDependencies: {
        config: [__filename],
      },
    },

    entry,
    output: {
      path: path.join(outputDir, browser),
      filename: "[name].js",
      clean: false,
    },
    devtool: false,
    module: {
      rules: [
        { test: /\.css$/, use: [MiniCssExtractPlugin.loader, "css-loader"] },
      ],
    },
    optimization: {
      minimize: isProduction,
      minimizer: isProduction
        ? [
            new TerserPlugin({
              terserOptions: { compress: { drop_console: true } },
            }),
            new CssMinimizerPlugin(),
          ]
        : [],
    },
    plugins: [
      ...htmlPlugins,
      new MiniCssExtractPlugin({ filename: "[name].css" }),
      new GenerateManifestPlugin(browser),
      new CopyWebpackPlugin({ patterns: copyPatterns }),
      new StrictSyncPlugin(),
    ],
    watch: !isProduction,

    watchOptions: {
      aggregateTimeout: 1000,
      ignored: /node_modules/,
    },
  };
};

module.exports = [createConfig("chrome"), createConfig("firefox")];
