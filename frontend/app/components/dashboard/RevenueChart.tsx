import { useMemo } from "react";
import { useQuery } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";

export function RevenueChart() {
  const { data, isLoading, isError } = useQuery(api.invoices.all, {
    page: 1,
    limit: 100,
  });

  const chartData = useMemo(() => {
    // 1. Check if res exists and is an array
    const invoices = data?.res || [];

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlyTotals = monthNames.reduce(
      (acc, month) => {
        acc[month] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    invoices.forEach((inv) => {
      if (inv.status === "paid") {
        // 2. SAFETY CHECK: Get date from invoice, or fallback to user date, or current date
        const rawDate =
          inv.createdAt || inv.user?.createdAt || new Date().toISOString();
        const date = new Date(rawDate);

        const monthIndex = date.getMonth();
        const monthName = monthNames[monthIndex];

        // 3. Convert cents to dollars (15000 -> 150)
        const amount = (Number(inv.totalAmount) || 0) / 100;

        if (monthName) {
          monthlyTotals[monthName] += amount;
        }
      }
    });

    return monthNames.map((name) => ({
      name,
      total: monthlyTotals[name],
    }));
  }, [data]);

  if (isLoading)
    return (
      <div className="h-75 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (isError)
    return (
      <div className="h-75 flex items-center justify-center text-red-500">
        Error loading chart
      </div>
    );
  return (
    <div className="h-75 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e2e8f0"
          />
          <XAxis
            dataKey="name"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8" }}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8" }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.02)" }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
            formatter={(val: number) => [`$${val.toFixed(2)}`, "Revenue"]}
          />
          <Bar
            dataKey="total"
            fill="#2563eb"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
