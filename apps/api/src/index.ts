import { buildApp } from './app.js';
import { env } from './env.js';

const app = buildApp();

async function start(): Promise<void> {
  await app.listen({
    host: env.API_HOST,
    port: env.API_PORT,
  });

  app.log.info(`api ready on http://${env.API_HOST}:${env.API_PORT}`);
}

start().catch((error: unknown) => {
  app.log.error(error, 'unable to start api server');
  process.exit(1);
});
