import db from "../db.js";
import { parse } from "url";

const STREAM_MS_THRESHOLD = 30000;

export async function handleAdminSongReport(req, res) {
    const url = parse(req.url, true);
    
    // ... (endpoint check)

    const { startDate, endDate, minPlays, minLikes, minListeners } = url.query;

    res.setHeader("Content-Type", "application/json");

    // Prepare date variables. Use '1900-01-01' for missing startDate and '2100-12-31' for missing endDate
    const startDateTime = startDate ? `${startDate} 00:00:00` : '1900-01-01 00:00:00';
    const endDateTime = endDate ? `${endDate} 23:59:59` : '2100-12-31 23:59:59';
    
    // 1. Build the list of parameters for the query
    const params = [
        // Parameters for total_plays (2 placeholders)
        STREAM_MS_THRESHOLD, startDateTime, endDateTime,
        
        // Parameters for unique_listeners (2 placeholders)
        STREAM_MS_THRESHOLD, startDateTime, endDateTime,
        
        // Parameters for first_played_at (1 placeholder)
        STREAM_MS_THRESHOLD, 
        
        // Parameters for last_played_at (1 placeholder)
        STREAM_MS_THRESHOLD, 
    ];

    // 2. Build the HAVING clauses dynamically
    let havingClause = "HAVING 1=1";
    if (minPlays) {
        havingClause += " AND total_plays >= ?";
        params.push(parseInt(minPlays));
    }
    if (minLikes) {
        havingClause += " AND likes >= ?";
        params.push(parseInt(minLikes));
    }
    if (minListeners) {
        havingClause += " AND unique_listeners >= ?";
        params.push(parseInt(minListeners));
    }

    try {
        const [rows] = await db.query(`
            SELECT 
                S.SongID,
                S.Title,
                GROUP_CONCAT(DISTINCT A.ArtistName ORDER BY A.ArtistName SEPARATOR ', ') AS ArtistName,
                
                -- Total Plays (within date range, where play duration >= threshold)
                COUNT(CASE 
                    WHEN P.PlayID IS NOT NULL 
                        AND P.MsPlayed >= ?
                        AND P.PlayedAt >= ?  -- Always use startDateTime
                        AND P.PlayedAt <= ?  -- Always use endDateTime
                    THEN 1 
                    ELSE NULL 
                END) AS total_plays,
                
                -- Unique Listeners (within date range, where play duration >= threshold)
                COUNT(DISTINCT CASE 
                    WHEN P.PlayID IS NOT NULL 
                        AND P.MsPlayed >= ?
                        AND P.PlayedAt >= ?  -- Always use startDateTime
                        AND P.PlayedAt <= ?  -- Always use endDateTime
                    THEN P.ListenerID 
                    ELSE NULL 
                END) AS unique_listeners,
                
                -- Total Likes (Lifetime)
                (SELECT COUNT(*) FROM Liked_Song LS WHERE LS.SongID = S.SongID AND LS.IsLiked = 1) AS likes,
                
                -- First Played (Lifetime)
                MIN(CASE 
                    WHEN P.MsPlayed >= ? AND P.IsDeleted = 0 
                    THEN P.PlayedAt 
                    ELSE NULL 
                END) AS first_played_at,
                
                -- Last Played (Lifetime)
                MAX(CASE 
                    WHEN P.MsPlayed >= ? AND P.IsDeleted = 0 
                    THEN P.PlayedAt 
                    ELSE NULL 
                END) AS last_played_at
            FROM Song S
            JOIN Song_Artist SA ON S.SongID = SA.SongID AND SA.IsDeleted = 0
            JOIN Artist A ON SA.ArtistID = A.ArtistID AND A.IsDeleted = 0
            LEFT JOIN Play P ON S.SongID = P.SongID AND P.IsDeleted = 0 
            WHERE S.IsDeleted = 0
            GROUP BY S.SongID, S.Title
            ${havingClause}
            ORDER BY total_plays DESC
        `, params);

        res.end(JSON.stringify(rows));
        
    } catch (err) {
        console.error("Admin song report error", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Internal server error" }));
    }
}