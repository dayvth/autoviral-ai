import rateLimit from 'express-rate-limit';

interface Options {
  max?: number;
  window?: number; // ms
}

export function rateLimiter({ max = 100, window = 60_000 }: Options = {}) {
  return rateLimit({
    windowMs: window,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { message: 'Too many requests, please slow down.', code: 'RATE_LIMITED' },
    },
  });
}
