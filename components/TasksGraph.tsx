import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { Task } from "./TodoTasksViewer";

interface TasksGraphProps {
  tasks: Task[];
  dateRange: Date[];
}

export const TasksGraph = ({ tasks, dateRange }: TasksGraphProps) => {
  const data = dateRange.map((date) => {
    const tasksForDate = tasks.filter((task) => {
      if (!task.completedAt) return false;
      return task.completedAt.toDateString() === date.toDateString();
    });

    return {
      date,
      count: tasksForDate.length,
    };
  });

  return (
    <div className="w-full h-[200px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(date, "MMM d")}
            className="text-xs text-muted-foreground"
          />
          <YAxis
            allowDecimals={false}
            className="text-xs text-muted-foreground"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <p className="text-sm font-medium">
                    {format(data.date, "MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.count} tasks
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--primary))"
            fillOpacity={1}
            fill="url(#colorCount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
