import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure we load .env from the backend directory and OVERRIDE any stale shell variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ 
  path: path.join(__dirname, '../.env'),
  override: true 
});
