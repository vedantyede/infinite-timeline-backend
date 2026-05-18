import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const config = {
  env: optional("NODE_ENV", "development"),
  port: parseInt(optional("PORT", "5000"), 10),

  mongo: {
    uri: required("MONGODB_URI"),
    options: {
      // Connection pool — tune for your workload
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    },
  },

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: optional("JWT_EXPIRES_IN", "7d"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    refreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "30d"),
  },

  rateLimit: {
    windowMs: parseInt(optional("RATE_LIMIT_WINDOW_MS", "900000"), 10),
    max: parseInt(optional("RATE_LIMIT_MAX", "100"), 10),
  },

  cors: {
    allowedOrigins: optional("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
  },

  pagination: {
    defaultSize: parseInt(optional("DEFAULT_PAGE_SIZE", "20"), 10),
    maxSize: parseInt(optional("MAX_PAGE_SIZE", "100"), 10),
  },
} as const;

export default config;
