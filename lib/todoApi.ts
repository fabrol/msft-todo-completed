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

export async function fetchTasks(
  accessToken: string,
  onProgress?: (loadedTasks: number) => void
): Promise<Task[]> {
  let loadedTasks = 0;

  // Helper function to delay execution
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Fetch with retry logic
  async function fetchWithRetry(
    url: string,
    retries = 3,
    backoff = 500
  ): Promise<{
    value: TodoList[] | TodoTask[];
    "@odata.nextLink"?: string;
  }> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 429) {
          // Too Many Requests
          const retryAfter = response.headers.get("Retry-After") || backoff;
          await delay(Number(retryAfter) * 1000);
          continue;
        }

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await delay(backoff * Math.pow(2, i)); // Exponential backoff
      }
    }
    throw new Error("All retries failed");
  }

  // First, get all task lists
  const allLists: TodoList[] = [];
  let listsNextLink: string = `${graphConfig.graphTasksEndpoint}?$top=999`;

  while (listsNextLink) {
    const listsData = await fetchWithRetry(listsNextLink);
    allLists.push(...(listsData.value as TodoList[]));
    listsNextLink = listsData["@odata.nextLink"] ?? "";
  }

  // Function to fetch all pages for a list
  async function fetchListTasks(list: TodoList): Promise<Task[]> {
    try {
      const PAGE_SIZE = 400;
      const baseUrl = `${graphConfig.graphTasksEndpoint}/${list.id}/tasks?$top=${PAGE_SIZE}`;
      const allTasks: Task[] = [];
      let nextLink: string = baseUrl;

      while (nextLink) {
        const data = await fetchWithRetry(nextLink);
        const tasks = (data.value as TodoTask[])
          .filter((task: TodoTask) => task.completedDateTime !== null)
          .map((task: TodoTask) => ({
            id: task.id,
            title: task.title,
            completedAt: task.completedDateTime
              ? new Date(task.completedDateTime.dateTime)
              : null,
            description: task.body?.content || "",
          }));

        allTasks.push(...tasks);
        loadedTasks += tasks.length;
        onProgress?.(loadedTasks);

        nextLink = data["@odata.nextLink"] ?? "";
      }

      console.log(`List ${list.displayName} - Tasks fetched:`, allTasks.length);
      return allTasks;
    } catch (error) {
      console.error(
        `Error fetching tasks for list ${list.displayName}:`,
        error
      );
      return [];
    }
  }

  // Dynamic queue processing with concurrency control
  async function processListsWithQueue(lists: TodoList[]): Promise<Task[]> {
    const CONCURRENCY_LIMIT = 3;
    const allTasks: Task[] = [];
    const queue = [...lists];
    const inProgress = new Set<Promise<Task[]>>();

    while (queue.length > 0 || inProgress.size > 0) {
      // Fill up to concurrency limit
      while (queue.length > 0 && inProgress.size < CONCURRENCY_LIMIT) {
        const list = queue.shift()!;
        const promise = fetchListTasks(list).then((tasks) => {
          inProgress.delete(promise);
          return tasks;
        });
        inProgress.add(promise);
      }

      // Wait for any task to complete
      if (inProgress.size > 0) {
        const completed = await Promise.race(inProgress);
        allTasks.push(...completed);
      }
    }

    return allTasks;
  }

  const allTasks = await processListsWithQueue(allLists);
  console.log("Total tasks fetched:", allTasks.length);
  return allTasks;
}
