import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { SERVER_MESSAGES } from '@app/shared';
import { env } from './env';
import { authenticate } from './middleware/authenticate';
import { sendError } from './middleware/errors';
import { requireAuth } from './middleware/requireRole';
import { healthRoutes } from './modules/health/health.routes';

interface AppOptions {
  /** Dodatkowe trasy wymagające logowania (moduły dopisują się niżej; testy podają własne). */
  extraRoutes?: Router;
  /** Dodatkowe trasy publiczne, bez logowania (tylko w testach; w aplikacji dopisuj je niżej). */
  publicRoutes?: Router;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  // Na serwerze aplikacja stoi za Caddy: bez tego limit logowania liczyłby wszystkich jako jedną osobę.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(authenticate);

  const api = express.Router();

  // 1. Trasy PUBLICZNE (bez logowania): tylko te z „Mapy dostępu” w docs/SPEC-GENERAL.md,
  //    np. api.use('/auth', authPublicRoutes); formularze strony dla odwiedzających z limitem zapytań.
  api.use(healthRoutes);
  if (options.publicRoutes) api.use(options.publicRoutes);

  // 2. Od tego miejsca KAŻDA trasa wymaga logowania, także ta, przy której zapomniano requireRole.
  api.use(requireAuth);

  // 3. Moduły, z rolami ich pozycji w navigation.config.ts: mountModule(api, 'employees', employeesRoutes);
  if (options.extraRoutes) api.use(options.extraRoutes);
  app.use('/api', api);

  app.use('/api', (_req, res) => sendError(res, 404, SERVER_MESSAGES.notFound));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    sendError(res, 500, SERVER_MESSAGES.serverError);
  });
  return app;
}
