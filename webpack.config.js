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
    // Firefox requires UUIDs to be wrapped in curly braces
    const newId = `{${crypto.randomUUID()}}`;
    fs.writeFileSync(idFile, newId, "utf8");
    return newId;
  }
};
const FIREFOX_ID = getFirefoxId();

// ==========================================
// 1. THE SWITCHBOARD (Edit this for new projects)
// ==========================================
const EXT_CONFIG = {
  meta: {
    name: "My Extension",
    version: "1.0",
    description: "A web browser extension.",
  },

  // True/False toggles for standard permissions
  permissions: {
    storage: true,
    activeTab: true,
    scripting: true,
    tabs: false,
    contextMenus: false,
    alarms: false,
    downloads: false,
  },

  // True/False toggles for URL access
  hostPermissions: {
    "https://*.youtube.com/*": true,
    "https://*.github.com/*": false,
    "<all_urls>": false,
  },

  // True/False toggles for extension features
  features: {
    popup: true, // Requires src/popup.html & src/popup.js
    sidepanel: false, // Requires src/sidepanel.html & src/sidepanel.js
    devtools: false, // Requires src/devtools.html/js & src/panel.html/js
    background: false, // Requires src/background.js
    libsFolder: false, // Copies src/libs folder which may contain different js libraries
  },

  // Configure all Content Scripts here
  contentScripts: {
    default: {
      enabled: true, // Requires src/content.js
      matches: ["<all_urls>", "https://*.youtube.com/*"],
      css: true, // Requires import './content.css' inside content.js
    },
    extra: [
      {
        enabled: false,
        name: "content_website1", // Requires src/content_website1.js
        matches: ["https://*.youtube.com/*"],
        css: true, // Requires import './content_website1.css' inside JS
      },
      {
        enabled: false, // Toggle off to exclude from build
        name: "content_website2", // Requires src/content_website2.js
        matches: ["https://*.github.com/*"],
        css: false,
      },
    ],
  },
};

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

  // Compile active content scripts
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
          id: FIREFOX_ID, // Automatically uses the generated/persisted UUID
          data_collection_permissions: {
            required: ["none"],
          },
        },
      },
    }),
  };
};

// ==========================================
// 3. IN-MEMORY MANIFEST PLUGIN
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
    entry.panel = "./src/panel.js";
  }

  // Inject enabled content scripts into Webpack entry points
  if (EXT_CONFIG.contentScripts.default.enabled) {
    entry.content = "./src/content.js";
  }

  EXT_CONFIG.contentScripts.extra.forEach((script) => {
    if (script.enabled) {
      entry[script.name] = `./src/${script.name}.js`;
    }
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
    addHtml("panel");
  }

  const copyPatterns = [
    { from: "./src/assets/", to: "assets", noErrorOnMissing: true },
  ];

  if (EXT_CONFIG.features.libsFolder) {
    copyPatterns.push({
      from: "./src/libs/",
      to: "libs",
      noErrorOnMissing: true,
    });
  }

  return {
    mode: isProduction ? "production" : "development",
    entry,
    output: {
      path: path.join(outputDir, browser),
      filename: "[name].js",
      clean: true,
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
      new CopyWebpackPlugin({
        patterns: copyPatterns,
      }),
    ],
    watch: !isProduction,
  };
};

module.exports = [createConfig("chrome"), createConfig("firefox")];
