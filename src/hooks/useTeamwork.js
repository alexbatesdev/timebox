import { useState, useEffect, useCallback, useRef } from "react";
import {
  isTeamworkConfigured,
  fetchMyTasks,
  fetchTaskSubtasks,
  fetchTask,
  fetchWorkflowStages,
  moveTaskToStage,
} from "../teamwork/api.js";
import { usePinned } from "./usePinned.js";

const findInTree = (list, id) => {
  for (const t of list) {
    if (String(t.id) === String(id)) return t;
    if (t.subtasks?.length) {
      const found = findInTree(t.subtasks, id);
      if (found) return found;
    }
  }
  return null;
};

export const useTeamwork = () => {
  const configured = isTeamworkConfigured();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [workflowData, setWorkflowData] = useState({});
  const { pinnedIds, togglePin } = usePinned("timebox-tw-pinned");
  const pinnedIdsRef = useRef(pinnedIds);
  useEffect(() => {
    pinnedIdsRef.current = pinnedIds;
  }, [pinnedIds]);

  const reload = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const result = await fetchMyTasks();
      const topIds = new Set(result.tasks.map((t) => String(t.id)));

      // Fetch pinned subtasks that aren't already top-level
      const currentPinned = pinnedIdsRef.current;
      const subtaskIds = [...currentPinned].filter(
        (id) => !topIds.has(String(id)),
      );
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

      setTasks([...result.tasks, ...promoted]);
      setProjects(result.projects);
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const setProject = useCallback((id) => {
    setSelectedProjectId(id || null);
  }, []);

  const updateInTree = useCallback((taskId, updater) => {
    const walk = (list) =>
      list.map((t) => {
        if (String(t.id) === String(taskId)) return updater(t);
        if (t.subtasks?.length) return { ...t, subtasks: walk(t.subtasks) };
        return t;
      });
    setTasks((prev) => walk(prev));
  }, []);

  const toggleExpanded = useCallback(
    (taskId) => {
      setTasks((prev) => {
        const task = findInTree(prev, taskId);
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
            if (String(t.id) === String(taskId))
              return { ...t, expanded: !t.expanded };
            if (t.subtasks?.length) return { ...t, subtasks: walk(t.subtasks) };
            return t;
          });
        return walk(prev);
      });
    },
    [updateInTree],
  );

  const toggleDescExpanded = useCallback(
    (taskId) =>
      updateInTree(taskId, (t) => ({ ...t, descExpanded: !t.descExpanded })),
    [updateInTree],
  );

  // Wrap togglePin to fetch subtask data if not already in the tree
  const handleTogglePin = useCallback(
    (taskId) => {
      togglePin(taskId);
      // If pinning (not unpinning), check if we need to fetch this task
      const isPinning = !pinnedIdsRef.current.has(String(taskId));
      if (isPinning) {
        // Check if task is already in the tree; if not, fetch it
        setTasks((prev) => {
          if (findInTree(prev, taskId)) return prev;
          // Fetch async, then append
          fetchTask(taskId)
            .then((task) => {
              if (!task) return;
              setTasks((p) => {
                if (findInTree(p, taskId)) return p;
                return [...p, { ...task, isPromotedSubtask: true }];
              });
            })
            .catch((err) => {
              console.error("Failed to fetch pinned subtask:", taskId, err);
            });
          return prev;
        });
      }
    },
    [togglePin],
  );

  const loadWorkflowStages = useCallback((workflowId) => {
    if (!workflowId) return;
    setWorkflowData((prev) => {
      if (prev[workflowId]) return prev;
      fetchWorkflowStages(workflowId)
        .then((stages) => {
          setWorkflowData((p) => ({ ...p, [workflowId]: { stages } }));
        })
        .catch(() => {
          setWorkflowData((p) => ({ ...p, [workflowId]: { stages: [] } }));
        });
      return { ...prev, [workflowId]: { stages: [], loading: true } };
    });
  }, []);

  const changeStage = useCallback(
    async (taskId, workflowId, stageId) => {
      const wd = workflowData[workflowId];
      if (!wd) return;
      const newStage =
        wd.stages.find((s) => String(s.id) === String(stageId)) || null;
      updateInTree(taskId, (t) => ({ ...t, stage: newStage }));
      try {
        await moveTaskToStage(workflowId, stageId, taskId);
      } catch {
        reload();
      }
    },
    [workflowData, updateInTree, reload],
  );

  const filtered = (
    selectedProjectId
      ? tasks.filter((t) => String(t.projectId) === String(selectedProjectId))
      : tasks
  ).filter((t) => !t.isPromotedSubtask || pinnedIds.has(String(t.id)));

  // Surface pinned subtasks from the lazy-loaded tree
  const topLevelIds = new Set(filtered.map((t) => String(t.id)));
  const treePromoted = [];
  const walkForPinned = (items) => {
    for (const t of items) {
      if (t.subtasks?.length) {
        for (const sub of t.subtasks) {
          const sid = String(sub.id);
          if (pinnedIds.has(sid) && !topLevelIds.has(sid)) {
            treePromoted.push({ ...sub, isPromotedSubtask: true });
            topLevelIds.add(sid);
          }
        }
        walkForPinned(t.subtasks);
      }
    }
  };
  walkForPinned(filtered);

  // Final assembly with deduplication
  const seen = new Set();
  const filteredTasks = [...filtered, ...treePromoted]
    .filter((t) => {
      const key = String(t.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const ap = pinnedIds.has(String(a.id)) ? 0 : 1;
      const bp = pinnedIds.has(String(b.id)) ? 0 : 1;
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
    togglePin: handleTogglePin,
    loadWorkflowStages,
    changeStage,
    reload,
  };
};
