import 'dotenv/config';
import app from './app.js';
import { connectDB } from './db/pool.js';
import { startAlertCron } from './services/alertService.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Try DB but don't crash server if it fails — useful during dev
  try {
    await connectDB();
  } catch (err) {
    console.warn('⚠️  Server starting WITHOUT DB connection. Fix DATABASE_URL to enable DB features.');
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
