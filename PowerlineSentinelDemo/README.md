# 4671-reinvent-grid-guardian-demo

## How to use
1. Unzip all the files
2. Open `index.html` in a browser (preferably Chrome)

If desired, the app can run in Chrome's fullscreen mode (F11 on Windows / Ctrl + Cmd + F on Mac)

The app is designed for fullHD resolution (1920x1080px).


## App contents

Application consists of a HTML document with JavaScript that controls visibility of elements according to the current step.
There is no back-end implemented in the application - it does not send any external requests to APIs or AI services. All the data used in the app is pre-generated and hardcoded.

- `index.html` file contains all the markup used in the application.
- `\assets\js\app.js` file contains all the functions for controlling the application state and ensure interactivity.
- Dropdown values for U.S. states and counties are fetched from JSON file located in `\assets\js\county-by-state.json`.
- Final step "Reports" data is fetched from JSON file located in `\assets\js\report-results.json`.
- Satelite images used in "Reports" are located in `images\reports` directory.
- Video clips used in the application are located in `images` directory.

## Main functionalities

Visibility of the subsequent screens is controlled with JavaScript and synchronized with the videos using video element JS event listeners such as video `ended`.
1. Step 1: Homepage screen. By clicking "Get started" button user triggers step 2.
2. Step 2: Automatic intro video playback. Video is not skippable. On video `end` event next step is triggered.
3. Step 3: Location selection screen. User can use dropdowns to select limited locations (U.S. states and counties). By clicking "Generate Report" user triggers step 4.
4. Step 4: Loading screen - application playbacks animation clip explaining the concepts behind the application. On video `end` event next step is triggered.
5. Step 5: Report screen - Application outputs report according to user selection from Step 3.


## Building the app

Changes introduced to `index.html` file are visible in the app immediately.
However, modifying any of the `.js` files, including JSON datasources such as `\assets\js\report-results.json` or `\assets\js\county-by-state.json`, require rebuilding the app:

1. Install node.js: https://nodejs.org/en/download/package-manager
2. In the root folder of the application run `npm install`
3. Run `npm run build`

