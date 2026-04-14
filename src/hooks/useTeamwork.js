import { useState, useEffect, useCallback } from "react";
import {
  isTeamworkConfigured,
  fetchMyTasks,
  fetchTaskSubtasks,
} from "../teamwork/api.js";

export const useTeamwork = () => {
  const configured = isTeamworkConfigured();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const reload = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const result = await fetchMyTasks();
      setTasks(result.tasks);
      setProjects(result.projects);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setProject = useCallback((id) => {
    setSelectedProjectId(id || null);
  }, []);

  const updateInTree = useCallback((taskId, updater) => {
    const walk = (tasks) =>
      tasks.map((t) => {
        if (t.id === taskId) return updater(t);
        if (t.subtasks?.length) return { ...t, subtasks: walk(t.subtasks) };
        return t;
      });
    setTasks((prev) => walk(prev));
  }, []);

  const toggleExpanded = useCallback(
    (taskId) => {
      setTasks((prev) => {
        // Check if we need to lazy-load subtasks
        const findTask = (tasks) => {
          for (const t of tasks) {
            if (t.id === taskId) return t;
            if (t.subtasks?.length) {
              const found = findTask(t.subtasks);
              if (found) return found;
            }
          }
          return null;
        };
        const task = findTask(prev);
        if (task && task.subtasks === null && !task.expanded) {
          fetchTaskSubtasks(taskId).then((subs) => {
            updateInTree(taskId, (t) => ({ ...t, subtasks: subs }));
          });
        }

        // Toggle expanded
        const walk = (tasks) =>
          tasks.map((t) => {
            if (t.id === taskId) return { ...t, expanded: !t.expanded };
            if (t.subtasks?.length) return { ...t, subtasks: walk(t.subtasks) };
            return t;
          });
        return walk(prev);
      });
    },
    [updateInTree],
  );

  const toggleDescExpanded = useCallback(
    (taskId) => updateInTree(taskId, (t) => ({ ...t, descExpanded: !t.descExpanded })),
    [updateInTree],
  );

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => String(t.projectId) === String(selectedProjectId))
    : tasks;

  return {
    configured,
    tasks: filteredTasks,
    projects,
    loading,
    selectedProjectId,
    setProject,
    toggleExpanded,
    toggleDescExpanded,
    reload,
  };
};
