const site = () => import.meta.env.VITE_TEAMWORK_SITE;
const configured = () => Boolean(site() && import.meta.env.VITE_TEAMWORK_API_KEY);

export const isTeamworkConfigured = configured;

const twFetch = async (path) => {
  const res = await fetch(`/api/teamwork${path}`);
  if (!res.ok) throw new Error(`Teamwork API error (${res.status})`);
  return res.json();
};

export const taskUrl = (taskId) => `https://${site()}/app/tasks/${taskId}`;

const USERID_KEY = "timebox-tw-userid";
const getMyUserId = async () => {
  const cached = localStorage.getItem(USERID_KEY);
  if (cached) return cached;
  const data = await twFetch('/projects/api/v3/me.json');
  const id = data.person?.id;
  if (id) localStorage.setItem(USERID_KEY, String(id));
  return String(id);
};

const mapTask = (t, projectId, projectName, stage = null, workflowId = null) => {
  const hasSubtasks = Array.isArray(t.subTaskIds) && t.subTaskIds.length > 0;
  return {
    id: t.id,
    name: t.name,
    parentTaskId: t.parentTaskId || t.parentTask?.id || null,
    projectId: projectId || "",
    projectName: projectName || "",
    description: t.description || "",
    stage,
    workflowId,
    hasSubtasks,
    subtasks: null,
    expanded: false,
    descExpanded: !hasSubtasks,
  };
};

// Cache workflow stages keyed by workflowId
const stagesCache = {};
export const fetchWorkflowStages = async (workflowId) => {
  if (!workflowId) return [];
  if (stagesCache[workflowId]) return stagesCache[workflowId];
  const data = await twFetch(`/projects/api/v3/workflows/${workflowId}/stages.json`);
  const stages = (data.stages || []).map((s) => ({ id: String(s.id), name: s.name, color: s.color }));
  stagesCache[workflowId] = stages;
  return stages;
};

// Resolve stages for tasks that have workflowStages data
const resolveTaskStages = async (rawTasks) => {
  const workflowIds = [...new Set(
    rawTasks.map((t) => t.workflowStages?.[0]?.workflowId).filter(Boolean)
  )];
  const stagesByWorkflow = {};
  await Promise.all(workflowIds.map(async (wfId) => {
    stagesByWorkflow[wfId] = await fetchWorkflowStages(wfId);
  }));

  const lookup = {};
  for (const [wfId, stages] of Object.entries(stagesByWorkflow)) {
    for (const s of stages) lookup[`${wfId}:${s.id}`] = s;
  }
  return lookup;
};

export const fetchMyTasks = async () => {
  const userId = await getMyUserId();
  const data = await twFetch(
    `/projects/api/v3/tasks.json?responsiblePartyIds=${userId}&includeCompletedTasks=false&getSubTasks=false&includeRelatedTasks=true&include=projects,tasklists&pageSize=250`
  );

  // Build project map from included data
  const includedProjects = data.included?.projects || {};
  const projectMap = {};
  for (const [id, proj] of Object.entries(includedProjects)) {
    projectMap[id] = { id: String(id), name: proj.name || `Project ${id}` };
  }

  // Build tasklist → project mapping
  const includedTasklists = data.included?.tasklists || {};
  const tasklistToProject = {};
  for (const [id, tl] of Object.entries(includedTasklists)) {
    const projId = String(tl.project?.id || tl.projectId || "");
    if (projId) tasklistToProject[id] = projId;
  }

  const rootTasks = (data.tasks || []).filter((t) => !t.parentTaskId && !t.parentTask?.id);
  const stageLookup = await resolveTaskStages(rootTasks);

  const tasks = rootTasks.map((t) => {
    const tasklistId = String(t.tasklist?.id || t.tasklistId || "");
    const projectId = tasklistToProject[tasklistId] || "";
    const ws = t.workflowStages?.[0];
    const wfId = ws?.workflowId ? String(ws.workflowId) : null;
    const stage = ws?.stageId ? stageLookup[`${ws.workflowId}:${ws.stageId}`] || null : null;
    return { ...mapTask(t, projectId, projectMap[projectId]?.name || "", stage, wfId), descExpanded: true };
  });

  const projects = Object.values(projectMap).sort((a, b) => a.name.localeCompare(b.name));

  return { tasks, projects };
};

export const fetchTaskSubtasks = async (taskId) => {
  const data = await twFetch(
    `/projects/api/v3/tasks/${taskId}/subtasks.json?includeCompletedTasks=false&includeRelatedTasks=true&pageSize=250`
  );
  const subtasks = data.tasks || [];
  const stageLookup = await resolveTaskStages(subtasks);

  return subtasks.map((t) => {
    const ws = t.workflowStages?.[0];
    const wfId = ws?.workflowId ? String(ws.workflowId) : null;
    const stage = ws?.stageId ? stageLookup[`${ws.workflowId}:${ws.stageId}`] || null : null;
    return mapTask(t, "", "", stage, wfId);
  });
};

export const fetchTask = async (taskId) => {
  const data = await twFetch(`/projects/api/v3/tasks/${taskId}.json?include=projects,tasklists`);
  const t = data.task;
  if (!t) return null;
  const ws = t.workflowStages?.[0];
  const wfId = ws?.workflowId ? String(ws.workflowId) : null;

  // Resolve project from included data or tasklist
  const includedProjects = data.included?.projects || {};
  const includedTasklists = data.included?.tasklists || {};
  const tasklistId = String(t.tasklist?.id || t.tasklistId || "");
  const tl = includedTasklists[tasklistId];
  const projectId = String(tl?.project?.id || tl?.projectId || "");
  const projectName = includedProjects[projectId]?.name || "";

  return mapTask(t, projectId, projectName, null, wfId);
};

export const moveTaskToStage = async (workflowId, stageId, taskId) => {
  const res = await fetch(
    `/api/teamwork/projects/api/v3/workflows/${workflowId}/stages/${stageId}/tasks.json`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds: [taskId] }),
    }
  );
  if (!res.ok) throw new Error(`Failed to move task to stage (${res.status})`);
};
