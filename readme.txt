# MBBS Command Center — shareable PWA

## What this is
A mobile-friendly Progressive Web App (PWA). Host this folder once and share the resulting HTTPS URL. Android users can open the URL in Chrome and install it from the browser menu. It also works offline after the first successful load.

## Publish it using Netlify Drop (no coding needed)
1. Extract `mbbs-command-center-pwa.zip` on your computer.
2. Open https://app.netlify.com/drop in a browser.
3. Drag the extracted `mbbs-command-center-pwa` folder onto the page.
4. Netlify will publish it and show you a public `https://....netlify.app` URL.
5. Copy that URL and share it. Anyone with the link can open the app.
6. To change the app later, upload the updated folder again.

You may need to sign in/create a free Netlify account. Hosting providers can change their free-tier terms.

## Android installation
1. Open the shared HTTPS link in Google Chrome.
2. Tap the browser's three-dot menu.
3. Choose **Install app** or **Add to Home screen**.
4. The app opens from the home screen like an app.

## Important data/privacy notes
- This version stores each person's subjects, tasks and settings in local browser storage on that device.
- Users do not see each other's study data. Sharing the link shares the app, not anyone's personal schedule.
- Export a JSON backup from Settings before clearing browser data or changing devices.
- There is no account login or cloud sync in this version.
- A PWA is installed from a link; it is not an APK file. If you specifically need an APK, it must be built and signed separately.

## Files
- `index.html`: app interface and logic
- `manifest.webmanifest`: install metadata
- `sw.js`: offline caching
- `icon.svg`: app icon
