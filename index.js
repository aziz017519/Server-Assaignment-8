
import { ObjectId } from "mongodb";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth, db } from "./auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================
// Middleware
// ===============================

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// Better Auth route
app.all("/api/auth/*splat", toNodeHandler(auth));

// ===============================
// Authentication Middleware
// ===============================

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

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// ===============================
// Home Route
// ===============================

app.get("/", (req, res) => {
  res.send("Welcome to StudioSpace Server!");
});

// ===============================
// STUDIO APIs
// ===============================

// Get all studios
app.get("/api/studios", async (req, res) => {
  try {
    const studios = await db
      .collection("studios")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: studios.length,
      data: studios,
    });
  } catch (error) {
    console.error("Fetch studios error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studios",
    });
  }
});

// Get logged-in user's studios
// IMPORTANT: Keep this route before /api/studios/:id
app.get("/api/studios/my", requireAuth, async (req, res) => {
  try {
    const studios = await db
      .collection("studios")
      .find({ ownerId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: studios.length,
      data: studios,
    });
  } catch (error) {
    console.error("My studios error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch your studios",
    });
  }
});

// Get single studio
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
    console.error("Single studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studio",
    });
  }
});

// Add new studio
app.post("/api/studios", requireAuth, async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      location,
      image,
      securityDeposit,
      maxCapacity,
      amenities,
      overview,
    } = req.body;

    if (
      !name?.trim() ||
      !category?.trim() ||
      price === undefined ||
      !location?.trim() ||
      !image?.trim() ||
      !overview?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required information",
      });
    }

    const numericPrice = Number(price);
    const numericDeposit = Number(securityDeposit ?? 0);
    const numericCapacity = Number(maxCapacity ?? 1);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0 ||
      !Number.isFinite(numericDeposit) ||
      numericDeposit < 0 ||
      !Number.isInteger(numericCapacity) ||
      numericCapacity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid price, deposit and capacity",
      });
    }

    const newStudio = {
      name: name.trim(),
      category: category.trim(),
      price: numericPrice,
      location: location.trim(),
      image: image.trim(),
      securityDeposit: numericDeposit,
      maxCapacity: numericCapacity,
      amenities: Array.isArray(amenities) ? amenities : [],
      overview: overview.trim(),
      ownerId: req.user.id,
      ownerEmail: req.user.email,
      hostName: req.user.name || "",
      available: true,
      rating: 0,
      createdAt: new Date(),
    };

    const result = await db
      .collection("studios")
      .insertOne(newStudio);

    res.status(201).json({
      success: true,
      message: "Studio added successfully",
      data: {
        _id: result.insertedId,
        ...newStudio,
      },
    });
  } catch (error) {
    console.error("Add studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add studio",
    });
  }
});

// Update studio
app.put("/api/studios/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
    }

    const {
      name,
      category,
      price,
      location,
      image,
      securityDeposit,
      maxCapacity,
      amenities,
      overview,
    } = req.body;

    if (
      !name?.trim() ||
      !category?.trim() ||
      price === undefined ||
      !location?.trim() ||
      !image?.trim() ||
      !overview?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required information",
      });
    }

    const numericPrice = Number(price);
    const numericDeposit = Number(securityDeposit ?? 0);
    const numericCapacity = Number(maxCapacity ?? 1);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0 ||
      !Number.isFinite(numericDeposit) ||
      numericDeposit < 0 ||
      !Number.isInteger(numericCapacity) ||
      numericCapacity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid price, deposit and capacity",
      });
    }

    const updatedData = {
      name: name.trim(),
      category: category.trim(),
      price: numericPrice,
      location: location.trim(),
      image: image.trim(),
      securityDeposit: numericDeposit,
      maxCapacity: numericCapacity,
      amenities: Array.isArray(amenities) ? amenities : [],
      overview: overview.trim(),
      updatedAt: new Date(),
    };

    const result = await db.collection("studios").updateOne(
      {
        _id: new ObjectId(id),
        ownerId: req.user.id,
      },
      {
        $set: updatedData,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or you are not the owner",
      });
    }

    res.status(200).json({
      success: true,
      message: "Studio updated successfully",
    });
  } catch (error) {
    console.error("Update studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update studio",
    });
  }
});

// Delete studio
app.delete("/api/studios/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
    }

    const result = await db.collection("studios").deleteOne({
      _id: new ObjectId(id),
      ownerId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or you are not the owner",
      });
    }

    res.status(200).json({
      success: true,
      message: "Studio deleted successfully",
    });
  } catch (error) {
    console.error("Delete studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete studio",
    });
  }
});

// ===============================
// BOOKING APIs
// ===============================

// Create booking
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
      status: "pending",
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(booking);

    res.status(201).json({
      success: true,
      message: "Booking created successfully. Waiting for host confirmation.",
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
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Fetch bookings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

// Cancel pending booking
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
        status: "pending",
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
        message: "Pending booking not found or cannot be cancelled",
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

// ===============================
// Test Route
// ===============================

// Development only: view all bookings
app.get("/api/test-bookings", async (req, res) => {
  try {
    const bookings = await db
      .collection("bookings")
      .find({})
      .toArray();

    res.status(200).json({
      success: true,
      database: db.databaseName,
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Test bookings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

// ===============================
// Start Server
// ===============================

app.listen(PORT, () => {
  console.log(`StudioSpace Server running on port ${PORT}`);
});
