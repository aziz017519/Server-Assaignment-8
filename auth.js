import "dotenv/config";

import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import {
  baseURL,
  isProduction,
  trustedOrigins,
} from "./config.js";

// Check required environment variables early so a bad deploy fails with a clear error.
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from the environment variables");
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is missing from the environment variables");
}

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10_000,
});

await client.connect();

console.log("MongoDB Connected Successfully!");

// Database
export const db = client.db(process.env.MONGODB_DB_NAME || "StudioSpace");

// Better Auth configuration
export const auth = betterAuth({
  appName: "StudioSpace",
  database: mongodbAdapter(db, {
    client,
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL,

  trustedOrigins,

  emailAndPassword: {
    enabled: true,
  },

  advanced: {
    useSecureCookies: isProduction,
    trustedProxyHeaders: true,
    // Vercel forwards the client IP in these headers.
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
    },
    // The client and the API are deployed on different domains, so the session
    // cookie must be sent in cross-site requests.
    defaultCookieAttributes: isProduction
      ? {
          sameSite: "none",
          secure: true,
          partitioned: true,
        }
      : {
          sameSite: "lax",
          secure: false,
        },
  },
});
