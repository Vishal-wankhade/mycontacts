import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "email-validator";
import socketIo from "socket.io";  // for real-time chat
import http from "http";  // for socket server integration

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // create a socket.io server
const PORT = process.env.PORT || 5000;

const mongoDB_Url = process.env.MONGODB_URL;

// Middleware
app.use(cors());
app.use(express.json());

// User and Contact Models
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contact" }],
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

const contactSchema = new mongoose.Schema({
  name: String,
  companyName: String,
  email: String,
  phoneNumber: String,
  country: String,
  industry: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const Contact = mongoose.model("Contact", contactSchema);

// Routes

/* Signup Route */
app.post("/signup", async (req, res) => {
  const { userId, password, confirmPassword } = req.body;

  try {
    // Validate email
    if (!validator.validate(userId)) {
      return res.status(400).json({ message: "Invalid email address." });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Check for existing user
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({ userId, password: hashedPassword });
    
    // Save the user to the database
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).json({ message: "Server error, please try again." });
  }
});

/* Login Route */
app.post("/login", async (req, res) => {
  const { userId, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "04042000UserLogin",
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: { userId: user.userId, id: user._id },
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Server error, please try again." });
  }
});

/* Verify Token Route */
app.post("/verify", async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "04042000UserLogin");
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    res.status(200).json({ message: "Token is valid", user });
  } catch (error) {
    console.error("Error in token verification:", error);
    res.status(401).json({ message: "Invalid or expired token." });
  }
});

/* Contact Routes */

/* Add a new contact */
app.post("/contact", async (req, res) => {
  const { name, companyName, email, phoneNumber, country, industry, userId } = req.body;

  try {
    const newContact = new Contact({
      name,
      companyName,
      email,
      phoneNumber,
      country,
      industry,
      user: userId,
    });

    await newContact.save();
    res.status(201).json({ message: "Contact added successfully!" });
  } catch (error) {
    console.error("Error adding contact:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* Get user's contacts */
app.get("/contacts", async (req, res) => {
  const { userId } = req.query;

  try {
    const contacts = await Contact.find({ user: userId });
    res.status(200).json({ contacts });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* Update contact */
app.put("/contact/:id", async (req, res) => {
  const { id } = req.params;
  const { name, companyName, email, phoneNumber, country, industry } = req.body;

  try {
    const updatedContact = await Contact.findByIdAndUpdate(id, {
      name,
      companyName,
      email,
      phoneNumber,
      country,
      industry,
    }, { new: true });

    if (!updatedContact) {
      return res.status(404).json({ message: "Contact not found." });
    }

    res.status(200).json({ message: "Contact updated successfully!", contact: updatedContact });
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/* Delete contact */
app.delete("/contact/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await Contact.findByIdAndDelete(id);
    res.status(200).json({ message: "Contact deleted successfully!" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// Real-time chat with Socket.IO
let users = {}; // Store online users

io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("join", (userId) => {
    users[userId] = socket.id;
    console.log(`${userId} joined`);
  });

  socket.on("chat", async (message) => {
    const { from, to, text } = message;

    // Broadcast message
    const recipientSocketId = users[to];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("chat", message); // send to recipient
    }



    console.log("Message sent:", message);
  });

  socket.on("typing", (data) => {
    const { from, to, typing } = data;
    const recipientSocketId = users[to];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("typing", { from, typing });
    }
  });

  socket.on("disconnect", () => {
    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        console.log(`${userId} disconnected`);
        break;
      }
    }
  });
});

// Start Server
const startServer = async () => {
  try {
    await mongoose.connect(mongoDB_Url);
    console.log("Connected to MongoDB");

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

startServer();
