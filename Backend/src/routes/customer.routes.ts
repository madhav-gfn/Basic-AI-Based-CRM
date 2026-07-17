import { Router } from "express";
import {
  getAllCustomers,
  getDashboardStats,
  getCustomerProfile,
  getCustomerMetrics,
  getTopCustomers,
  searchCustomers,
  getCustomerActivity,
} from "../controllers/customer.controller";

const router = Router();

// GET /api/customers — paginated list
router.get("/", getAllCustomers);

// GET /api/customers/dashboard — dashboard stats
router.get("/dashboard", getDashboardStats);

// GET /api/customers/search — free-text + faceted search (must precede /:id)
router.get("/search", searchCustomers);

// GET /api/customers/top
router.get("/top", getTopCustomers);

// GET /api/customers/:id
router.get("/:id", getCustomerProfile);

// GET /api/customers/:id/metrics
router.get("/:id/metrics", getCustomerMetrics);

// GET /api/customers/:id/activity — unified order + communication timeline
router.get("/:id/activity", getCustomerActivity);

export default router;
