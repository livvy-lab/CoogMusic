const db = require("../db.js")
const express = require("express");

const router = express.Router();

// Get all Album
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM Album WHERE IsDeleted = 0");
        res.json(rows);
    } catch (err) {
        console.error("Error fetching Albums:", err);
        res.status(500).json({ error: "Failed to fetch Albums" });
    }
});

//  Get one Album by ID
router.get("/:id", async (req, res) => {
    try {
        const albumId = req.params.id;
        const [rows] = await db.query("SELECT * FROM Album WHERE AlbumID = ? AND IsDeleted = 0", [albumId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Album not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("Error fetching Album:", err);
        res.status(500).json({ error: "Failed to fetch Album" });
    }
});

// Add a new Album
router.post("/", async (req, res) => {
    try {
        const { Title, ReleaseDate, CoverArt } = req.body;

        if (!Title || !ReleaseDate || !CoverArt) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const [result] = await db.query(
            "INSERT INTO Album (Title, ReleaseDate, CoverArt) VALUES (?, ?, ?)",
            [Title, ReleaseDate, CoverArt]
        );

        res.status(201).json({
            AlbumId: result.insertId,
            Title,
            ReleaseDate,
            CoverArt
        });
    } catch (err) {
        console.error("Error creating Album:", err);
        res.status(500).json({ error: "Failed to create Album" });
    }
});

// Update an Album
router.put("/:id", async (req, res) => {
    try {
        const albumId = req.params.id;
        const { Title, ReleaseDate, CoverArt } = req.body;

        const [result] = await db.query(
            "UPDATE Album SET Title = ?, ReleaseDate = ?, CoverArt = ? WHERE AlbumId = ? AND IsDeleted = 0",
            [Title, ReleaseDate, CoverArt, albumId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Album not found" });
        }

        res.json({
            AlbumId: albumId,
            Title,
            ReleaseDate,
            CoverArt,
            message: "Album updated successfully",
        });
    } catch (err) {
        console.error("Error updating Album:", err);
        res.status(500).json({ error: "Failed to update Album" });
    }
});

// Soft delete an Album
router.delete("/:id", async (req, res) => {
    try {
        const albumId = req.params.id;
        const [result] = await db.query(
            "UPDATE Album SET IsDeleted = 1 WHERE AlbumId = ?",
            [albumId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Album not found or already deleted" });
        }

        res.json({ message: "Album soft deleted successfully" });
    } catch (err) {
        console.error("Error deleting Album:", err);
        res.status(500).json({ error: "Failed to delete Album" });
    }
});

export default router;
