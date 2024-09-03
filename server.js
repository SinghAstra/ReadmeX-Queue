import express from "express";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import userRoutes from "./routes/user.js";

const app = express();

import swaggerOptions from "./swagger.json" assert { type: "json" };
const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  return res.json({ message: "server is up and running" });
});
app.use("/user", userRoutes);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
