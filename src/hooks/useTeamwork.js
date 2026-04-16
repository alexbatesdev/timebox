import { useState, useEffect, useCallback } from "react";
import {
  isTeamworkConfigured,
  fetchMyTasks,
  fetchTaskSubtasks,
  fetchWorkflowStages,
  moveTaskToStage,
} from "../teamwork/api.js";

const PINNED_KEY = "timebox-tw-pinned";
const loadPinned = () => {
  const raw = localStorage.getItem(PINNED_KEY);
  return raw ? new Set(JSON.parse(raw)) : new Set();
};
const savePinned = (set) => {
  localStorage.setItem(PINNED_KEY, JSON.stringify([...set]));
};

export const useTeamwork = () => {
  const configured = isTeamworkConfigured();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [workflowData, setWorkflowData] = useState({});
  const [pinnedIds, setPinnedIds] = useState(loadPinned);

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

  const togglePin = useCallback((taskId) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      savePinned(next);
      return next;
    });
  }, []);

  const filtered = selectedProjectId
    ? tasks.filter((t) => String(t.projectId) === String(selectedProjectId))
    : tasks;

  const filteredTasks = [...filtered].sort((a, b) => {
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
