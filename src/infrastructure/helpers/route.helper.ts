// src/infrastructure/helpers/route.helper.ts
import { Request, Response, NextFunction, Router } from 'express';

type ControllerMethod = (req: Request, res: Response, next: NextFunction) => Promise<void>;
type ControllerGetter = (req: Request) => any;

export const createRoute = (
  router: Router,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  path: string,
  controllerGetter: ControllerGetter,
  methodName: string
) => {
  router[method](path, (req: Request, res: Response, next: NextFunction) => {
    const controller = controllerGetter(req);
    return controller[methodName](req, res, next);
  });
};