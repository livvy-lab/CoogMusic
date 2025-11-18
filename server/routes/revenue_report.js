import db from "../db.js";
import { parse } from "url";

export async function handleRevenueReport(req, res) {
  const { query } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Content-Type", "application/json");

  if (method !== "GET") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // Parameters
  let endDate = query.endDate || new Date().toISOString().split('T')[0];
  endDate = endDate + ' 23:59:59';
  
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  const startDate = query.startDate || d.toISOString().split('T')[0];
  
  const sourceFilter = query.source || 'all';

  try {
    /* UPDATED QUERY: 
       - Part 1: Includes Plan Name (e.g., "Listener Subscription (Monthly)")
       - Part 2: Includes Ad Type (e.g., "Artist Ad (Banner)")
    */
    let sql = `
      SELECT 
        FormattedMonth,
        RevenueSource,
        COUNT(TransactionID) as TransactionCount,
        SUM(Amount) as TotalRevenue
      FROM (
        -- Part 1: Listener Subscriptions (Split by Plan Name)
        SELECT 
          DATE_FORMAT(s.DateStarted, '%Y-%m') as FormattedMonth,
          CONCAT('Listener Subscription (', sp.PlanName, ')') as RevenueSource,
          s.SubscriptionID as TransactionID,
          sp.Cost as Amount
        FROM Subscription s
        JOIN SubscriptionPlan sp ON s.PlanID = sp.PlanID
        WHERE s.DateStarted BETWEEN ? AND ?
        
        UNION ALL
        
        -- Part 2: Artist Advertisements (Split by Ad Type)
        SELECT 
          DATE_FORMAT(a.CreatedAt, '%Y-%m') as FormattedMonth,
          CONCAT('Artist Ad (', CONCAT(UCASE(LEFT(a.AdType, 1)), SUBSTRING(a.AdType, 2)), ')') as RevenueSource,
          a.AdID as TransactionID,
          a.AdPrice as Amount
        FROM Advertisement a
        WHERE a.CreatedAt BETWEEN ? AND ?
      ) as CombinedRevenue
    `;

    // Updated Filter Logic to match the new detailed names
    const params = [startDate, endDate, startDate, endDate];
    
    if (sourceFilter === 'subscription') {
      sql += ` WHERE RevenueSource LIKE 'Listener Subscription%' `;
    } else if (sourceFilter === 'ad') {
      sql += ` WHERE RevenueSource LIKE 'Artist Ad%' `;
    }

    sql += `
      GROUP BY FormattedMonth, RevenueSource
      ORDER BY FormattedMonth DESC, RevenueSource ASC;
    `;

    const [rows] = await db.query(sql, params);

    // Updated Summary Logic to check strings properly
    const summary = rows.reduce((acc, row) => {
      acc.totalRevenue += Number(row.TotalRevenue);
      acc.totalTransactions += Number(row.TransactionCount);
      
      if (row.RevenueSource.includes('Listener Subscription')) {
        acc.subscriptionRevenue += Number(row.TotalRevenue);
      } else {
        acc.adRevenue += Number(row.TotalRevenue);
      }
      return acc;
    }, { totalRevenue: 0, totalTransactions: 0, subscriptionRevenue: 0, adRevenue: 0 });

    res.writeHead(200);
    res.end(JSON.stringify({ 
      reportData: rows, 
      summary 
    }));

  } catch (err) {
    console.error("Database error in revenue report:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Failed to generate revenue report" }));
  }
}