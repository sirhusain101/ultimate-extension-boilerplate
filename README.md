# Ultimate Extension Boilerplate

A boilerplate template for Chrome and Firefox Extensions with webpack, minification, live update, seperate manifest generation and more.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Structure](#structure)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js
- npm (comes with Node.js)

## Installation

### 1. Create a Repo:

Use the `"Use this template"` button to create a new repository for your extension based on this template.

### 2. Change the License and Readme:

The first thing to do after creating your repository from this template is to change the `LICENSE` and `README` files to reflect your extension's.

### 3. Clone your repository:

```
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 4. Install the dependencies:

```
npm install
```

## Structure

```
your-repo-name/
├── dist/                   # Production build output
│   ├── Chrome/             # Minified package for distribution
│   └── Firefox/            # Minified package for distribution
├── live/                   # Development build output
│   ├── Chrome/             # Unminified package for debugging
│   └── Firefox/            # Unminified package for debugging
├── src/                    # Source files
│   ├── assets/             # Icons and images
│   ├── background.js       # Background script
│   ├── content.js          # Content script
│   ├── content.css         # Content styles
│   ├── popup.js            # Popup page script
│   ├── popup.html          # Popup HTML
│   ├── popup.css           # Popup styles
│   ├── sidepanel.js        # Sidepanel page script
│   ├── sidepanel.html      # Sidepanel HTML
│   ├── sidepanel.css       # Sidepanel styles
│   ├── devtools.js         # Devtools page script
│   ├── devtools.html       # Devtools HTML
│   ├── devtools.css        # Devtools styles
│   └── rate_extension.html # Rate extension page
├── webpack.config.js       # Webpack configuration
├── manifest.template.json  # Manifest template
├── package.json            # Project metadata and dependencies
├── package-lock.json       # File for dependency versions
├── LICENSE                 # License file - REPLACE THIS
├── README.md               # Project documentation - REPLACE THIS
└── .gitignore              # Git ignore file
```

## Usage

- ### Coding the Extension:

  - **Modify the Manifest:**

    - Update the `manifest.template.json` file to reflect your extension's name, description, permissions, and other settings.
    - You may need to add or delete manifest keys in the `generateManifest` function in `webpack.config.js` depending on your extension's requirements.
    - For Firefox, make sure to include the UUID in the `manifest.template.json` file under the `browser_specific_settings` key.
    - The `generateManifest` function in `webpack.config.js` will create the appropriate manifest for Chrome and Firefox based on this template.

  - **Add Your Code:**

    - Write your extension's code in the js, html and css files under the `src/` directory.
    - Delete unnecessary files.

  - **Assets:**

    - Place any icons or images in the `src/assets/` directory.

  - **Webpack Configuration:**

    - The `webpack.config.js` file contains the configuration for building your extension. You can modify the entry points, output paths, and other settings as needed.

- ### Live Update:

  - To start developing your extension, run the following command:

    ```
    npm run dev
    ```

  - This command will:

    - Set the environment to development.
    - Start Webpack in watch mode, which will automatically rebuild your extension when you make changes to the source files.
    - Output the built files to the `live/` directory for each browser.

  - You can load the extension in your browser for testing:

    Chrome:

    - Open Chrome and navigate to `chrome://extensions/`.
    - Enable "Developer mode" in the top right corner.
    - Click "Load unpacked" and select the `live/chrome` directory.

    Firefox:

    - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
    - Click "Load Temporary Add-on" and select the `live/firefox/manifest.json` file.

- ### Building for Distribution:

  - When you're ready to build your extension for production, run the following command:

    ```
    npm run build
    ```

  - This command will:

    - Set the environment to production.
    - Minify your JavaScript and CSS files.
    - Output the built files to the `dist/` directory for each browser.

  - You can then load the production build in your browser using the same steps as above, but selecting the `dist/chrome` or `dist/firefox` directories.

## Contributing

If you have any suggestions, feedback, or want to contribute to this template, feel free to do so! Here are a few ways you can contribute:

- ### Open Issues:

  If you encounter any bugs or have feature requests, please open an issue in the repository.

- ### Submit Pull Requests:

  If you have improvements or fixes, you can submit a pull request. Please ensure that your code follows the project's coding style and includes appropriate tests if applicable.

- ### Documentation:

  Help improve the documentation by suggesting edits or adding new sections that could benefit other users.

- ### Share Your Experience:
  If you use this template for your own projects, consider sharing your experience or any modifications you made that could help others.

Your contributions are greatly appreciated and help make this template better for everyone!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
