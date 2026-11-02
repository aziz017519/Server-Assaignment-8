
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGODB_URI);

app.use(cors());
app.use(express.json());

async function connectDB() {
  try {
    await client.connect();

    const db = client.db("StudioSpace");

    console.log("MongoDB Connected Successfully!");

    return db;
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.send("Welcome to StudioSpace Server!");
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`StudioSpace Server running on port ${PORT}`);
  });
}

startServer();
