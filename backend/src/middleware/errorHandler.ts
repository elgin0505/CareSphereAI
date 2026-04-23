import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[CareSphere Error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: 'Route not found' });
}
