import { Request, Response, NextFunction } from 'express';

type ControllerFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler =
  (fn: ControllerFunction) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
