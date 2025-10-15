import db from "../db.js"
import express from "express"

const router = express.Router();

// Get all administrators
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM Administrator WHERE IsDeleted = 0");
        res.json(rows);
    } catch (err) {
        console.error("Error fetching administrators:", err);
        res.status(500).json({ error: "Failed to fetch administrators" });
    }
});

//  Get one administrator by ID
router.get("/:id", async (req, res) => {
    try {
        const adminId = req.params.id;
        const [rows] = await db.query("SELECT * FROM Administrator WHERE AdminID = ? AND IsDeleted = 0", [adminId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Administrator not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("Error fetching administrator:", err);
        res.status(500).json({ error: "Failed to fetch administrator" });
    }
});

// Add a new administrator
router.post("/", async (req, res) => {
    try {
        const { Username, DateCreated } = req.body;

        if (!Username || !DateCreated) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const [result] = await db.query(
            "INSERT INTO Administrator (Username, DateCreated) VALUES (?, ?)",
            [Username, DateCreated]
        );

        res.status(201).json({
            AdminID: result.insertId,
            Username,
            DateCreated,
        });
    } catch (err) {
        console.error("Error creating administrator:", err);
        res.status(500).json({ error: "Failed to create administrator" });
    }
});

// Update an administrator
router.put("/:id", async (req, res) => {
    try {
        const adminId = req.params.id;
        const { Username, DateCreated } = req.body;

        const [result] = await db.query(
            "UPDATE Administrator SET Username = ?, DateCreated = ? WHERE AdminID = ? AND IsDeleted = 0",
            [Username, DateCreated, adminId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Administrator not found" });
        }

        res.json({
            AdminID: adminId,
            Username,
            DateCreated,
            message: "Administrator updated successfully",
        });
    } catch (err) {
        console.error("Error updating administrator:", err);
        res.status(500).json({ error: "Failed to update administrator" });
    }
});

// Soft delete an administrator
router.delete("/:id", async (req, res) => {
    try {
        const adminId = req.params.id;
        const [result] = await db.query(
            "UPDATE Administrator SET IsDeleted = 1 WHERE AdminID = ?",
            [adminId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Administrator not found or already deleted" });
        }

        res.json({ message: "Administrator soft deleted successfully" });
    } catch (err) {
        console.error("Error deleting administrator:", err);
        res.status(500).json({ error: "Failed to delete administrator" });
    }
});

export default router;
