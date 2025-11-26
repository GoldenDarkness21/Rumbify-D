## Rumbify — Local Development Access

### Quick Start
1. Install dependencies:
```bash
npm install
```
2. Start the server (watches with nodemon):
```bash
npm run start
```

By default the server runs on port 5050.

### Localhost Links
- **Root (redirects to app1)**: `http://localhost:5052/`

### Notes
- The start script uses `nodemon` and reads environment variables from a `.env` file if present.
- If you need a different port, update `PORT` in `index.js` and use that port in the links above.


