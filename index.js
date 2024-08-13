import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Mock Data Generator" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
