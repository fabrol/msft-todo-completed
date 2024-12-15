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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAccessToken, fetchTasks } from "@/lib/todoApi";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msalConfig";

export type Task = {
  id: string;
  title: string;
  completedAt: string | null;
  description: string;
};

const sortTasksByDate = (tasks: Task[]) => {
  return tasks.sort((a, b) => {
    if (!a.completedAt || !b.completedAt) return 0;
    return (
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  });
};

export type ViewMode = "day" | "week" | "month";
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
                  className="p-0 h-auto text-left normal-case hover:no-underline"
                >
                  <span className="text-foreground">{task.title}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{task.title}</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Completed at:{" "}
                    {format(new Date(task.completedAt!), "h:mm a")}
                  </p>
                  {task.description && (
                    <p className="mt-2 text-foreground">{task.description}</p>
                  )}
                </div>
              </DialogContent>
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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [viewType, setViewType] = useState<ViewType>("calendar");

  const { instance, accounts } = useMsal();

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [loadedTaskCount, setLoadedTaskCount] = useState(0);

  useEffect(() => {
    async function authenticate() {
      if (accounts.length === 0 && !isAuthenticating) {
        setIsAuthenticating(true);
        try {
          const dialogs = document.querySelectorAll('[role="dialog"]');
          dialogs.forEach((dialog) => {
            if (dialog instanceof HTMLElement) {
              dialog.style.display = "none";
            }
          });

          await new Promise((resolve) => setTimeout(resolve, 100));

          await instance.loginPopup(loginRequest);
          setIsAuthenticated(true);
        } catch (e) {
          console.error("Login failed", e);
          setError("Login failed. Please try again.");
        } finally {
          setIsAuthenticating(false);
        }
      } else if (accounts.length > 0) {
        setIsAuthenticated(true);
      }
    }
    authenticate();
  }, [accounts, instance, isAuthenticating]);

  useEffect(() => {
    if (!isAuthenticated || isAuthenticating) return;

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
  }, [isAuthenticated, isAuthenticating]);

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
    }
  };

  const dateRange = getDateRange(currentDate, viewMode);

  const getTasksForDate = (date: Date) => {
    const filteredTasks = tasks.filter((task) => {
      if (!task.completedAt) return false;
      try {
        const taskDate = new Date(task.completedAt);
        if (isNaN(taskDate.getTime())) {
          console.error("Invalid date for task:", task);
          return false;
        }
        const isSameDate = taskDate.toDateString() === date.toDateString();
        return isSameDate;
      } catch (error) {
        console.error("Error parsing date for task:", task, error);
        return false;
      }
    });
    return filteredTasks;
  };

  const handlePrevious = () => {
    setCurrentDate((prevDate) => {
      if (viewMode === "day") return subDays(prevDate, 1);
      if (viewMode === "week") return subWeeks(prevDate, 1);
      return subMonths(prevDate, 1);
    });
  };

  const handleNext = () => {
    setCurrentDate((prevDate) => {
      if (viewMode === "day") return addDays(prevDate, 1);
      if (viewMode === "week") return addWeeks(prevDate, 1);
      return addMonths(prevDate, 1);
    });
  };

  const totalTasks = dateRange.reduce(
    (sum, date) => sum + getTasksForDate(date).length,
    0
  );

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
    <div className="container mx-auto p-4 max-w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Completed Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Button onClick={handlePrevious} variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <span className="text-lg font-medium">
                {viewMode === "day" && format(currentDate, "MMMM d, yyyy")}
                {viewMode === "week" &&
                  `Week of ${format(dateRange[0], "MMM d")} - ${format(
                    dateRange[6],
                    "MMM d, yyyy"
                  )}`}
                {viewMode === "month" && format(currentDate, "MMMM yyyy")}
              </span>
              <Button onClick={handleNext} variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="inline-flex rounded-md border bg-muted p-1">
                <Button
                  onClick={() => setViewMode("day")}
                  variant={viewMode === "day" ? "default" : "ghost"}
                  className="rounded-sm px-3"
                >
                  Day
                </Button>
                <Button
                  onClick={() => setViewMode("week")}
                  variant={viewMode === "week" ? "default" : "ghost"}
                  className="rounded-sm px-3"
                >
                  Week
                </Button>
                <Button
                  onClick={() => setViewMode("month")}
                  variant={viewMode === "month" ? "default" : "ghost"}
                  className="rounded-sm px-3"
                >
                  Month
                </Button>
              </div>
              <div className="inline-flex rounded-md border bg-muted p-1">
                <Button
                  onClick={() => setViewType("calendar")}
                  variant={viewType === "calendar" ? "default" : "ghost"}
                  className="rounded-sm px-3 w-[84px]"
                >
                  Calendar
                </Button>
                <Button
                  onClick={() => setViewType("list")}
                  variant={viewType === "list" ? "default" : "ghost"}
                  className="rounded-sm px-3 w-[84px]"
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
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
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
                            <span>{format(date, "EEE, MMM d")}</span>
                            <span className="text-sm font-normal text-gray-500">
                              {tasksForDate.length} tasks
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {tasksForDate.slice(0, 4).map((task) => (
                              <li key={task.id} className="flex items-center">
                                <span
                                  className="w-2 h-2 rounded-full bg-green-500 mr-2"
                                  aria-hidden="true"
                                />
                                <span className="text-sm truncate">
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
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>
                          {format(date, "EEEE, MMMM d, yyyy")}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        <ul className="space-y-4">
                          {tasksForDate.map((task) => (
                            <TaskList
                              key={task.id}
                              date={date}
                              tasks={tasksForDate}
                            />
                          ))}
                        </ul>
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {dateRange.map((date) => (
                <TaskList
                  key={date.toISOString()}
                  date={date}
                  tasks={getTasksForDate(date)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TodoTasksViewer;
