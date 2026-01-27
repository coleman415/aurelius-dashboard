import { SHEETS, RECURRING_EXPENSES } from "./config";
import type { BurnRateData, Expense, CategoryExpense, PayorExpense, BurnHistoryPoint } from "./types";

async function fetchSheetAsCSV(sheetId: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const response = await fetch(url, {
    next: { revalidate: 3600 },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status}`);
  }

  return response.text();
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.toLowerCase().trim()] = values[index]?.trim() ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove $, commas, and any whitespace
  const cleaned = value.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function categorizeExpense(item: string): string {
  const itemLower = item.toLowerCase();

  if (itemLower.includes("cto") || itemLower.includes("contractor") || itemLower.includes("salary")) {
    return "Personnel";
  }
  if (itemLower.includes("google") || itemLower.includes("notion") || itemLower.includes("lucid") ||
      itemLower.includes("docusign") || itemLower.includes("subscription")) {
    return "Software";
  }
  if (itemLower.includes("brand") || itemLower.includes("design") || itemLower.includes("graphics") ||
      itemLower.includes("marketing") || itemLower.includes("website")) {
    return "Marketing";
  }
  if (itemLower.includes("conference") || itemLower.includes("event") || itemLower.includes("coaching")) {
    return "Events & Training";
  }
  if (itemLower.includes("bonus") || itemLower.includes("recruiting")) {
    return "HR & Recruiting";
  }

  return "Other";
}

export async function getExpenses(sn37PriceUSD: number = 0): Promise<BurnRateData> {
  try {
    const csv = await fetchSheetAsCSV(SHEETS.expenses);
    const rows = parseCSV(csv);

    const expenses: Expense[] = rows
      .filter((row) => row.date && row.cost)
      .map((row) => ({
        date: row.date,
        payor: row.payor || "Unknown",
        item: row.item || "Unknown",
        cost: parseCurrency(row.cost),
        recurring: row.recurring?.toLowerCase() === "yes" || row.recurring?.toLowerCase() === "true",
        annualized: parseCurrency(row.annualized || row["annual"] || ""),
      }));

    // Calculate projected monthly burn from recurring expenses config
    const usdRecurring = RECURRING_EXPENSES.usd.reduce((sum, e) => sum + e.amount, 0);
    const tokenRecurringUSD = RECURRING_EXPENSES.tokens.reduce((sum, e) => {
      // Convert token amount to USD using SN37 price
      return sum + (e.amount * sn37PriceUSD);
    }, 0);
    const monthlyBurn = usdRecurring + tokenRecurringUSD;

    // Calculate expenses by category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      const category = categorizeExpense(e.item);
      categoryTotals[category] = (categoryTotals[category] || 0) + e.cost;
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.cost, 0);
    const expensesByCategory: CategoryExpense[] = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate expenses by payor
    const payorTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      payorTotals[e.payor] = (payorTotals[e.payor] || 0) + e.cost;
    });

    const expensesByPayor: PayorExpense[] = Object.entries(payorTotals)
      .map(([payor, amount]) => ({
        payor,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate burn history by month
    const burnByMonth: Record<string, number> = {};
    expenses.forEach((e) => {
      const date = new Date(e.date);
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        burnByMonth[monthKey] = (burnByMonth[monthKey] || 0) + e.cost;
      }
    });

    // Sort months and calculate cumulative burn
    const sortedMonths = Object.keys(burnByMonth).sort();
    let cumulativeBurn = 0;
    const burnHistory: BurnHistoryPoint[] = sortedMonths.map((month) => {
      cumulativeBurn += burnByMonth[month];
      return {
        month,
        burn: burnByMonth[month],
        cumulativeBurn,
      };
    });

    return {
      monthlyBurn,
      monthlyBurnUSD: monthlyBurn, // Already in USD
      runwayMonths: 0, // Will be calculated with treasury data
      expensesByCategory,
      expensesByPayor,
      recentExpenses: expenses.slice(-10).reverse(),
      burnHistory,
    };
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return {
      monthlyBurn: 0,
      monthlyBurnUSD: 0,
      runwayMonths: 0,
      expensesByCategory: [],
      expensesByPayor: [],
      recentExpenses: [],
      burnHistory: [],
    };
  }
}
