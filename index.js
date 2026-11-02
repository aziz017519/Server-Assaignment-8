
import { ObjectId } from "mongodb";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth, db } from "./auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Better Auth route
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("Welcome to StudioSpace Server!");
});

// Get all studios
app.get("/api/studios", async (req, res) => {
  try {
    const studios = await db
      .collection("studios")
      .find({})
      .toArray();

    res.status(200).json({
      success: true,
      data: studios,
    });
  } catch (error) {
    console.error("Error fetching studios:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studios",
    });
  }
});

// Get single studio by ID
app.get("/api/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
    }

    const studio = await db.collection("studios").findOne({
      _id: new ObjectId(id),
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found",
      });
    }

    res.status(200).json({
      success: true,
      data: studio,
    });
  } catch (error) {
    console.error("Error fetching studio:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studio",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`StudioSpace Server running on port ${PORT}`);
});
