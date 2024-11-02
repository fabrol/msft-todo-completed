import { msalInstance, loginRequest, graphConfig } from "./msalConfig";
import { Task } from "@/components/TodoTasksViewer";

export async function getAccessToken(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();
    console.log("Available accounts:", accounts.length);
    const account = accounts[0];
    if (!account) {
      console.error("No active account found");
      throw new Error("No active account");
    }
    console.log("Using account:", account.username);
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: account,
    });
    console.log("Token acquired silently");
    return response.accessToken;
  } catch (error) {
    console.error("Silent token acquisition failed, attempting popup:", error);
    try {
      const response = await msalInstance.acquireTokenPopup(loginRequest);
      console.log("Token acquired via popup");
      return response.accessToken;
    } catch (err) {
      console.error("Popup token acquisition failed:", err);
      return null;
    }
  }
}

interface TodoList {
  id: string;
  displayName: string;
}

interface DateTimeTimeZone {
  dateTime: string;
  timeZone: string;
}

interface TodoTask {
  id: string;
  title: string;
  completedDateTime: DateTimeTimeZone | null;
  body?: {
    content: string;
  };
}

interface TodoListResponse {
  value: TodoList[];
}

interface TodoTaskResponse {
  value: TodoTask[];
}

export async function fetchTasks(accessToken: string): Promise<Task[]> {
  console.log("Fetching task lists...");
  const listsResponse = await fetch(graphConfig.graphTasksEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!listsResponse.ok) {
    console.error("Failed to fetch task lists:", listsResponse.status);
    throw new Error("Failed to fetch task lists");
  }

  const listsData = (await listsResponse.json()) as TodoListResponse;
  console.log("Found task lists:", listsData.value.length);

  let allTasks: Task[] = [];

  for (const list of listsData.value) {
    console.log(`Fetching tasks for list: ${list.displayName} (${list.id})`);
    const tasksResponse = await fetch(
      `${graphConfig.graphTasksEndpoint}/${list.id}/tasks`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (tasksResponse.ok) {
      const tasksData = (await tasksResponse.json()) as TodoTaskResponse;
      console.log(
        `Found ${tasksData.value.length} tasks in list ${list.displayName}`
      );
      const tasks = tasksData.value
        .filter((task) => task.completedDateTime !== null)
        .map((task) => ({
          id: task.id,
          title: task.title,
          completedAt: task.completedDateTime?.dateTime || "",
          description: task.body?.content || "",
        }));
      allTasks = allTasks.concat(tasks);
    } else {
      console.error(
        `Failed to fetch tasks for list ${list.displayName}:`,
        tasksResponse.status
      );
    }
  }

  console.log("Total tasks fetched:", allTasks.length);
  return allTasks;
}
