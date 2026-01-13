import { NextRequest, NextResponse } from "next/server";
import { getBudgetManager, MAX_BUDGET_EXPORT as MAX_BUDGET } from "@/lib/budgetManager";

export async function GET(request: NextRequest) {
  try {
    const budgetManager = getBudgetManager();
    const status = budgetManager.getBudgetStatus();

    return NextResponse.json({
      success: true,
      budget: {
        current: status.current,
        max: MAX_BUDGET,
        remaining: status.remaining,
        percentage: status.percentage,
      },
      rateLimits: {
        openai: {
          perMinute: 60,
          perHour: 5000,
        },
        replicate: {
          perMinute: 10,
          perHour: 500,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Failed to get budget status",
      },
      { status: 500 }
    );
  }
}

