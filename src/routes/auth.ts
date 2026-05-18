import { Router } from "express";
import * as authController from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema } from "../utils/validators";

const router = Router();

// Public
router.post("/register", validate(registerSchema), authController.register);
router.post("/login",    validate(loginSchema),    authController.login);
router.post("/refresh",                            authController.refresh);

// Protected
router.post("/logout", authenticate, authController.logout);
router.get("/me",      authenticate, authController.getMe);

export default router;
