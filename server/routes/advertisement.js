import express from "express";
import db from "../db.js";

const router = express.Router();

// Get all advertisement
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM Advertisement WHERE IsDeleted = 0");
        res.json(rows);
    } catch (err) {
        console.error("Error fetching Advertisements:", err);
        res.status(500).json({ error: "Failed to fetch advertisements" });
    }
});

//  Get one advertisement by ID
router.get("/:id", async (req, res) => {
    try {
        const adId = req.params.id;
        const [rows] = await db.query("SELECT * FROM Advertisement WHERE adId = ? AND IsDeleted = 0", [adId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Advertisement not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("Error fetching Advertisement:", err);
        res.status(500).json({ error: "Failed to fetch advertisement" });
    }
});

// Add a new Advertisement
router.post("/", async (req, res) => {
    try {
        const { AdName, AdLength, AdFile } = req.body;

        if (!AdName || !AdLength || !AdFile) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const [result] = await db.query(
            "INSERT INTO Advertisement (AdName, AdLength, AdFile) VALUES (?, ?, ?)",
            [AdName, AdLength, AdFile]
        );

        res.status(201).json({
            adId: result.insertId,
            AdName,
            AdLength,
            AdFile
        });
    } catch (err) {
        console.error("Error creating Advertisement:", err);
        res.status(500).json({ error: "Failed to create advertisement" });
    }
});

// Update an Advertisement
router.put("/:id", async (req, res) => {
    try {
        const adId = req.params.id;
        const { AdName, AdLength, AdFile } = req.body;

        const [result] = await db.query(
            "UPDATE Advertisement SET AdName = ?, AdLength = ?, AdFile = ? WHERE adId = ? AND IsDeleted = 0",
            [AdName, AdLength, AdFile, adId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Advertisement not found" });
        }

        res.json({
            adId: adId,
            AdName,
            AdLength,
            AdFile,
            message: "Advertisement updated successfully",
        });
    } catch (err) {
        console.error("Error updating Advertisement:", err);
        res.status(500).json({ error: "Failed to update Advertisement" });
    }
});

// Soft delete an Advertisement
router.delete("/:id", async (req, res) => {
    try {
        const adId = req.params.id;
        const [result] = await db.query(
            "UPDATE Advertisement SET IsDeleted = 1 WHERE adId = ?",
            [adId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Advertisement not found or already deleted" });
        }

        res.json({ message: "Advertisement soft deleted successfully" });
    } catch (err) {
        console.error("Error deleting Advertisement:", err);
        res.status(500).json({ error: "Failed to delete Advertisement" });
    }
});

export default router;
