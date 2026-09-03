<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d37232c1-786d-4a66-9ee0-e5d1505f0a62

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Create `firebase-applet-config.json` by copying `firebase-applet-config.example.json` and filling in your Firebase project credentials (this file is git-ignored)
4. Run the app:
   `npm run dev`
