import { cleanEnv, str, num, makeValidator } from "envalid";

const nodeEnv = makeValidator((v) => {
  if (!["development", "production", "test"].includes(v)) {
    throw new Error("NODE_ENV must be development | production | test");
  }
  return v as "development" | "production" | "test";
});

export const config = cleanEnv(process.env, {
  NODE_ENV: nodeEnv({ default: "development" }),
  PORT: num({ default: 4000 }),
  HOST: str({ default: "0.0.0.0" }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
  JWT_EXPIRES_IN: str({ default: "15m" }),
  CORS_ORIGIN: str({ default: "http://localhost:5173,http://localhost:5174" }),
  SENSOR_WEBHOOK_SECRET: str({ default: "dev-sensor-secret" }),
  ANPR_WEBHOOK_SECRET: str({ default: "dev-anpr-secret" }),
  SENTRY_DSN: str({ default: "" }),
});
