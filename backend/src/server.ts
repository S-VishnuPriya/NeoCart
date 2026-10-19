import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { prisma } from './db.js';

const PORT = parseInt(process.env.PORT || '5000', 10);
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🛒 NeoCart Backend (Developer A) is RUNNING`);
  console.log(`📡 Port:        ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health:      http://localhost:${PORT}/health`);
  console.log(`🚀 API Base:    http://localhost:${PORT}/api/v1`);
  console.log(`=================================================\n`);
});

// Graceful Shutdown Handling
async function handleShutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await prisma.$disconnect();
    console.log('[Database] Prisma client disconnected.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
