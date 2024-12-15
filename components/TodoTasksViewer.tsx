"use client";

import { useState, useEffect } from "react";
import {
  format,
  startOfWeek,
  startOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { getAccessToken, fetchTasks } from "@/lib/todoApi";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/lib/msalConfig";
import { TasksGraph } from "./TasksGraph";
import { TaskDialog } from "@/components/TaskDialog";
import { InteractionStatus } from "@azure/msal-browser";

export type Task = {
  id: string;
  title: string;
  completedAt: Date | null;
  description: string;
};

const sortTasksByDate = (tasks: Task[]) => {
  return tasks.sort((a, b) => {
    if (!a.completedAt || !b.completedAt) return 0;
    return b.completedAt.getTime() - a.completedAt.getTime();
  });
};

export type ViewMode = "day" | "week" | "month" | "year";
const TaskList = ({ tasks, date }: { tasks: Task[]; date: Date }) => {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-lg font-medium text-foreground mb-2">
        {format(date, "EEEE, MMMM d, yyyy")}
      </h4>
      <ul className="space-y-2">
        {sortTasksByDate(tasks).map((task) => (
          <li key={task.id} className="flex items-center gap-2 group">
            <span
              className="w-2 h-2 rounded-full bg-green-500"
              aria-hidden="true"
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="link"
                  className="p-0 h-auto text-left normal-case hover:no-underline max-w-full"
                >
                  <span className="text-foreground line-clamp-2 break-words">
                    {task.title}
                  </span>
                </Button>
              </DialogTrigger>
              <TaskDialog task={task} />
            </Dialog>
          </li>
        ))}
      </ul>
    </div>
  );
};

export type ViewType = "calendar" | "list";
const TodoTasksViewer = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<ViewType>("calendar");

  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [loadedTaskCount, setLoadedTaskCount] = useState(0);

  useEffect(() => {
    async function handleLogin() {
      if (!isAuthenticated && inProgress === InteractionStatus.None) {
        try {
          await instance.loginRedirect(loginRequest);
        } catch (e) {
          console.error("Login failed", e);
          setError("Login failed. Please try again.");
        }
      }
    }
    handleLogin();
  }, [isAuthenticated, inProgress, instance]);

  useEffect(() => {
    if (!isAuthenticated || inProgress === InteractionStatus.Login) return;

    async function loadTasks() {
      try {
        setLoading(true);
        setLoadedTaskCount(0);
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setError("Failed to authenticate. Please try again.");
          return;
        }
        const fetchedTasks = await fetchTasks(accessToken, (count) => {
          setLoadedTaskCount(count);
        });
        setTasks(fetchedTasks);
      } catch (err) {
        setError(`Failed to load tasks. Please try again later. ${err}`);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [isAuthenticated, inProgress, instance]);

  const getDateRange = (date: Date, mode: ViewMode) => {
    switch (mode) {
      case "day":
        return [date];
      case "week":
        const weekStart = startOfWeek(date);
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      case "month":
        const monthStart = startOfMonth(date);
        return Array.from({ length: 31 }, (_, i) =>
          addDays(monthStart, i)
        ).filter((d) => d.getMonth() === monthStart.getMonth());
      case "year":
        return Array.from(
          { length: 12 },
          (_, i) => new Date(date.getFullYear(), i, 1)
        );
    }
  };

  const dateRange = getDateRange(currentDate, viewMode);

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.completedAt) return false;
      if (viewMode === "year") {
        return (
          task.completedAt.getMonth() === date.getMonth() &&
          task.completedAt.getFullYear() === date.getFullYear()
        );
      }
      return task.completedAt.toDateString() === date.toDateString();
    });
  };

  const handlePrevious = () => {
    setCurrentDate((prevDate) => {
      if (viewMode === "day") return subDays(prevDate, 1);
      if (viewMode === "week") return subWeeks(prevDate, 1);
      if (viewMode === "month") return subMonths(prevDate, 1);
      return new Date(prevDate.getFullYear() - 1, prevDate.getMonth(), 1);
    });
  };

  const handleNext = () => {
    setCurrentDate((prevDate) => {
      if (viewMode === "day") return addDays(prevDate, 1);
      if (viewMode === "week") return addWeeks(prevDate, 1);
      if (viewMode === "month") return addMonths(prevDate, 1);
      return new Date(prevDate.getFullYear() + 1, prevDate.getMonth(), 1);
    });
  };

  const totalTasks = dateRange.reduce(
    (sum, date) => sum + getTasksForDate(date).length,
    0
  );

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: "/",
    });
    setTasks([]);
  };

  if (inProgress === InteractionStatus.Login) {
    return <div>Signing in...</div>;
  }

  if (inProgress === InteractionStatus.Logout) {
    return <div>Signing out...</div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg">Loading your tasks...</p>
        {loadedTaskCount > 0 && (
          <p className="text-sm text-muted-foreground">
            Loaded {loadedTaskCount} tasks so far
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 max-w-full">
      <Card className="w-full">
        <CardHeader className="p-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold">Completed Tasks</CardTitle>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-2 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Button
                onClick={handlePrevious}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <span className="text-base font-medium">
                {viewMode === "day" && format(currentDate, "MMMM d, yyyy")}
                {viewMode === "week" &&
                  `Week of ${format(dateRange[0], "MMM d")} - ${format(
                    dateRange[6],
                    "MMM d, yyyy"
                  )}`}
                {viewMode === "month" && format(currentDate, "MMMM yyyy")}
                {viewMode === "year" && format(currentDate, "yyyy")}
              </span>
              <Button
                onClick={handleNext}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:space-x-4 w-full sm:w-auto">
              <div className="inline-flex rounded-md border bg-muted p-1 w-full sm:w-auto">
                <Button
                  onClick={() => setViewMode("day")}
                  variant={viewMode === "day" ? "default" : "ghost"}
                  className="rounded-sm flex-1 sm:flex-none px-3 text-xs sm:text-sm"
                >
                  Day
                </Button>
                <Button
                  onClick={() => setViewMode("week")}
                  variant={viewMode === "week" ? "default" : "ghost"}
                  className="rounded-sm flex-1 sm:flex-none px-3 text-xs sm:text-sm"
                >
                  Week
                </Button>
                <Button
                  onClick={() => setViewMode("month")}
                  variant={viewMode === "month" ? "default" : "ghost"}
                  className="rounded-sm flex-1 sm:flex-none px-3 text-xs sm:text-sm"
                >
                  Month
                </Button>
                <Button
                  onClick={() => setViewMode("year")}
                  variant={viewMode === "year" ? "default" : "ghost"}
                  className="rounded-sm flex-1 sm:flex-none px-3 text-xs sm:text-sm"
                >
                  Year
                </Button>
              </div>
              <div className="inline-flex rounded-md border bg-muted p-1 w-full sm:w-auto">
                <Button
                  onClick={() => setViewType("calendar")}
                  variant={viewType === "calendar" ? "default" : "ghost"}
                  className="rounded-sm flex-1 sm:flex-none px-3 text-xs sm:text-sm"
                >
                  Calendar
                </Button>
                <Button
                  onClick={() => setViewType("list")}
                  variant={viewType === "list" ? "default" : "ghost"}
                  className="rounded-sm flex-1 sm:flex-none px-3 text-xs sm:text-sm"
                >
                  List
                </Button>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <span className="text-lg font-semibold">
              Total Tasks: {totalTasks}
            </span>
          </div>
          {viewType === "calendar" ? (
            <div
              className={`grid gap-4 ${
                viewMode === "day"
                  ? "grid-cols-1"
                  : viewMode === "week"
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7"
                  : viewMode === "month"
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              }`}
            >
              {dateRange.map((date) => {
                const tasksForDate = getTasksForDate(date);
                return (
                  <Dialog key={date.toISOString()}>
                    <DialogTrigger asChild>
                      <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardHeader>
                          <CardTitle className="text-lg flex justify-between items-center">
                            <span>
                              {viewMode === "year"
                                ? format(date, "MMMM")
                                : format(date, "EEE, MMM d")}
                            </span>
                            <span className="text-sm font-normal text-gray-500">
                              {tasksForDate.length} tasks
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {tasksForDate.slice(0, 4).map((task) => (
                              <li
                                key={task.id}
                                className="flex items-start gap-2"
                              >
                                <span
                                  className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="text-sm line-clamp-2 break-words">
                                  {task.title}
                                </span>
                              </li>
                            ))}
                            {tasksForDate.length > 4 && (
                              <li className="text-sm text-gray-500">
                                +{tasksForDate.length - 4} more tasks
                              </li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </DialogTrigger>
                    <TaskDialog date={date} tasks={tasksForDate} />
                  </Dialog>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <TasksGraph
                tasks={tasks}
                dateRange={dateRange}
                viewMode={viewMode}
              />
              <div className="space-y-2">
                {dateRange.map((date) => (
                  <TaskList
                    key={date.toISOString()}
                    date={date}
                    tasks={getTasksForDate(date)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TodoTasksViewer;
