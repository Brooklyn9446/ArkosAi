import './dotenv-init';
import { initWorker } from './lib/queue/worker';
console.log('[Worker] Starting worker...');
initWorker();