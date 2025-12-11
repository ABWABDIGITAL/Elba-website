import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import User from "../models/user.model.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ status: "error", message: "Unauthorized: No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).populate("role");

    if (!user) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ status: "error", message: "User no longer exists" });
    }

    if (user.status !== "active") {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ status: "error", message: "Account is inactive" });
    }

    if (user.isLocked) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ status: "error", message: "Account is locked" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ status: "error", message: "Invalid or expired token" });
  }
};

// export const allowTo = (...roles) => {
//     return (req, res, next) => {
//         if (!roles.includes(req.user.legacyRole)) {
//             return res
//                 .status(StatusCodes.FORBIDDEN)
//                 .json({ status: "error", message: "Forbidden" });
//         }
//         next();
//     };
// };
export const allowTo = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role?.name?.toLowerCase();

    const allowed = roles.map(r => r.toLowerCase());

    if (!allowed.includes(userRole)) {
      return res.status(StatusCodes.FORBIDDEN)
        .json({ status: "error", message: "Forbidden" });
    }

    next();
  };
};
