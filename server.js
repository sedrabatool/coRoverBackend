require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Firebase Initialization
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

/* =====================================================
   1. UPDATE ROVER LOCATION
===================================================== */
app.post("/update-location", async (req, res) => {
  try {
    const { lat, lng, reached } = req.body;

    await db.collection("rover").doc("live").set({
      lat,
      lng,
      reached: reached || false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating location",
    });
  }
});

/* =====================================================
   2. GET LIVE LOCATION
===================================================== */
app.get("/location", async (req, res) => {
  try {
    const doc = await db.collection("rover").doc("live").get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    res.status(200).json({
      success: true,
      data: doc.data(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching location",
    });
  }
});

/* =====================================================
   3. MARK DESTINATION REACHED
===================================================== */
app.post("/reached", async (req, res) => {
  try {
    await db.collection("rover").doc("destination").set({
      reached: true,
      reachedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Rover reached destination!");

    res.status(200).json({
      success: true,
      message: "Rover marked as reached",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/* =====================================================
   4. GET REACHED STATUS
===================================================== */
app.get("/reached-status", async (req, res) => {
  try {
    const doc = await db.collection("rover").doc("destination").get();

    res.status(200).json({
      success: true,
      reached: doc.exists ? doc.data().reached : false,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Error fetching status",
    });
  }
});

/* =====================================================
   5. STORE RECEIVER INFO
===================================================== */
app.post("/store-receiver", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    await db.collection("rover").doc("receivers").set({
      name,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      message: "Receiver stored successfully",
      user: {
        name,
        email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/* =====================================================
   6. GET RECEIVER INFO
===================================================== */
app.get("/receiver", async (req, res) => {
  try {
    const doc = await db.collection("rover").doc("receivers").get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    res.status(200).json({
      success: true,
      receiver: doc.data(),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/* =====================================================
   7. SEND OTP (DUMMY VERSION)
===================================================== */
app.post("/send-otp", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email required",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    await db.collection("rover").doc("otp").set({
      otp,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send OTP Email
    await transporter.sendMail({
      from: `"Rover Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Rover OTP Code",
      html: `
        <h2>Hello ${name},</h2>
        <p>Your OTP for Rover verification is:</p>
        <h1 style="color:blue;">${otp}</h1>
        <p>This OTP will expire shortly.</p>
        <br/>
        <p>Regards,<br/>Rover Team</p>
      `,
    });

    console.log(`OTP sent to ${email}`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("Email Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
});

/* =====================================================
   8. VERIFY OTP
===================================================== */
app.post("/verify-otp", async (req, res) => {
  try {
    const { otp } = req.body;

    const doc = await db.collection("rover").doc("otp").get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "OTP not found",
      });
    }

    const savedOtp = doc.data().otp;

    if (Number(otp) === Number(savedOtp)) {
      return res.status(200).json({
        success: true,
        message: "OTP verified",
      });
    }

    res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
});

/* =====================================================
   START SERVER
===================================================== */
app.listen(5000, () => {
  console.log("Server running on port 3000");
});