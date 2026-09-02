import './config.js';
import app from './app.js';
import { connectDB } from './db/pool.js';
import { initDb } from './db/initDb.js';
import { startAlertCron } from './services/alertService.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Try DB but don't crash server if it fails — useful during dev
  try {
    await connectDB();
    initDb().catch((e) => console.warn('⚠️ DB schema sync notice:', e.message));
  } catch (err) {
    console.warn('⚠️ Server running in resilient in-memory mode.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 CropX Backend running on port ${PORT}`);
    console.log(`📡 ENV: ${process.env.NODE_ENV}`);
  });

  // Start scheduled alert cron job (daily 6AM)
  startAlertCron();
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
