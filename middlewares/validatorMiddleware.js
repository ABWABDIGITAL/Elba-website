import {validationResult} from "express-validator";
import { StatusCodes } from "http-status-codes";

export const validatorMiddleware = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(StatusCodes.BAD_REQUEST).json({ errors: errors.array(), message: "Validation error" });
    }
    next();
};

export default validatorMiddleware;
