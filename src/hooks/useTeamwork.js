import { useState, useEffect, useCallback } from "react";
import {
  isTeamworkConfigured,
  fetchMyTasks,
  fetchTaskSubtasks,
  fetchBoardColumns,
  updateTaskColumn,
  updateTaskTags,
} from "../teamwork/api.js";

export const useTeamwork = () => {
  const configured = isTeamworkConfigured();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [boardColumns, setBoardColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const reload = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const result = await fetchMyTasks();
      console.log("fetched teamwork tasks", result.tasks);
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

  const loadColumnsForProject = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      const cols = await fetchBoardColumns(projectId);
      setBoardColumns(cols);
    } catch {
      setBoardColumns([]);
    }
  }, []);

  const setProject = useCallback((id) => {
    setSelectedProjectId(id || null);
  }, []);

  const toggleInTree = useCallback((taskId, field) => {
    const toggle = (tasks) =>
      tasks.map((t) => {
        if (t.id === taskId) return { ...t, [field]: !t[field] };
        if (t.subtasks?.length) return { ...t, subtasks: toggle(t.subtasks) };
        return t;
      });
    setTasks((prev) => toggle(prev));
  }, []);

  const toggleExpanded = useCallback(
    (taskId) => {
      // Find the task in the tree to check if we need to load subtasks
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

      setTasks((prev) => {
        const task = findTask(prev);
        if (task && task.subtasks === null && !task.expanded) {
          // Load subtasks lazily
          fetchTaskSubtasks(taskId).then((subs) => {
            const attachSubs = (tasks) =>
              tasks.map((t) => {
                if (t.id === taskId) return { ...t, subtasks: subs };
                if (t.subtasks?.length) return { ...t, subtasks: attachSubs(t.subtasks) };
                return t;
              });
            setTasks((p) => attachSubs(p));
          });
        }

        const toggle = (tasks) =>
          tasks.map((t) => {
            if (t.id === taskId) return { ...t, expanded: !t.expanded };
            if (t.subtasks?.length) return { ...t, subtasks: toggle(t.subtasks) };
            return t;
          });
        return toggle(prev);
      });
    },
    [],
  );
  const toggleDescExpanded = useCallback(
    (taskId) => toggleInTree(taskId, "descExpanded"),
    [toggleInTree],
  );

  const changeStage = useCallback(
    async (taskId, columnId) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, boardColumn: { ...t.boardColumn, id: columnId } }
            : t,
        ),
      );
      try {
        await updateTaskColumn(taskId, columnId);
      } catch {
        reload();
      }
    },
    [reload],
  );

  const changeTags = useCallback(
    async (taskId, tagIds) => {
      try {
        await updateTaskTags(taskId, tagIds);
        reload();
      } catch {
        /* silent */
      }
    },
    [reload],
  );

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => String(t.projectId) === String(selectedProjectId))
    : tasks;
  console.log("first task projectId", tasks[0]);
  console.log("selectedProjectId", selectedProjectId);
  console.log("teamwork tasks", filteredTasks);

  return {
    configured,
    tasks: filteredTasks,
    allTasks: tasks,
    projects,
    boardColumns,
    loading,
    selectedProjectId,
    setProject,
    toggleExpanded,
    toggleDescExpanded,
    changeStage,
    changeTags,
    loadColumnsForProject,
    reload,
  };
};
