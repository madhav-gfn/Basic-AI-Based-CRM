import { Response } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  res.status(statusCode).json(response);
}

export function sendError(res: Response, message: string, statusCode = 500, error?: string) {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error && { error }),
  };
  res.status(statusCode).json(response);
}
