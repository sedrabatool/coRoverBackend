const express = require("express");
const admin = require("firebase-admin");

// 1. Initialize app
const app = express();
app.use(express.json());

// 2. Connect Firebase
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 3. Firestore reference
const db = admin.firestore();

// 4. API to update rover location
app.post("/update-location", async (req, res) => {
  try {
    const { lat, lng, reached } = req.body;

    await db.collection("rover").doc("live").set({
      lat,
      lng
    });

    res.send("Location updated successfully");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error updating location");
  }
});

// 4. API to confirm that rover reached
app.post("/update-location", async (req, res) => {
  try {
    const { lat, lng } = req.body;

    await db.collection("rover").doc("live").set({
      lat,
      lng,
    });

    res.send("Location updated successfully");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error updating location");
  }
});

//api for updatin reached var
app.post("/reached", async (req, res) => {
  try {
    await db.collection("rover").doc("destination").set({ reached: true });
    console.log("Rover reached destination!");
    res.status(200).json({ success: true, message: "Rover marked as reached" });
  } catch (error) {
    console.error("Error updating reached status:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

// 5. Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});