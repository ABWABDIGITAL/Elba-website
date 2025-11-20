import express from "express";
import { validateRegister , validateLogin } from "../validators/auth.validators.js";
import { 
    registerController , 
    loginController , 
    logoutController , 
    forgetPasswordController , 
    verifyResetPasswordController , 
    resetPasswordController
} from "../controllers/auth.controller.js";
const router = express.Router();

router.post("/register", validateRegister, registerController);

router.post("/login", validateLogin, loginController);

router.post("/logout", logoutController);

router.post("/forget-password", forgetPasswordController);

router.post("/verify-reset-password", verifyResetPasswordController);

router.post("/reset-password", resetPasswordController);

export default router;
