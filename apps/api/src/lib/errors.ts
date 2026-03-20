import { FastifyError } from "fastify";

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "AppError";
  }
}

export const Errors = {
  notFound: (resource: string) => new AppError(404, "NOT_FOUND", `${resource} not found`),
  forbidden: (msg = "Access denied") => new AppError(403, "FORBIDDEN", msg),
  badRequest: (msg: string) => new AppError(400, "BAD_REQUEST", msg),
  conflict: (msg: string) => new AppError(409, "CONFLICT", msg),
  unauthorized: () => new AppError(401, "UNAUTHORIZED", "Authentication required"),
};

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
