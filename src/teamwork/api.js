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

const mapTask = (t, projectId, projectName) => {
  const hasSubtasks = Array.isArray(t.subTaskIds) && t.subTaskIds.length > 0;
  return {
    id: t.id,
    name: t.name,
    parentTaskId: t.parentTaskId || t.parentTask?.id || null,
    projectId: projectId || "",
    projectName: projectName || "",
    description: t.description || "",
    tags: (t.tags || []).map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
    hasSubtasks,
    subtasks: null,
    expanded: false,
    descExpanded: !hasSubtasks,
  };
};

export const fetchMyTasks = async () => {
  const userId = await getMyUserId();
  const data = await twFetch(
    `/projects/api/v3/tasks.json?responsiblePartyIds=${userId}&includeCompletedTasks=false&getSubTasks=false&includeRelatedTasks=true&include=projects,tasklists,tags&pageSize=250`
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

  const tasks = (data.tasks || [])
    .filter((t) => !t.parentTaskId && !t.parentTask?.id)
    .map((t) => {
      const tasklistId = String(t.tasklist?.id || t.tasklistId || "");
      const projectId = tasklistToProject[tasklistId] || "";
      return { ...mapTask(t, projectId, projectMap[projectId]?.name || ""), descExpanded: true };
    });

  const projects = Object.values(projectMap).sort((a, b) => a.name.localeCompare(b.name));

  return { tasks, projects };
};

export const fetchTaskSubtasks = async (taskId) => {
  const data = await twFetch(
    `/projects/api/v3/tasks/${taskId}/subtasks.json?includeCompletedTasks=false&includeRelatedTasks=true&pageSize=250`
  );
  return (data.tasks || []).map((t) => mapTask(t, "", ""));
};

export const updateTaskTags = async (taskId, tagIds) => {
  const res = await fetch(`/api/teamwork/projects/api/v3/tasks/${taskId}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: { tagIds } }),
  });
  if (!res.ok) throw new Error(`Failed to update tags (${res.status})`);
};
