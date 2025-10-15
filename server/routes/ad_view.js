const db = require("../db.js")
const express = require("express");

const router = express.Router();

// Get all ad views
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM Ad_View WHERE IsDeleted = 0");
        res.json(rows);
    } catch (err) {
        console.error("Error fetching ad views:", err);
        res.status(500).json({ error: "Failed to fetch ad views"});
    }
});

// Get one ad view by ID
router.get("/:id", async (req, res) => {
    try {
        const viewId = req.params.id;
        const [rows] = await db.query("SELECT * FROM Ad_View WHERE ViewID = ? AND IsDeleted = 0", [viewId]);

        if (rows.length == 0){
            return res.status(404).json({error: "Ad view not found"});
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("Error fetching ad views:", err);
        res.status(500).json({ error: "Failed to fetch ad views"});
    }
});

// Add a new ad view
router.post("/", async (req, res) => {
    try {
        const { ListenerID, AdID, DateViewed } = req.body;
        
        if (!ListenerID || !AdID || !DateViewed){
            return res.status(400).json({ error: "Missing required fields"});
        }

        const [result] = await db.query(
            "INSERT INTO Ad_View (ListenerID, AdID, DateViewed) VALUES (?, ?, ?)",
            [ListenerID, AdID, DateViewed]
        );
        
        res.status(201).json({
            ViewID: result.insertId,
            ListenerID,
            AdID,
            DateViewed,
        });
    } catch (err) {
        console.error("Error creating ad view:", err);
        res.status(500).json({ error: "Failed to create ad view"});
    }
});

// Update ad view
router.put("/:id", async (req, res) =>{
    try {
        const viewId = req.params.id;
        const { ListenerID, AdID, DateViewed } = req.body;

        const [result] = await db.query(
            "UPDATE Ad_View SET ListenerID = ?, AdID = ?, DateViewed = ? WHERE ViewID = ? AND IsDeleted = 0",
            [ListenerID, AdID, DateViewed, viewId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Ad view not found" });
        }

        res.json({
            ViewID: viewId,
            ListenerID,
            AdID,
            DateViewed,
            message: "Ad view updated successfully",
        });
    } catch (err) {
        console.error("Error updating ad view:", err);
        res.status(500).json({ error: "Failed to update an ad view" });
    }
});

// Delete an ad view
router.delete("/:id", async (req, res) => {
    try {
        const viewId = req.params.id;
        const [result] = await db.query("UPDATE Ad_View SET IsDeleted = 1 WHERE ViewID = ?", [viewId]);

        if (result.affectedRows === 0){
            return res.status(404).json({ error: "Ad view not found or already deleted" });
        }

        res.json({ message: "Ad view soft deleted successfully" });
    } catch (err) {
        console.error("Error deleting ad view:", err);
        res.status(500).json({ error: "Failed to delete ad view" });
    }
});

export default router;