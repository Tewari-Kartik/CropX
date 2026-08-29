import 'dotenv/config';
import app from './app.js';
import { connectDB } from './db/pool.js';
import { startAlertCron } from './services/alertService.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

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
