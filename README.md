<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1yyyOUmoFZklP3XMLzNiGmfR1cqItZpp5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` file in the project root and set the following environment variables:
   ```
   ARK_API_KEY=your_volcano_engine_doubao_api_key
   ARK_API_BASE=https://ark.cn-beijing.volces.com/api/v3
   ARK_MODEL=Doubao-Seed-1.6-flash
   ```
   Note: `ARK_API_BASE` and `ARK_MODEL` are optional, they have default values.
3. Run the app:
   `npm run dev`
