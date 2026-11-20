import { Router } from 'express';
import { viewerOf } from '../../middleware/routeHelpers';
import { getDashboard } from './dashboard.service';

/** Moduł Pulpit: treść zależna od roli z `req.user`; podpięty w app.ts przez mountModule (role z nawigacji). */
export const dashboardRoutes = Router();

dashboardRoutes.get('/', async (req, res) => {
  res.json(await getDashboard(viewerOf(req.user)));
});
