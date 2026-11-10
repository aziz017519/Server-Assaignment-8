
import "dotenv/config";

import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@better-auth/mongo-adapter";

// Check MongoDB environment variable
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from .env file");
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is missing from .env file");
}

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);

await client.connect();

console.log("MongoDB Connected Successfully!");

// Database
export const db = client.db("StudioSpace");

// Better Auth configuration
export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: [
    "http://localhost:3000",
  ],

  emailAndPassword: {
    enabled: true,
  },
});
