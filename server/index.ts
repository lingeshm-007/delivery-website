import { createApp } from './app.js';

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`[FleetWise] Server active and listening on http://localhost:${PORT}`);
  console.log(`[FleetWise] Health diagnostics available at http://localhost:${PORT}/api/health`);
});
