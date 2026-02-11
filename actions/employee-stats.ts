"use server";

import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import { Company, TimeEntry } from "@/lib/models";
import { startOfMonth, endOfMonth } from "date-fns";
import { getCurrentWeekRange, getCurrentMonthRange } from "@/lib/utils";

interface EmployeeStats {
  selectedMonthHours: number;
  thisWeekHours: number;
  currentMonthEveningHours: number;
  currentMonthNightHours: number;
  currentMonthDayHours: number;
  currentMonthTotalHours: number;
}

/**
 * Get employee statistics for a selected month
 * Evening/night hours are always for the current month
 */
export async function getEmployeeStats(selectedMonth: Date): Promise<{ data?: EmployeeStats; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return { error: "Unauthorized" };
    }

    await connectToDatabase();

    // Fetch company for shift settings
    const company = await Company.findById(session.user.companyId);
    if (!company) {
      return { error: "Company not found" };
    }

    // Calculate date ranges
    const selectedMonthStart = startOfMonth(selectedMonth);
    const selectedMonthEnd = endOfMonth(selectedMonth);

    const currentMonthRange = getCurrentMonthRange();
    const currentWeekRange = getCurrentWeekRange();

    // Fetch selected month entries
    const selectedMonthEntries = await TimeEntry.find({
      userId: session.user.id,
      date: { $gte: selectedMonthStart, $lte: selectedMonthEnd }
    }).lean();

    // Fetch current month entries
    const currentMonthEntries = await TimeEntry.find({
      userId: session.user.id,
      date: { $gte: currentMonthRange.start, $lte: currentMonthRange.end }
    }).lean();

    // Fetch this week entries
    const thisWeekEntries = await TimeEntry.find({
      userId: session.user.id,
      date: { $gte: currentWeekRange.start, $lte: currentWeekRange.end }
    }).lean();

    // Calculate totals
    const selectedMonthHours = selectedMonthEntries.reduce((acc, entry) => acc + entry.totalHours, 0);
    const thisWeekHours = thisWeekEntries.reduce((acc, entry) => acc + entry.totalHours, 0);
    
    // Current month breakdown
    const currentMonthEveningHours = currentMonthEntries.reduce((acc, entry) => acc + entry.eveningHours, 0);
    const currentMonthNightHours = currentMonthEntries.reduce((acc, entry) => acc + entry.nightHours, 0);
    const currentMonthDayHours = currentMonthEntries.reduce((acc, entry) => acc + entry.dayHours, 0);
    const currentMonthTotalHours = currentMonthEntries.reduce((acc, entry) => acc + entry.totalHours, 0);

    return {
      data: {
        selectedMonthHours,
        thisWeekHours,
        currentMonthEveningHours,
        currentMonthNightHours,
        currentMonthDayHours,
        currentMonthTotalHours
      }
    };
  } catch (error) {
    console.error("Failed to fetch employee stats:", error);
    return { error: "Failed to fetch statistics" };
  }
}
