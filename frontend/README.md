# Civora Frontend

React 19 + Vite UI for Civora. Setup, accounts and the full workflow are in the [root README](../README.md).

```bat
npm install
copy .env.example .env.local
npm run dev        :: http://localhost:5173 (proxies /api to VITE_BACKEND_ORIGIN)
npm run build      :: production bundle in dist/
npm run lint
```

The backend must be running for anything beyond the static pages. See `BACKEND_INTEGRATION_SPEC.md` for the API contract the UI expects.
