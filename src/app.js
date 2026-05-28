import express from 'express';
import cookies from 'cookie-parser';
import mongoose from 'mongoose';
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

/**
 * @route GET /api/notes
 * @description Get all notes
 * @access Public
 */
app.get("/api/notes", async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    let user;
    try {
        // The reference code used: const user = JSON.parse(token);
        // However, since token is signed as a JWT, we use jwt.verify.
        // We include a fallback to JSON.parse if the token is plain JSON.
        user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        try {
            user = JSON.parse(token);
        } catch (parseErr) {
            return res.status(401).json({ error: "Unauthorized: Invalid token format" });
        }
    }

    req.user = user; // { id: "user_id", email: "user_email" }

    try {
        const notes = await NoteModel.find({
            user: req.user.email
        });

        return res.status(200).json({
            message: "Notes fetched successfully",
            notes
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @route PATCH /api/notes/:id
 * @description Update a note by id require description in the request body
 * @access Public
 */
app.patch("/api/notes/:id", async (req, res) => {
    const { id } = req.params;
    const { description } = req.body;

    // ---- Validation ----
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid note ID" });
    }

    if (!description) {
        return res.status(400).json({ error: "Description is required" });
    }

    if (description.trim().length < 10) {
        return res.status(400).json({ error: "Description must be at least 10 characters long" });
    }

    try {
        const note = await NoteModel.findById(id);

        if (!note) {
            return res.status(404).json({ error: "Note not found" });
        }

        note.description = description;
        await note.save();

        return res.status(200).json({
            message: "Note updated successfully",
            note
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * @route DELETE /api/notes/:id
 * @description Delete a note by id
 * @access Public
 */
app.delete("/api/notes/:id", async (req, res) => {
    const { id } = req.params;

    // ---- Check if id is valid mongoose ObjectId ----
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid note ID" });
    }

    try {
        // ---- Check if the note exists ----
        const note = await NoteModel.findById(id);

        if (!note) {
            return res.status(404).json({ error: "Note not found" });
        }

        // ---- If the note exists, delete it ----
        await NoteModel.findByIdAndDelete(id);

        return res.status(200).json({
            message: "Note deleted successfully"
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

export default app;


