import express from 'express';
import cookies from 'cookie-parser';

const app = express();
app.use(express.json());
app.use(cookies());

app.get("/", (req, res) => {
    res.send("API is running...");
});

export default app;
