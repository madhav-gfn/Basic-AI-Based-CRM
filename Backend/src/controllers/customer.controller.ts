import { Request, Response, NextFunction } from "express";
import { customerRepository } from "../repositories/customer.repository";
import { sendSuccess, sendError } from "../utils/response";

export async function getCustomerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await customerRepository.getCustomerProfile(req.params.id);
    if (!profile) {
      sendError(res, "Customer not found", 404);
      return;
    }
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}

export async function getCustomerMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const metrics = await customerRepository.getCustomerMetrics(req.params.id);
    sendSuccess(res, metrics);
  } catch (error) {
    next(error);
  }
}

export async function getTopCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const customers = await customerRepository.getTopCustomers(limit);
    sendSuccess(res, customers);
  } catch (error) {
    next(error);
  }
}
