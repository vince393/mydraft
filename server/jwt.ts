import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable is required");
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const DEVICE_SWITCH_TOKEN_EXPIRY_DAYS = 60;

export interface AccessTokenPayload {
  userId: string;
  type: "access";
}

export interface RefreshTokenPayload {
  userId: string;
  type: "refresh";
}

export function signAccessToken(userId: string): string {
  return jwt.sign(
    { userId, type: "access" } as AccessTokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function signRefreshToken(userId: string): string {
  const jti = randomBytes(16).toString("hex");
  return jwt.sign(
    { userId, type: "refresh" } as RefreshTokenPayload,
    JWT_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`, jwtid: jti }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
    if (payload.type !== "access") return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
    if (payload.type !== "refresh") return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}


export function getRefreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

export interface DeviceSwitchTokenPayload {
  userId: string;
  type: "device_switch";
}

export function signDeviceSwitchToken(userId: string): string {
  return jwt.sign(
    { userId, type: "device_switch" } as DeviceSwitchTokenPayload,
    JWT_SECRET,
    { expiresIn: `${DEVICE_SWITCH_TOKEN_EXPIRY_DAYS}d` }
  );
}

export function verifyDeviceSwitchToken(token: string): DeviceSwitchTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as DeviceSwitchTokenPayload;
    if (payload.type !== "device_switch") return null;
    return payload;
  } catch {
    return null;
  }
}

export const DEVICE_SWITCH_TOKEN_TTL_DAYS = DEVICE_SWITCH_TOKEN_EXPIRY_DAYS;
