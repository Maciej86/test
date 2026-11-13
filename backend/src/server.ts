import { createApp } from './app';
import { env } from './env';

env.JWT_SECRET; // sprawdzenie .env od razu przy starcie

createApp().listen(env.PORT, () => {
  console.log(`Backend działa: http://localhost:${env.PORT}/api/health`);
});
