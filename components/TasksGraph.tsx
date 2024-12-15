import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { Task } from "./TodoTasksViewer";
import { ViewMode } from "./TodoTasksViewer";

interface TasksGraphProps {
  tasks: Task[];
  dateRange: Date[];
  viewMode: ViewMode;
}

export const TasksGraph = ({ tasks, dateRange, viewMode }: TasksGraphProps) => {
  const data = dateRange.map((date) => {
    const tasksForDate = tasks.filter((task) => {
      if (!task.completedAt) return false;

      if (viewMode === "year") {
        return (
          task.completedAt.getMonth() === date.getMonth() &&
          task.completedAt.getFullYear() === date.getFullYear()
        );
      }

      return task.completedAt.toDateString() === date.toDateString();
    });

    return {
      date,
      count: tasksForDate.length,
    };
  });

  const getTickFormat = (date: Date) => {
    switch (viewMode) {
      case "day":
        return format(date, "h:mm a");
      case "week":
        return format(date, "EEE");
      case "month":
        return format(date, "d");
      case "year":
        return format(date, "MMM");
      default:
        return format(date, "MMM d");
    }
  };

  const getTooltipFormat = (date: Date) => {
    switch (viewMode) {
      case "day":
        return format(date, "h:mm a");
      case "year":
        return format(date, "MMMM yyyy");
      default:
        return format(date, "MMMM d, yyyy");
    }
  };

  return (
    <div className="w-full h-[200px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={2}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => getTickFormat(date)}
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
                    {getTooltipFormat(data.date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.count} tasks
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="count"
            fill="hsl(var(--primary)/0.3)"
            radius={[4, 4, 0, 0]}
            className="hover:fill-[hsl(var(--primary)/0.5)] transition-[fill]"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
