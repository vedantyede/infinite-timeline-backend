import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/tokenService";
import { sendSuccess, sendError } from "../utils/response";
import { ConflictError, UnauthorizedError } from "../utils/errors";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password } = req.body as {
      name: string; email: string; password: string;
    };

    const exists = await User.findOne({ email });
    if (exists) throw new ConflictError("Email already registered");

    const user = await User.create({ name, email, passwordHash: password });

    const payload = { userId: (user._id as string).toString(), email: user.email };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Persist refresh token hash (optional; store hashed in production)
    user.refreshToken = refreshToken;
    await user.save();

    sendSuccess(res, { user, accessToken, refreshToken }, "Registration successful", 201);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await User.findOne({ email, isActive: true }).select("+passwordHash");
    if (!user) throw new UnauthorizedError("Invalid credentials");

    const valid = await user.comparePassword(password);
    if (!valid) throw new UnauthorizedError("Invalid credentials");

    const payload = { userId: (user._id as string).toString(), email: user.email };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    // Remove passwordHash from response object
    const userObj = user.toJSON();
    sendSuccess(res, { user: userObj, accessToken, refreshToken }, "Login successful");
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) throw new UnauthorizedError("Refresh token required");

    const payload = verifyRefreshToken(refreshToken);
    const user    = await User.findById(payload.userId).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const newPayload      = { userId: payload.userId, email: payload.email };
    const newAccessToken  = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    user.refreshToken = newRefreshToken;
    await user.save();

    sendSuccess(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, "Tokens refreshed");
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await User.findByIdAndUpdate(req.user!.userId, { refreshToken: null });
    sendSuccess(res, null, "Logged out successfully");
  } catch (err) {
    next(err);
  }
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) throw new UnauthorizedError();
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
