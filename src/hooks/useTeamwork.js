import { useState, useEffect, useCallback } from "react";
import {
  isTeamworkConfigured,
  fetchMyTasks,
  fetchTaskSubtasks,
  fetchTask,
  fetchWorkflowStages,
  moveTaskToStage,
} from "../teamwork/api.js";
import { usePinned } from "./usePinned.js";

export const useTeamwork = () => {
  const configured = isTeamworkConfigured();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [workflowData, setWorkflowData] = useState({});
  const { pinnedIds, togglePin } = usePinned("timebox-tw-pinned");

  const reload = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const result = await fetchMyTasks();
      const topIds = new Set(result.tasks.map((t) => t.id));

      // Fetch pinned subtasks that aren't already top-level
      const subtaskIds = [...pinnedIds].filter((id) => !topIds.has(id));
      const promoted = [];
      if (subtaskIds.length > 0) {
        const fetched = await Promise.all(
          subtaskIds.map(async (id) => {
            try {
              return await fetchTask(id);
            } catch (err) {
              console.error("Failed to fetch pinned subtask:", id, err);
              return null;
            }
          }),
        );
        for (const task of fetched) {
          if (task) promoted.push({ ...task, isPromotedSubtask: true });
        }
      }

      // Merge promoted subtasks directly into the tasks array
      setTasks([...result.tasks, ...promoted]);
      setProjects(result.projects);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [configured, pinnedIds]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setProject = useCallback((id) => {
    setSelectedProjectId(id || null);
  }, []);

  const updateInTree = useCallback((taskId, updater) => {
    const walk = (list) =>
      list.map((t) => {
        if (t.id === taskId) return updater(t);
        if (t.subtasks?.length) return { ...t, subtasks: walk(t.subtasks) };
        return t;
      });
    setTasks((prev) => walk(prev));
  }, []);

  const toggleExpanded = useCallback(
    (taskId) => {
      setTasks((prev) => {
        const findTask = (list) => {
          for (const t of list) {
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
            updateInTree(taskId, (t) => ({
              ...t,
              subtasks: subs.map((s) => ({
                ...s,
                projectId: s.projectId || t.projectId,
                projectName: s.projectName || t.projectName,
              })),
            }));
          });
        }

        const walk = (list) =>
          list.map((t) => {
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

  const loadWorkflowStages = useCallback(
    (workflowId) => {
      if (!workflowId) return;
      setWorkflowData((prev) => {
        if (prev[workflowId]) return prev;
        fetchWorkflowStages(workflowId).then((stages) => {
          setWorkflowData((p) => ({ ...p, [workflowId]: { stages } }));
        }).catch(() => {
          setWorkflowData((p) => ({ ...p, [workflowId]: { stages: [] } }));
        });
        return { ...prev, [workflowId]: { stages: [], loading: true } };
      });
    },
    [],
  );

  const changeStage = useCallback(
    async (taskId, workflowId, stageId) => {
      const wd = workflowData[workflowId];
      if (!wd) return;
      const newStage = wd.stages.find((s) => String(s.id) === String(stageId)) || null;
      updateInTree(taskId, (t) => ({ ...t, stage: newStage }));
      try {
        await moveTaskToStage(workflowId, stageId, taskId);
      } catch {
        reload();
      }
    },
    [workflowData, updateInTree, reload],
  );

  const filtered = selectedProjectId
    ? tasks.filter((t) => String(t.projectId) === String(selectedProjectId))
    : tasks;

  // Also surface pinned subtasks from within the lazy-loaded tree
  const topLevelIds = new Set(filtered.map((t) => t.id));
  const treePromoted = [];
  const walkForPinned = (items) => {
    for (const t of items) {
      if (t.subtasks?.length) {
        for (const sub of t.subtasks) {
          if (pinnedIds.has(sub.id) && !topLevelIds.has(sub.id)) {
            treePromoted.push({ ...sub, isPromotedSubtask: true });
            topLevelIds.add(sub.id);
          }
        }
        walkForPinned(t.subtasks);
      }
    }
  };
  walkForPinned(filtered);

  const filteredTasks = [...filtered, ...treePromoted].sort((a, b) => {
    const ap = pinnedIds.has(a.id) ? 0 : 1;
    const bp = pinnedIds.has(b.id) ? 0 : 1;
    return ap - bp;
  });

  return {
    configured,
    tasks: filteredTasks,
    pinnedIds,
    projects,
    loading,
    selectedProjectId,
    workflowData,
    setProject,
    toggleExpanded,
    toggleDescExpanded,
    togglePin,
    loadWorkflowStages,
    changeStage,
    reload,
  };
};
