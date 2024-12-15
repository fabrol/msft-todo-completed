"use client";

import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import TodoTasksViewer from "@/components/TodoTasksViewer";

export default function Home() {
  const { instance } = useMsal();

  useEffect(() => {
    // Handle the redirect response
    instance.handleRedirectPromise().catch((error) => {
      console.error("Redirect error:", error);
    });
  }, [instance]);

  return (
    <main className="min-h-screen p-4">
      <TodoTasksViewer />
    </main>
  );
}
