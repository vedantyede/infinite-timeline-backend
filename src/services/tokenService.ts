import jwt from "jsonwebtoken";
import config from "../config";
import { JwtPayload } from "../types";

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
}
