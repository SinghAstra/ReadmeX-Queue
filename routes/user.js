import { Router } from "express";
const router = Router();

/**
 * @swagger
 * /example:
 *   get:
 *     summary: Get list of examples
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               message: List of examples retrieved successfully
 */
router.get("/example", (req, res) => {
  res.json({ message: "List of examples retrieved successfully" });
});

export default router;
