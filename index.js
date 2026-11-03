
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

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    req.user = session.user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

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

// Create a booking
app.post("/api/bookings", requireAuth, async (req, res) => {
  try {
    const { studioId, bookingDate, startTime, duration } = req.body;

    if (
      !studioId ||
      !ObjectId.isValid(studioId) ||
      !bookingDate ||
      !startTime ||
      !duration
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all booking information",
      });
    }

    const selectedDuration = Number(duration);

    if (![1, 2, 3, 4].includes(selectedDuration)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking duration",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking date",
      });
    }

    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid start time",
      });
    }

    const studio = await db.collection("studios").findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found",
      });
    }

    if (studio.available === false) {
      return res.status(400).json({
        success: false,
        message: "This studio is not available",
      });
    }

    const booking = {
      userId: req.user.id,
      userEmail: req.user.email,
      studioId: new ObjectId(studioId),
      studioName: studio.name,
      bookingDate,
      startTime,
      duration: selectedDuration,
      status: "confirmed",
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(booking);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: {
        _id: result.insertedId,
        ...booking,
      },
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
});

// Get logged-in user's bookings
app.get("/api/bookings/my", requireAuth, async (req, res) => {
  try {
    const bookings = await db
      .collection("bookings")
      .find({
        userId: req.user.id,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

// Cancel a booking
app.patch("/api/bookings/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const result = await db.collection("bookings").updateOne(
      {
        _id: new ObjectId(id),
        userId: req.user.id,
        status: "confirmed",
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or already cancelled",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Booking cancellation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`StudioSpace Server running on port ${PORT}`);
});