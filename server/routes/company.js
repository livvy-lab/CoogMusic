import db from "../db.js";
import { parse } from "url";

function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
        req.on("error", (err) => {
            reject(err);
        });
    });
}

export async function handleCompanyRoutes(req, res) {
    const parsedUrl = parse(req.url, true);
    const idMatch = parsedUrl.pathname.match(/^\/companies\/(\d+)$/);

    // Set the response header for all responses in this handler
    res.setHeader("Content-Type", "application/json");

    try {
        // Get all companies that have not been soft deleted
        if (req.method === "GET" && parsedUrl.pathname === "/companies") {
            const [rows] = await db.query("SELECT * FROM Company WHERE IsDeleted = 0");
            res.writeHead(200);
            res.end(JSON.stringify(rows));
            return;
        }

        // Get a single company by its ID
        if (req.method === "GET" && idMatch) {
            const companyId = idMatch[1];
            const [rows] = await db.query("SELECT * FROM Company WHERE CompanyID = ? AND IsDeleted = 0", [companyId]);
            if (rows.length === 0) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: "Company not found" }));
                return;
            }
            res.writeHead(200);
            res.end(JSON.stringify(rows[0]));
            return;
        }

        // Add a new company
        if (req.method === "POST" && parsedUrl.pathname === "/companies") {
            const { Name, DateCreated } = await getRequestBody(req);
            if (!Name || !DateCreated) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Missing required fields: Name and DateCreated" }));
                return;
            }

            const [result] = await db.query(
                "INSERT INTO Company (Name, DateCreated) VALUES (?, ?)",
                [Name, DateCreated]
            );

            res.writeHead(201);
            res.end(JSON.stringify({
                CompanyID: result.insertId,
                Name,
                DateCreated
            }));
            return;
        }

        // Update an existing company by ID
        if (req.method === "PUT" && idMatch) {
            const companyId = idMatch[1];
            const { Name } = await getRequestBody(req);
            const [result] = await db.query(
                "UPDATE Company SET Name = ? WHERE CompanyID = ? AND IsDeleted = 0",
                [Name, companyId]
            );

            if (result.affectedRows === 0) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: "Company not found" }));
                return;
            }

            res.writeHead(200);
            res.end(JSON.stringify({ message: "Company updated successfully" }));
            return;
        }

        // Soft delete a company by ID
        if (req.method === "DELETE" && idMatch) {
            const companyId = idMatch[1];
            const [result] = await db.query(
                "UPDATE Company SET IsDeleted = 1 WHERE CompanyID = ?",
                [companyId]
            );

            if (result.affectedRows === 0) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: "Company not found or already deleted" }));
                return;
            }

            res.writeHead(200);
            res.end(JSON.stringify({ message: "Company soft deleted successfully" }));
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: "Company endpoint not found" }));

    } catch (err) {
        console.error("Company route error:", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Internal server error" }));
    }
}