import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
    title: String,
    description: String,
    user: String
});

const NoteModel = mongoose.model('notes', noteSchema);

export default NoteModel;
