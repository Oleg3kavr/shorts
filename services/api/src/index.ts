import { buildApp } from './app.js';

const app = buildApp();
const port = Number(process.env.PORT ?? 3001);

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`api listening on ${port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
