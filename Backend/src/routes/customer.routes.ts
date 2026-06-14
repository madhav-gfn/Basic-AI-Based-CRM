import { Router } from "express";
import {
  getAllCustomers,
  getDashboardStats,
  getCustomerProfile,
  getCustomerMetrics,
  getTopCustomers,
} from "../controllers/customer.controller";

const router = Router();

// GET /api/customers — paginated list
router.get("/", getAllCustomers);

// GET /api/customers/dashboard — dashboard stats
router.get("/dashboard", getDashboardStats);

// GET /api/customers/top
router.get("/top", getTopCustomers);

// GET /api/customers/:id
router.get("/:id", getCustomerProfile);

// GET /api/customers/:id/metrics
router.get("/:id/metrics", getCustomerMetrics);

export default router;
