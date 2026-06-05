declare module 'express-serve-static-core' {
  interface Request {
    params: Record<string, string>;
    query: Record<string, string | undefined>;
  }
}

export {};
