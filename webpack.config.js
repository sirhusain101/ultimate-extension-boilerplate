const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const outputDir = path.resolve(__dirname, "dist");
const chromeOutputPath = path.resolve(outputDir, "chrome");
const firefoxOutputPath = path.resolve(outputDir, "firefox");

const liveDir = path.resolve(__dirname, "live");
const chromeLivePath = path.resolve(liveDir, "chrome");
const firefoxLivePath = path.resolve(liveDir, "firefox");

// Helper function to clean the output directory
const cleanDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        cleanDirectory(filePath); // Recursively clean subdirectories
      } else {
        fs.unlinkSync(filePath); // Delete the file
      }
    });
    fs.rmdirSync(dirPath); // Remove the empty directory
  }
};

// Ensure the directories exist for both dist and live folders
const ensureDirectoryExists = (dirPath, shouldCreate) => {
  if (shouldCreate && !fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Create directories exclusively for the current environment (dist/live)
const isProduction = process.env.NODE_ENV === "production"; // Check if we're in production mode

if (isProduction) {
  // If in production, ensure only the dist folder and its subdirectories are created
  cleanDirectory(chromeOutputPath); // Clean chrome dist folder
  cleanDirectory(firefoxOutputPath); // Clean firefox dist folder
  ensureDirectoryExists(outputDir, true);
  ensureDirectoryExists(chromeOutputPath, true);
  ensureDirectoryExists(firefoxOutputPath, true);
} else {
  // If in development, ensure only the live folder and its subdirectories are created
  ensureDirectoryExists(liveDir, true);
  ensureDirectoryExists(chromeLivePath, true);
  ensureDirectoryExists(firefoxLivePath, true);
}

// Function to generate the manifest for the selected browser
const generateManifest = (browser) => {
  const template = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "./manifest.template.json"),
      "utf-8"
    )
  );

  // Add/Remove/Modify manifest template based on browser here
  if (browser === "chrome") {
    template.action = {}; // Keep this blank for sidepanel extension
    delete template.sidebar_action;
    delete template.devtools_page;
    delete template.background.scripts;
    delete template.content_scripts;
    delete template.browser_specific_settings;
  } else if (browser === "firefox") {
    template.action = {}; // Keep this blank for sidebar extension
    delete template.side_panel;
    delete template.devtools_page;
    delete template.background.service_worker;
    delete template.content_scripts;
  }

  return template;
};

// Generate separate manifests for Chrome and Firefox depending on the environment (live vs dist)
const generateAndWriteManifest = (browser, isProduction) => {
  const manifest = generateManifest(browser, isProduction);

  const outputPath = isProduction
    ? browser === "chrome"
      ? chromeOutputPath
      : firefoxOutputPath
    : browser === "chrome"
    ? chromeLivePath
    : firefoxLivePath;

  fs.writeFileSync(
    path.resolve(outputPath, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
};

// Ensure correct manifests are written for both browsers based on the environment
if (isProduction) {
  // For production, generate manifests in dist folder
  generateAndWriteManifest("chrome", true);
  generateAndWriteManifest("firefox", true);
} else {
  // For development, generate manifests in live folder
  generateAndWriteManifest("chrome", false);
  generateAndWriteManifest("firefox", false);
}

const createConfig = (browser) => {
  const config = {
    mode: isProduction ? "production" : "development", // Set mode based on environment
    entry: {
      background: "./src/background.js",
      popup: "./src/popup.js",
      sidepanel: "./src/sidepanel.js",
      devtools: "./src/devtools.js",
      devtools: "./src/panel.js",
    },
    output: {
      path: isProduction
        ? path.join(outputDir, browser) // Output to dist folder in production
        : path.join(liveDir, browser), // Output to live folder in development
      filename: "[name].js",
    },
    devtool: false, // Use source maps in dev mode
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
      ],
    },
    optimization: {
      minimize: isProduction, // Only minify in production mode
      minimizer: isProduction
        ? [
            new TerserPlugin({
              terserOptions: {
                compress: {
                  drop_console: true, // Optional: Remove console logs
                },
              },
            }),
            new CssMinimizerPlugin(), // Minimize CSS in production mode
          ]
        : [], // No minimization in development mode
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/popup.html", // Extension popup
        filename: "popup.html",
        chunks: ["popup"],
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeAttributeQuotes: true,
            }
          : false, // Don't minify in dev mode
      }),
      new HtmlWebpackPlugin({
        template: "./src/sidepanel.html", // Chrome sidepanel, Firefox sidebar
        filename: "sidepanel.html",
        chunks: ["sidepanel"],
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeAttributeQuotes: true,
            }
          : false,
      }),
      new HtmlWebpackPlugin({
        template: "./src/devtools.html", // Chrome/Firefox dev console page, if you make extension that need access to dev console
        filename: "devtools.html",
        chunks: ["devtools"],
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeAttributeQuotes: true,
            }
          : false,
      }),
      new HtmlWebpackPlugin({
        template: "./src/panel.html", // Sidebar pane under Chrome/Firefox dev console Elements/Inspector panel, this has to be separate from devtools, otherwise firefox creates non-stop sidebar panes
        filename: "panel.html",
        chunks: ["panel"],
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeAttributeQuotes: true,
            }
          : false,
      }),
      new HtmlWebpackPlugin({
        template: "./src/rate_extension.html", // Link this page in popup/sidepanel if you want people to rate your extension
        filename: "rate_extension.html",
        chunks: [],
        minify: isProduction
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeAttributeQuotes: true,
            }
          : false,
      }),
      new MiniCssExtractPlugin({
        filename: "[name].css",
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "./src/assets/", to: "assets" }, // Keep icons and images in this folder
          { from: "./README.md", to: "" },
          { from: "./LICENSE", to: "" }, // IMPORTANT: Replace the license file with your extension's license file
        ],
      }),
    ],
    watch: !isProduction, // Enable watch mode only in development
    watchOptions: {
      aggregateTimeout: 1000, // Delay for rebuild after changes (ms)
      poll: 1000, // Check for changes every 1 second
    },
  };

  return config;
};

module.exports = [createConfig("chrome"), createConfig("firefox")];
