import db from "../db.js";
import { parse } from "url";

const STREAM_MS_THRESHOLD = 30000;

export async function handleAdminSongReport(req, res) {
  const url = parse(req.url, true);
  const { startDate, endDate, minPlays, minLikes, minListeners } = url.query;

  res.setHeader("Content-Type", "application/json");

  const params = [
    startDate || null,
    startDate || "",
    startDate || "1900-01-01",
    endDate || null,
    endDate || "",
    endDate || "2100-12-31"
  ];

  let havingClause = "HAVING 1=1";
  if (minPlays) {
    havingClause += " AND total_plays >= ?";
    params.push(parseInt(minPlays, 10));
  }
  if (minLikes) {
    havingClause += " AND likes >= ?";
    params.push(parseInt(minLikes, 10));
  }
  if (minListeners) {
    havingClause += " AND unique_listeners >= ?";
    params.push(parseInt(minListeners, 10));
  }

  try {
    const [rows] = await db.query(
      `
      SELECT 
        S.SongID,
        S.Title,
        GROUP_CONCAT(DISTINCT A.ArtistName ORDER BY A.ArtistName SEPARATOR ', ') AS ArtistName,

        COUNT(
          CASE 
            WHEN P.PlayID IS NOT NULL 
              AND P.MsPlayed >= ${STREAM_MS_THRESHOLD}
            THEN 1 
            ELSE NULL 
          END
        ) AS total_plays,

        COUNT(
          DISTINCT CASE 
            WHEN P.PlayID IS NOT NULL 
              AND P.MsPlayed >= ${STREAM_MS_THRESHOLD}
            THEN P.ListenerID 
            ELSE NULL 
          END
        ) AS unique_listeners,

        (SELECT COUNT(*) FROM Liked_Song LS WHERE LS.SongID = S.SongID AND LS.IsLiked = 1) AS likes,

        MIN(
          CASE 
            WHEN P.MsPlayed >= ${STREAM_MS_THRESHOLD} AND P.IsDeleted = 0 
            THEN P.PlayedAt 
            ELSE NULL 
          END
        ) AS first_played_at,

        MAX(
          CASE 
            WHEN P.MsPlayed >= ${STREAM_MS_THRESHOLD} AND P.IsDeleted = 0 
            THEN P.PlayedAt 
            ELSE NULL 
          END
        ) AS last_played_at,

        (
          SELECT P2.ListenerID
          FROM Play P2
          WHERE P2.SongID = S.SongID
            AND P2.IsDeleted = 0
            AND P2.MsPlayed >= ${STREAM_MS_THRESHOLD}
          ORDER BY P2.PlayedAt ASC
          LIMIT 1
        ) AS first_played_by,

        (
          SELECT P3.ListenerID
          FROM Play P3
          WHERE P3.SongID = S.SongID
            AND P3.IsDeleted = 0
            AND P3.MsPlayed >= ${STREAM_MS_THRESHOLD}
          ORDER BY P3.PlayedAt DESC
          LIMIT 1
        ) AS last_played_by,

        (
          SELECT AI2.Username
          FROM Play P2
          JOIN Listener L2 ON P2.ListenerID = L2.ListenerID
          JOIN AccountInfo AI2 ON L2.AccountID = AI2.AccountID
          WHERE P2.SongID = S.SongID
            AND P2.IsDeleted = 0
            AND P2.MsPlayed >= ${STREAM_MS_THRESHOLD}
          ORDER BY P2.PlayedAt ASC
          LIMIT 1
        ) AS first_played_by_username,

        (
          SELECT AI3.Username
          FROM Play P3
          JOIN Listener L3 ON P3.ListenerID = L3.ListenerID
          JOIN AccountInfo AI3 ON L3.AccountID = AI3.AccountID
          WHERE P3.SongID = S.SongID
            AND P3.IsDeleted = 0
            AND P3.MsPlayed >= ${STREAM_MS_THRESHOLD}
          ORDER BY P3.PlayedAt DESC
          LIMIT 1
        ) AS last_played_by_username,

        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'listenerId', LS.ListenerID,
              'username', AI4.Username
            )
          )
          FROM Liked_Song LS
          JOIN Listener L4 ON LS.ListenerID = L4.ListenerID
          JOIN AccountInfo AI4 ON L4.AccountID = AI4.AccountID
          WHERE LS.SongID = S.SongID
            AND LS.IsLiked = 1
        ) AS liked_listeners,

        JSON_ARRAYAGG(
          CASE
            WHEN P.PlayID IS NOT NULL
              AND P.MsPlayed >= ${STREAM_MS_THRESHOLD}
            THEN JSON_OBJECT(
              'playId', P.PlayID,
              'listenerId', P.ListenerID,
              'username', AI.Username,
              'playedAt', P.PlayedAt
            )
            ELSE NULL
          END
        ) AS stream_details

      FROM Song S
      JOIN Song_Artist SA ON S.SongID = SA.SongID AND SA.IsDeleted = 0
      JOIN Artist A ON SA.ArtistID = A.ArtistID AND A.IsDeleted = 0
      LEFT JOIN Play P ON S.SongID = P.SongID AND P.IsDeleted = 0
      LEFT JOIN Listener L ON P.ListenerID = L.ListenerID
      LEFT JOIN AccountInfo AI ON L.AccountID = AI.AccountID
      WHERE S.IsDeleted = 0
        AND (
          ? IS NULL OR ? = '' OR S.ReleaseDate >= ?
        )
        AND (
          ? IS NULL OR ? = '' OR S.ReleaseDate <= ?
        )
      GROUP BY S.SongID, S.Title
      ${havingClause}
      ORDER BY total_plays DESC
      `,
      params
    );

    res.end(JSON.stringify(rows));
  } catch (err) {
    console.error("Admin song report error", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
