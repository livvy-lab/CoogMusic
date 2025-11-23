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
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  const startDate = query.startDate || d.toISOString().split('T')[0];
  
  // Ensure full day coverage
  const startFull = startDate + ' 00:00:00';
  const endFull = endDate + ' 23:59:59';
  
  const sourceFilter = query.source || 'all';

  try {
    let sql = `
      SELECT 
        FormattedMonth,
        COUNT(*) as TransactionCount,
        SUM(Amount) as TotalRevenue,
        
        -- We need these splits to calculate the summary cards properly
        SUM(CASE WHEN RevenueCategory = 'Subscription' THEN Amount ELSE 0 END) as MonthlySubRevenue,
        SUM(CASE WHEN RevenueCategory = 'Advertisement' THEN Amount ELSE 0 END) as MonthlyAdRevenue,
        
        -- Combined Ledger: Both Ads and Subs in one list, sorted by Date
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', TransactionID,
            'date', FullDate,
            'type', RevenueCategory, -- 'Subscription' or 'Advertisement'
            'entity', EntityName,    -- Username or ArtistName
            'detail', DetailItem,    -- Plan Name or Ad Type
            'amount', Amount
          )
        ) as TransactionDetails

      FROM (
        -- 1. Listener Subscriptions
        SELECT 
          DATE_FORMAT(s.DateStarted, '%Y-%m') as FormattedMonth,
          s.DateStarted as FullDate,
          'Subscription' as RevenueCategory,
          s.SubscriptionID as TransactionID,
          AI.Username as EntityName, 
          sp.PlanName as DetailItem,
          sp.Cost as Amount
        FROM Subscription s
        JOIN SubscriptionPlan sp ON s.PlanID = sp.PlanID
        JOIN Listener L ON s.ListenerID = L.ListenerID
        JOIN AccountInfo AI ON L.AccountID = AI.AccountID
        WHERE s.DateStarted BETWEEN ? AND ?
        AND s.IsDeleted = 0
        
        UNION ALL
        
        -- 2. Artist Advertisements
        SELECT 
          DATE_FORMAT(a.CreatedAt, '%Y-%m') as FormattedMonth,
          a.CreatedAt as FullDate,
          'Advertisement' as RevenueCategory,
          a.AdID as TransactionID,
          Art.ArtistName as EntityName,
          a.AdType as DetailItem,
          a.AdPrice as Amount
        FROM Advertisement a
        JOIN Artist Art ON a.ArtistID = Art.ArtistID
        WHERE a.CreatedAt BETWEEN ? AND ?
        AND a.IsDeleted = 0
      ) as AllTransactions
    `;

    const params = [startFull, endFull, startFull, endFull];

    // Apply Filter (if user wants to see only one type)
    if (sourceFilter === 'subscription') {
      sql += ` WHERE RevenueCategory = 'Subscription' `;
    } else if (sourceFilter === 'ad') {
      sql += ` WHERE RevenueCategory = 'Advertisement' `;
    }

    sql += `
      GROUP BY FormattedMonth
      ORDER BY FormattedMonth DESC;
    `;

    const [rows] = await db.query(sql, params);

    // Calculate Summary Totals from the aggregated month rows
    const summary = rows.reduce((acc, row) => {
      acc.totalRevenue += Number(row.TotalRevenue) || 0;
      acc.totalTransactions += Number(row.TransactionCount) || 0;
      acc.subscriptionRevenue += Number(row.MonthlySubRevenue) || 0;
      acc.adRevenue += Number(row.MonthlyAdRevenue) || 0;
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