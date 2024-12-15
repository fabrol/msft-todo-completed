import { format } from "date-fns";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Task } from "./TodoTasksViewer";

interface TaskDialogProps {
  task?: Task;
  date?: Date;
  tasks?: Task[];
}

export const TaskDialog = ({ task, date, tasks }: TaskDialogProps) => {
  // Single task view
  if (task) {
    return (
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div>
            <p className="text-foreground break-words">{task.title}</p>
            <p className="text-sm text-muted-foreground">
              Completed at: {format(task.completedAt!, "h:mm a")}
            </p>
            {task.description && (
              <p className="mt-2 text-sm text-muted-foreground break-words">
                {task.description}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    );
  }

  // Multiple tasks view
  if (date && tasks) {
    return (
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{format(date, "EEEE, MMMM d, yyyy")}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ul className="space-y-4">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full bg-green-500"
                  aria-hidden="true"
                />
                <div>
                  <div>
                    <p className="text-foreground break-words">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Completed at: {format(task.completedAt!, "h:mm a")}
                    </p>
                    {task.description && (
                      <p className="mt-2 text-sm text-muted-foreground break-words">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    );
  }

  return null;
};
