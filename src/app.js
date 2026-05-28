import express from 'express';
import cookies from 'cookie-parser';
import userModel from './models/users.model.js';
import NoteModel from './models/notes.model.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use(cookies());

app.get("/", (req, res) => {
    res.send("API is running...");
});

/**
 * @route POST /api/auth/register
 * @description Register a new user need name and email in the request body
 * @access Public
 */
app.post("/api/auth/register", async (req, res) => {
    const { name, email } = req.body;

    // ---- Validation ----
    if (!name) {
        return res.status(400).json({ error: "Name is required" });
    }

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    if (name.trim().length < 3) {
        return res.status(400).json({ error: "Name must be at least 3 characters long" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    // ---- If validation passes, create the user ----
    try {
        const newUser = await userModel.create({ name, email });

        const token = jwt.sign(
            { id: newUser._id, email: newUser.email },
            process.env.JWT_SECRET
        );

        res.cookie("token", token);

        return res.status(201).json({
            message: "User registered successfully",
            user: newUser
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: "Email already registered" });
        }
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @route POST /api/notes
 * @description Create a new note need title and description in the request body
 * @access Public
 */
app.post("/api/notes", async (req, res) => {
    const { title, description } = req.body;

    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user; // { id: "user_id", email: "user_email" }
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // ---- Validation ----
    if (!title) {
        return res.status(400).json({ error: "Title is required" });
    }

    if (!description) {
        return res.status(400).json({ error: "Description is required" });
    }

    if (title.trim().length < 3) {
        return res.status(400).json({ error: "Title must be at least 3 characters long" });
    }

    if (description.trim().length < 10) {
        return res.status(400).json({ error: "Description must be at least 10 characters long" });
    }

    // ---- If validation passes, create the note ----
    try {
        const newNote = await NoteModel.create({
            title,
            description,
            user: req.user.email
        });

        return res.status(201).json({
            message: "Note created successfully",
            note: newNote
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

export default app;

