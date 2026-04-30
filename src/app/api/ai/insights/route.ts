import { NextResponse } from "next/server";
import { canAccessDashboard, getSession } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || !canAccessDashboard(session.role)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const workspaceId = await currentWorkspaceId();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      thisMonthRevenue, lastMonthRevenue,
      overdueInvoices,
      totalJobs, completedJobs,
      fuelExpenses, lastMonthFuelExpenses,
      pendingJobs, postponedJobs,
    ] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { workspaceId, status: "PAID", paidAt: { gte: startOfMonth } } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { workspaceId, status: "PAID", paidAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, _count: true, where: { workspaceId, status: { in: ["PENDING", "OVERDUE"] } } }),
      prisma.job.count({ where: { workspaceId, createdAt: { gte: startOfMonth } } }),
      prisma.job.count({ where: { workspaceId, status: { in: ["VERIFIED", "CLOSED"] }, updatedAt: { gte: startOfMonth } } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { workspaceId, category: { in: ["FUEL", "TRANSPORT"] }, date: { gte: startOfMonth } } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { workspaceId, category: { in: ["FUEL", "TRANSPORT"] }, date: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.job.count({ where: { workspaceId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
      prisma.job.count({ where: { workspaceId, status: { in: ["POSTPONED", "ISSUE_REPORTED"] } } }),
    ]);

    const thisRev = thisMonthRevenue._sum.amount ?? 0;
    const lastRev = lastMonthRevenue._sum.amount ?? 0;
    const revChange = lastRev > 0 ? Math.round(((thisRev - lastRev) / lastRev) * 100) : null;
    const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
    const fuelThis = fuelExpenses._sum.amount ?? 0;
    const fuelLast = lastMonthFuelExpenses._sum.amount ?? 0;
    const fuelChange = fuelLast > 0 ? Math.round(((fuelThis - fuelLast) / fuelLast) * 100) : null;
    const overdueAmt = overdueInvoices._sum.amount ?? 0;
    const overdueCount = overdueInvoices._count;

    type Insight = { id: string; icon: string; iconBg: string; iconColor: string; text: string; sub: string; badge: string; badgeBg: string; badgeText: string };
    type Suggestion = { id: string; icon: string; iconBg: string; iconColor: string; title: string; sub: string; href: string };

    const insights: Insight[] = [];

    // Revenue insight
    if (revChange !== null) {
      insights.push({
        id: "revenue",
        icon: "TrendingUp", iconBg: "bg-blue-50", iconColor: "text-[#2563EB]",
        text: revChange >= 0
          ? `Revenue is up ${revChange}% this month compared to last month.`
          : `Revenue is down ${Math.abs(revChange)}% compared to last month.`,
        sub: `KES ${(thisRev / 1000).toFixed(0)}K this month vs KES ${(lastRev / 1000).toFixed(0)}K last month.`,
        badge: revChange >= 0 ? "Positive" : "Review",
        badgeBg: revChange >= 0 ? "bg-green-50" : "bg-amber-50",
        badgeText: revChange >= 0 ? "text-[#16A34A]" : "text-[#D97706]",
      });
    } else {
      insights.push({
        id: "revenue", icon: "TrendingUp", iconBg: "bg-blue-50", iconColor: "text-[#2563EB]",
        text: `Total invoiced this month: KES ${(thisRev / 1000).toFixed(0)}K.`,
        sub: "View your invoices for a full breakdown.",
        badge: "Info", badgeBg: "bg-blue-50", badgeText: "text-[#2563EB]",
      });
    }

    // Overdue invoices
    if (overdueCount > 0) {
      insights.push({
        id: "overdue", icon: "AlertCircle", iconBg: "bg-amber-50", iconColor: "text-[#D97706]",
        text: `You have ${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} totaling KES ${(overdueAmt / 1000).toFixed(1)}K.`,
        sub: overdueCount > 1 ? "Follow up with clients to clear outstanding amounts." : "Follow up with this client.",
        badge: "Action needed", badgeBg: "bg-amber-50", badgeText: "text-[#D97706]",
      });
    }

    // Job completion rate
    insights.push({
      id: "completion", icon: "BarChart2", iconBg: "bg-blue-50", iconColor: "text-[#2563EB]",
      text: `Jobs completion rate is ${completionRate}% this month.`,
      sub: `${completedJobs} completed out of ${totalJobs} total jobs.`,
      badge: completionRate >= 70 ? "Positive" : completionRate >= 40 ? "Info" : "Review",
      badgeBg: completionRate >= 70 ? "bg-green-50" : completionRate >= 40 ? "bg-blue-50" : "bg-amber-50",
      badgeText: completionRate >= 70 ? "text-[#16A34A]" : completionRate >= 40 ? "text-[#2563EB]" : "text-[#D97706]",
    });

    // Fuel & transport
    if (fuelChange !== null && fuelChange > 10) {
      insights.push({
        id: "fuel", icon: "TrendingUp", iconBg: "bg-red-50", iconColor: "text-[#DC2626]",
        text: `Fuel & Transport expenses increased by ${fuelChange}%.`,
        sub: `This month: KES ${(fuelThis / 1000).toFixed(1)}K vs last month: KES ${(fuelLast / 1000).toFixed(1)}K.`,
        badge: "Review", badgeBg: "bg-[#FEF3C7]", badgeText: "text-[#D97706]",
      });
    } else if (pendingJobs > 0) {
      insights.push({
        id: "pending", icon: "Clock", iconBg: "bg-purple-50", iconColor: "text-[#7C3AED]",
        text: `${pendingJobs} active job${pendingJobs > 1 ? "s" : ""} in progress right now.`,
        sub: postponedJobs > 0 ? `${postponedJobs} job${postponedJobs > 1 ? "s" : ""} postponed and need rescheduling.` : "All jobs are progressing normally.",
        badge: "Info", badgeBg: "bg-purple-50", badgeText: "text-[#7C3AED]",
      });
    }

    // Smart suggestions
    const suggestions: Suggestion[] = [];
    if (overdueCount > 0) {
      suggestions.push({
        id: "s1", icon: "AlertCircle", iconBg: "bg-amber-50", iconColor: "text-[#D97706]",
        title: `Review ${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""}`,
        sub: "Take action to improve cash flow",
        href: "/admin/invoices?status=OVERDUE",
      });
    }
    if (postponedJobs > 0) {
      suggestions.push({
        id: "s2", icon: "RefreshCw", iconBg: "bg-blue-50", iconColor: "text-[#2563EB]",
        title: `Reschedule ${postponedJobs} postponed job${postponedJobs > 1 ? "s" : ""}`,
        sub: "Keep your projects on track",
        href: "/admin/jobs?status=POSTPONED",
      });
    }
    suggestions.push({
      id: "s3", icon: "BarChart2", iconBg: "bg-purple-50", iconColor: "text-[#7C3AED]",
      title: "Analyze expense trends",
      sub: "Identify cost saving opportunities",
      href: "/admin/expenses",
    });
    suggestions.push({
      id: "s4", icon: "Users", iconBg: "bg-green-50", iconColor: "text-[#16A34A]",
      title: "Review worker performance",
      sub: "See who's performing best this month",
      href: "/admin/workers",
    });

    return NextResponse.json({ insights: insights.slice(0, 4), suggestions: suggestions.slice(0, 4) });
  } catch (err) {
    console.error("[ai/insights]", err);
    return NextResponse.json({ insights: [], suggestions: [] });
  }
}
