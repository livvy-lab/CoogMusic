import db from "../db.js";
import { parse } from "url";

export async function handleSoftDeleteRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // Standard CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (method !== "DELETE") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  const parts = pathname.split("/");
  const entityType = parts[3];
  const entityId = parts[4];

  if (!entityType || !entityId) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid route. Format: /api/soft_delete/:entityType/:entityId" }));
    return;
  }

  let tableName = "";
  let idColumnName = "";
  
  // determine the table and column based on the entityType
  switch (entityType) {
    case "Song":
      tableName = "Song";
      idColumnName = "SongID";
      break;
    case "Playlist":
      tableName = "Playlist";
      idColumnName = "PlaylistID";
      break;
    case "Artist":
      tableName = "Artist";
      idColumnName = "ArtistID";
      break;
    case "Listener": // Fall-through
    case "User":
      tableName = "Listener";
      idColumnName = "ListenerID";
      break;
    default:
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Invalid entityType: ${entityType}` }));
      return;
  }

  // Start a transaction
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // soft-delete the main entity row (Song, Playlist, Artist, Listener)
    const [result] = await connection.query(
      `UPDATE ${tableName} SET IsDeleted = 1 WHERE ${idColumnName} = ?`,
      [entityId]
    );

    if (result.affectedRows === 0) {
      console.warn(`Soft delete info: Item ${tableName} ID ${entityId} was not found or already deleted. Proceeding to resolve report.`);
      // This is not an error, we can proceed
    }

    // if it's an Artist or Listener, also soft-delete their login account
    let accountId = null;

    if (entityType === "Artist") {
      const [rows] = await connection.query(
        "SELECT AccountID FROM Artist WHERE ArtistID = ?",
        [entityId]
      );
      if (rows.length > 0) accountId = rows[0].AccountID;

    } else if (entityType === "Listener" || entityType === "User") {
      const [rows] = await connection.query(
        "SELECT AccountID FROM Listener WHERE ListenerID = ?",
        [entityId]
      );
      if (rows.length > 0) accountId = rows[0].AccountID;
    }

    if (accountId) {
      await connection.query(
        "UPDATE AccountInfo SET IsDeleted = 1 WHERE AccountID = ?",
        [accountId]
      );
    }

    await connection.commit();
    connection.release();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      message: `${entityType} with ID ${entityId} soft-deleted successfully.` 
    }));

  } catch (err) {
    // if anything fails, roll back all changes
    await connection.rollback();
    connection.release();

    console.error(`Error soft-deleting ${entityType} ID ${entityId}:`, err);

    // check for a foreign key constraint violation
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      let userMessage = `This ${entityType} cannot be removed because it is referenced by other records (e.g., active reports, subscriptions). Please resolve those items first.`;
      
      res.writeHead(409, { "Content-Type": "application/json" }); // 409 Conflict
      res.end(JSON.stringify({ 
        error: "Conflict: Foreign Key Constraint", 
        message: userMessage
      }));
      return; // Stop execution
    }

    let errorMessage = "An unknown error occurred during the delete operation.";
    if (typeof err === 'string') {
        errorMessage = err;
    } else if (err && err.message) {
        errorMessage = err.message;
    }

    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      error: "Internal Server Error", 
      message: errorMessage
    }));
  }
}