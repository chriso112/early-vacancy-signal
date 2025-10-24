# Early Vacancy Signal — Germany (MVP)

This is a simple, local-first **Vite + React + Tailwind** app that scores *early signals* of soon-to-open roles.

## Run locally
1) Install Node.js LTS (18 or newer).
2) In a terminal:
```bash
cd early-vacancy-signal
npm install
npm run dev
```
3) Open the printed `http://localhost:5173` URL.

## Build for static hosting
```bash
npm run build
npm run preview   # to test the build locally
```

## Deploy
- **Vercel**: Import this folder as a project (Framework: Vite). No extra config needed.
- **Netlify**: Build command `npm run build`, Publish directory `dist`.
- **Static**: Upload the `dist/` folder anywhere.

## Notes
- Data is mocked for now. The **Run discovery** button is a stub. Under the hood, connect it to your ingestion API.
- You can edit **signal weights**, **keyword themes**, and **sources** directly in the UI.
- Use **Export CSV** to download the current lead list.
