import { useState, useEffect, useCallback, useRef } from "react";
import { getWeekdayKey, todayKey } from "./utils/time.js";
import { clearState } from "./utils/storage.js";
import { loadScheduleConfig } from "./data/scheduleConfig.js";
import { createScheduleState } from "./data/schedules.js";
import { buildMarkdown } from "./export/markdown.js";
import { notionFetch, replaceNotionPageContent } from "./notion/api.js";
import { buildNotionPayload } from "./notion/payload.js";
import { useClock } from "./hooks/useClock.js";
import { usePersist } from "./hooks/usePersist.js";
import { useNotifications } from "./hooks/useNotifications.js";
import { useScheduleInit } from "./hooks/useScheduleInit.js";

import { useLooseEnds } from "./hooks/useLooseEnds.js";
import { useTeamwork } from "./hooks/useTeamwork.js";
import { useGitHubNotifications } from "./hooks/useGitHubNotifications.js";
import LoadingScreen from "./components/LoadingScreen.jsx";
import Header from "./components/Header.jsx";
import CurrentBlock from "./components/CurrentBlock.jsx";
import AwayModal from "./components/AwayModal.jsx";
import MeetingForm from "./components/MeetingForm.jsx";
import BlockList from "./components/BlockList.jsx";
import WrapupSection from "./components/WrapupSection.jsx";
import ExportBar from "./components/ExportBar.jsx";
import QuickMeetingModal from "./components/QuickMeetingModal.jsx";
import LooseEndsPanel from "./components/LooseEndsPanel.jsx";
import TeamworkPanel from "./components/TeamworkPanel.jsx";
import GitHubPanel from "./components/GitHubPanel.jsx";

/* ── app ──────────────────────────────────────────────────── */
export default function App() {
  const [schedType, setSchedType] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [tasks, setTasks] = useState({});
  const [wrapup, setWrapup] = useState({ left: "", next: "" });
  const [notionPageId, setNotionPageId] = useState(null);
  const [configStatus, setConfigStatus] = useState("loading");
  const [config, setConfig] = useState(null);

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [mtgLabel, setMtgLabel] = useState("");
  const [mtgHour, setMtgHour] = useState(14);
  const [mtgMinute, setMtgMinute] = useState(0);
  const [mtgDuration, setMtgDuration] = useState(30);
  const [mtgIncludesLunch, setMtgIncludesLunch] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [showAwayModal, setShowAwayModal] = useState(false);
  const [awayStart, setAwayStart] = useState(null);
  const [awayAbsorbFlex, setAwayAbsorbFlex] = useState(true);
  const [awayManualMins, setAwayManualMins] = useState(15);
  const [looseEndsManualState, setLooseEndsManualState] = useState(null);
  const [teamworkOpen, setTeamworkOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [showQuickMtgModal, setShowQuickMtgModal] = useState(false);
  const [quickMtgStart, setQuickMtgStart] = useState(null);
  const [quickMtgLabel, setQuickMtgLabel] = useState("");
  const [quickMtgManualMins, setQuickMtgManualMins] = useState(30);
  const [quickMtgConsumeFrom, setQuickMtgConsumeFrom] = useState("current");

  const now = useClock();
  const { notifPerm, requestNotif, clearNotified, testNotif } =
    useNotifications(blocks, tasks, now);
  usePersist(schedType, blocks, tasks, wrapup, notionPageId);
  useScheduleInit({
    setSchedType,
    setBlocks,
    setTasks,
    setWrapup,
    setNotionPageId,
    setConfigStatus,
    setConfig,
    clearNotified,
  });

  const looseEnds = useLooseEnds();
  const teamwork = useTeamwork();
  const github = useGitHubNotifications();
  const schedules = config?.schedules || {};

  const initSchedule = (type) => {
    const nextState = createScheduleState(type, schedules);
    if (!nextState) return;
    setSchedType(nextState.schedType);
    setBlocks(nextState.blocks);
    setTasks(nextState.tasks);
    setWrapup(nextState.wrapup);
    setNotionPageId(null);
    clearNotified();
  };

  const reloadScheduleFromConfig = useCallback(async () => {
    clearState();
    setConfigStatus("loading");
    const freshConfig = await loadScheduleConfig();
    setConfig(freshConfig);
    const weekday = getWeekdayKey();
    const nextType =
      freshConfig.days[weekday] !== undefined
        ? freshConfig.days[weekday]
        : freshConfig.defaultType;
    const nextState = createScheduleState(nextType, freshConfig.schedules);
    if (nextState) {
      setSchedType(nextState.schedType);
      setBlocks(nextState.blocks);
      setTasks(nextState.tasks);
      setWrapup(nextState.wrapup);
      setNotionPageId(null);
      clearNotified();
    }
    setConfigStatus("ready");
  }, [clearNotified]);

  // Auto-reload when tab becomes visible on a new day
  const loadedDateKey = useRef(todayKey());
  const reloadTeamwork = teamwork.reload;
  const reloadLooseEnds = looseEnds.reload;
  const reloadGitHub = github.reload;
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      reloadGitHub();
      if (todayKey() !== loadedDateKey.current) {
        loadedDateKey.current = todayKey();
        reloadScheduleFromConfig();
        reloadTeamwork();
        reloadLooseEnds();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reloadScheduleFromConfig, reloadTeamwork, reloadLooseEnds, reloadGitHub]);

  const getCurIdx = () => {
    let idx = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (now >= blocks[i].start) idx = i;
    }
    return idx;
  };

  const resizeCurrentBlock = (delta) => {
    const ci = getCurIdx();
    setBlocks((prev) => {
      const newBlocks = prev.map((b, i) => {
        if (i === ci) return { ...b, end: b.end + delta };
        return { ...b };
      });

      let shift = delta;
      for (let i = ci + 1; i < newBlocks.length; i++) {
        if (newBlocks[i].type === "meeting" || newBlocks[i].type === "wrapup") {
          if (shift < 0 && i > 0) {
            newBlocks[i - 1] = { ...newBlocks[i - 1], end: newBlocks[i].start };
          }
          shift = 0;
          continue;
        }
        if (shift !== 0) {
          if (newBlocks[i].type === "flex-work") {
            newBlocks[i] = {
              ...newBlocks[i],
              start: newBlocks[i].start + shift,
            };
          } else {
            newBlocks[i] = {
              ...newBlocks[i],
              start: newBlocks[i].start + shift,
              end: newBlocks[i].end + shift,
            };
          }
        }
      }

      return newBlocks.filter((b) => b.end > b.start);
    });
  };

  const shiftCurrentBlock = (delta) => {
    const ci = getCurIdx();
    setBlocks((prev) => {
      const flexIdx = prev.findIndex((b) => b.type === "flex-work");
      return prev.map((b, i) => {
        if (i === ci - 1) return { ...b, end: b.end + delta };
        if (i >= ci && (flexIdx < 0 || i < flexIdx))
          return { ...b, start: b.start + delta, end: b.end + delta };
        if (i === flexIdx) return { ...b, start: b.start + delta };
        return b;
      });
    });
  };

  /* ── step away ────────────────────────────────────────── */
  const insertAwayBlock = (duration, absorbFlex) => {
    const ci = getCurIdx();
    const awayId = `away_${Date.now()}`;
    setBlocks((prev) => {
      const newBlocks = prev.map((b, i) => {
        if (i === ci) return { ...b, end: now };
        if (i > ci)
          return { ...b, start: b.start + duration, end: b.end + duration };
        return { ...b };
      });

      newBlocks.splice(ci + 1, 0, {
        id: awayId,
        label: "Away",
        start: now,
        end: now + duration,
        type: "away",
      });

      if (absorbFlex) {
        const flexIdx = newBlocks.findIndex((b) => b.type === "flex-work");
        if (flexIdx >= 0) {
          const flex = newBlocks[flexIdx];
          const newEnd = Math.max(flex.start, flex.end - duration);
          const leftover = duration - (flex.end - newEnd);
          newBlocks[flexIdx] = { ...flex, end: newEnd };
          if (leftover > 0) {
            for (let i = flexIdx + 1; i < newBlocks.length; i++) {
              newBlocks[i] = {
                ...newBlocks[i],
                start: newBlocks[i].start + leftover,
                end: newBlocks[i].end + leftover,
              };
            }
          }
        }
      }

      return newBlocks.filter((b) => b.end > b.start);
    });
    setShowAwayModal(false);
    setAwayStart(null);
  };

  const startPause = () => setAwayStart(now);

  const endPause = () => {
    const duration = Math.max(1, now - awayStart);
    insertAwayBlock(duration, awayAbsorbFlex);
  };

  const manualPause = () => {
    insertAwayBlock(awayManualMins, awayAbsorbFlex);
  };

  /* ── quick meeting ───────────────────────────────────── */
  const insertQuickMeeting = (duration, label, consumeFrom) => {
    const ci = getCurIdx();
    const meetingId = `mtg_${Date.now()}`;
    setBlocks((prev) => {
      const newBlocks = prev.map((b, i) => {
        if (i === ci) return { ...b, end: now };
        return { ...b };
      });

      newBlocks.splice(ci + 1, 0, {
        id: meetingId,
        label: label || "Meeting",
        start: now,
        end: now + duration,
        type: "meeting",
      });

      // Push breaks and lunch after the meeting
      for (let i = ci + 2; i < newBlocks.length; i++) {
        const b = newBlocks[i];
        if (b.type === "meeting" || b.type === "wrapup") continue;
        if (b.start < now + duration) {
          const dur = b.end - b.start;
          newBlocks[i] = {
            ...b,
            start: now + duration,
            end: now + duration + dur,
          };
        }
      }
      newBlocks.sort((a, b) => a.start - b.start);

      if (consumeFrom === "flex") {
        const flexIdx = newBlocks.findIndex((b) => b.type === "flex-work");
        if (flexIdx >= 0) {
          const flex = newBlocks[flexIdx];
          const newEnd = Math.max(flex.start, flex.end - duration);
          newBlocks[flexIdx] = { ...flex, end: newEnd };
        }
      }

      return newBlocks.filter((b) => b.end > b.start);
    });
    setTasks((p) => ({ ...p, [meetingId]: "" }));
    setShowQuickMtgModal(false);
    setQuickMtgStart(null);
    setQuickMtgLabel("");
  };

  const startQuickMtg = () => setQuickMtgStart(now);

  const endQuickMtg = () => {
    const duration = Math.max(1, now - quickMtgStart);
    insertQuickMeeting(duration, quickMtgLabel, quickMtgConsumeFrom);
  };

  const manualQuickMtg = () => {
    insertQuickMeeting(quickMtgManualMins, quickMtgLabel, quickMtgConsumeFrom);
  };

  /* ── add meeting ─────────────────────────────────────── */
  const addMeeting = useCallback(() => {
    const meetStart = mtgHour * 60 + mtgMinute;
    const meetEnd = meetStart + mtgDuration;
    const meetingId = `mtg_${Date.now()}`;

    setBlocks((prev) => {
      let newBlocks = prev.map((b) => ({ ...b }));

      if (mtgIncludesLunch) {
        newBlocks = newBlocks.filter((b) => b.id !== "lunch");
      }

      newBlocks.push({
        id: meetingId,
        label: mtgLabel || "Meeting",
        start: meetStart,
        end: meetEnd,
        type: "meeting",
      });
      newBlocks.sort((a, b) => a.start - b.start);

      const pinned = new Set();
      if (!mtgIncludesLunch) pinned.add("lunch");
      newBlocks.forEach((b) => {
        if (b.type === "meeting" || b.type === "wrapup") pinned.add(b.id);
      });

      // Truncate non-pinned blocks that overlap a pinned block's start
      for (let i = 0; i < newBlocks.length - 1; i++) {
        const curr = newBlocks[i];
        const next = newBlocks[i + 1];
        if (
          curr.end > next.start &&
          !pinned.has(curr.id) &&
          pinned.has(next.id)
        ) {
          newBlocks[i] = { ...curr, end: next.start };
        }
      }

      // Push non-pinned blocks forward when they overlap a pinned block's end
      let changed = true;
      let iterations = 0;
      while (changed && iterations < 50) {
        changed = false;
        iterations++;
        for (let i = 0; i < newBlocks.length - 1; i++) {
          const curr = newBlocks[i];
          const next = newBlocks[i + 1];
          if (next.start < curr.end && !pinned.has(next.id)) {
            if (next.type === "flex-work") {
              newBlocks[i + 1] = { ...next, start: curr.end };
            } else {
              const dur = next.end - next.start;
              newBlocks[i + 1] = {
                ...next,
                start: curr.end,
                end: curr.end + dur,
              };
            }
            changed = true;
          }
        }
        newBlocks.sort((a, b) => a.start - b.start);
      }

      newBlocks = newBlocks.filter((b) => b.end > b.start);
      return newBlocks;
    });

    setTasks((p) => ({ ...p, [meetingId]: "" }));
    setMtgLabel("");
    setMtgIncludesLunch(false);
    setShowMeetingForm(false);
  }, [mtgLabel, mtgHour, mtgMinute, mtgDuration, mtgIncludesLunch]);

  const removeMeeting = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setTasks((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  /* ── notion export ──────────────────────────────────── */
  const copyMarkdown = async () => {
    const md = buildMarkdown(blocks, tasks, wrapup);
    await navigator.clipboard.writeText(md);
    setExportStatus("copied");
    setTimeout(() => setExportStatus(null), 2000);
  };

  const sendToNotion = async () => {
    const token = import.meta.env.VITE_NOTION_TOKEN;
    const parentPage = import.meta.env.VITE_NOTION_PARENT_PAGE;
    const dbId = import.meta.env.VITE_NOTION_DATABASE_ID;
    if (!token || (!parentPage && !dbId)) {
      setExportStatus("missing-env");
      setTimeout(() => setExportStatus(null), 4000);
      return;
    }
    setExportStatus("sending");
    try {
      const payload = buildNotionPayload(
        parentPage,
        schedType,
        blocks,
        tasks,
        wrapup,
      );

      if (notionPageId) {
        const updateRes = await notionFetch(`/pages/${notionPageId}`, token, {
          method: "PATCH",
          body: JSON.stringify({ properties: payload.properties }),
        });
        if (!updateRes.ok) {
          const err = await updateRes.json().catch(() => ({}));
          if (updateRes.status === 401) setExportStatus("bad-token");
          else if (updateRes.status === 404) setExportStatus("bad-parent");
          else setExportStatus(`error: ${err.message || updateRes.status}`);
        } else {
          await replaceNotionPageContent(notionPageId, token, payload.children);
          setExportStatus("sent");
        }
      } else {
        const createRes = await notionFetch("/pages", token, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          if (createRes.status === 401) setExportStatus("bad-token");
          else if (createRes.status === 404) setExportStatus("bad-parent");
          else setExportStatus(`error: ${err.message || createRes.status}`);
        } else {
          const created = await createRes.json();
          setNotionPageId(created.id);
          setExportStatus("sent");
        }
      }
    } catch {
      setExportStatus("network-error");
    }
    setTimeout(() => setExportStatus(null), 4000);
  };

  /* ── auto-send to Notion at 5 PM ─────────────────── */
  const autoSent = useRef(false);
  useEffect(() => {
    if (now >= 1020 && schedType && !autoSent.current) {
      autoSent.current = true;
      const token = import.meta.env.VITE_NOTION_TOKEN;
      const parentPage = import.meta.env.VITE_NOTION_PARENT_PAGE;
      const dbId = import.meta.env.VITE_NOTION_DATABASE_ID;
      if (token && (parentPage || dbId)) {
        setTimeout(sendToNotion, 0);
      }
    }
  });

  /* ── auto-open loose ends panel ────────────────────── */
  const curBlockKey = blocks[getCurIdx()]?.id;
  useEffect(() => {
    setLooseEndsManualState(null);
  }, [curBlockKey]);

  const countOpenPanels = (overrides = {}) => {
    const tw = overrides.teamwork ?? teamworkOpen;
    const gh = overrides.github ?? githubOpen;
    const le = overrides.looseEnds ?? looseEndsOpen;
    return (tw ? 1 : 0) + (gh ? 1 : 0) + (le ? 1 : 0);
  };

  const handleLooseEndsToggle = (open) => {
    setLooseEndsManualState(open);
    if (open) {
      const w = window.innerWidth;
      if (w < 1600) {
        setTeamworkOpen(false);
        setGithubOpen(false);
      } else if (w < 2080 && countOpenPanels({ looseEnds: true }) > 2) {
        setGithubOpen(false);
      }
    }
  };

  const handleTeamworkToggle = (open) => {
    setTeamworkOpen(open);
    if (open) {
      const w = window.innerWidth;
      if (w < 1600) {
        setLooseEndsManualState(false);
        setGithubOpen(false);
      } else if (w < 2080 && countOpenPanels({ teamwork: true }) > 2) {
        setGithubOpen(false);
      }
    }
  };

  const handleGitHubToggle = (open) => {
    setGithubOpen(open);
    if (open) {
      const w = window.innerWidth;
      if (w < 1600) {
        setTeamworkOpen(false);
        setLooseEndsManualState(false);
      } else if (w < 2080 && countOpenPanels({ github: true }) > 2) {
        setTeamworkOpen(false);
      }
    }
  };

  /* ── render ────────────────────────────────────────── */
  if (configStatus === "loading" || !schedType) {
    return <LoadingScreen onInitSchedule={initSchedule} />;
  }

  const ci = getCurIdx();
  const cur = blocks[ci];
  const isAutoOpenBlock =
    cur && (cur.id === "plan" || cur.type === "flex-work");
  const looseEndsOpen =
    looseEndsManualState !== null ? looseEndsManualState : isAutoOpenBlock;
  const wrapBlock = blocks.find((b) => b.type === "wrapup");
  const hasFlexTime = blocks.some((b) => b.type === "flex-work");
  const schedStartHour = blocks.length
    ? Math.floor(Math.min(...blocks.map((b) => b.start)) / 60)
    : 8;
  const schedEndHour = blocks.length
    ? Math.ceil(Math.max(...blocks.map((b) => b.end)) / 60)
    : 18;

  const exportStatusMsg = {
    copied: "✅ Copied to clipboard!",
    sent: "✅ Sent to Notion!",
    sending: "⏳ Sending…",
    "missing-env":
      "⚠️ Set VITE_NOTION_TOKEN and VITE_NOTION_PARENT_PAGE env vars",
    "bad-token": "⚠️ Invalid Notion token",
    "bad-parent": "⚠️ Parent page not found",
    "network-error": "⚠️ Network error — is the dev server running?",
  };

  const handleTaskChange = (id, value) => {
    setTasks((p) => ({ ...p, [id]: value }));
  };

  const handleWrapupChange = (key, value) => {
    setWrapup((p) => ({ ...p, [key]: value }));
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "system-ui,sans-serif",
        color: "#e5e7eb",
        transition: "padding 0.25s ease",
      }}
    >
      {/* Left panels wrapper */}
      {(teamwork.configured || github.configured) && (
        <div
          style={{
            width:
              teamworkOpen && githubOpen
                ? "calc(900px + 32px)"
                : teamworkOpen || githubOpen
                  ? "calc(450px + 32px)"
                  : "32px",
            flexShrink: 0,
            transition: "width 0.25s ease",
            position: "relative",
            alignSelf: "stretch",
            zIndex: 1,
          }}
        >
          {teamwork.configured && (
            <TeamworkPanel
              open={teamworkOpen}
              onToggle={handleTeamworkToggle}
              tasks={teamwork.tasks}
              projects={teamwork.projects}
              loading={teamwork.loading}
              selectedProjectId={teamwork.selectedProjectId}
              workflowData={teamwork.workflowData}
              onProjectChange={teamwork.setProject}
              onToggleExpanded={teamwork.toggleExpanded}
              onToggleDescExpanded={teamwork.toggleDescExpanded}
              onLoadWorkflowStages={teamwork.loadWorkflowStages}
              onChangeStage={teamwork.changeStage}
              panelLeft={githubOpen ? 480 : 30}
            />
          )}
          {github.configured && (
            <GitHubPanel
              open={githubOpen}
              onToggle={handleGitHubToggle}
              grouped={github.grouped}
              unreadCount={github.unreadCount}
              loading={github.loading}
              onMarkRead={github.markRead}
              onMarkDone={github.markDone}

            />
          )}
        </div>
      )}
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          padding: "16px",
          flexShrink: 0,
          background: "#0a0a0a",
          zIndex: 2,
        }}
      >
        <Header
          scheduleLabel={schedules[schedType]?.label || schedType}
          scheduleEmoji={schedules[schedType]?.emoji || ""}
          now={now}
          notifPerm={notifPerm}
          onRequestNotif={requestNotif}
          onTestNotif={testNotif}
          onReload={reloadScheduleFromConfig}
        />

        {cur && (
          <CurrentBlock
            block={cur}
            now={now}
            tasks={tasks}
            onTaskChange={handleTaskChange}
            onResize={resizeCurrentBlock}
            onShift={shiftCurrentBlock}
            onStepAway={() => setShowAwayModal(true)}
            onQuickMeeting={() => setShowQuickMtgModal(true)}
          />
        )}

        <AwayModal
          show={showAwayModal}
          awayStart={awayStart}
          now={now}
          awayAbsorbFlex={awayAbsorbFlex}
          awayManualMins={awayManualMins}
          onAbsorbChange={setAwayAbsorbFlex}
          onManualMinsChange={setAwayManualMins}
          onStartPause={startPause}
          onEndPause={endPause}
          onManualPause={manualPause}
          onClose={() => setShowAwayModal(false)}
        />

        <QuickMeetingModal
          show={showQuickMtgModal}
          meetingStart={quickMtgStart}
          now={now}
          label={quickMtgLabel}
          manualMins={quickMtgManualMins}
          consumeFrom={quickMtgConsumeFrom}
          onLabelChange={setQuickMtgLabel}
          onManualMinsChange={setQuickMtgManualMins}
          onConsumeFromChange={setQuickMtgConsumeFrom}
          onStartTimer={startQuickMtg}
          onEndTimer={endQuickMtg}
          onManualAdd={manualQuickMtg}
          onClose={() => setShowQuickMtgModal(false)}
        />

        <MeetingForm
          show={showMeetingForm}
          hasFlexTime={hasFlexTime}
          startHour={schedStartHour}
          endHour={schedEndHour}
          mtgLabel={mtgLabel}
          mtgHour={mtgHour}
          mtgMinute={mtgMinute}
          mtgDuration={mtgDuration}
          mtgIncludesLunch={mtgIncludesLunch}
          onLabelChange={setMtgLabel}
          onHourChange={setMtgHour}
          onMinuteChange={setMtgMinute}
          onDurationChange={setMtgDuration}
          onIncludesLunchChange={setMtgIncludesLunch}
          onAdd={addMeeting}
          onToggle={setShowMeetingForm}
        />

        <BlockList
          blocks={blocks}
          currentIndex={ci}
          now={now}
          tasks={tasks}
          onTaskChange={handleTaskChange}
          onRemoveMeeting={removeMeeting}
        />

        <WrapupSection
          wrapup={wrapup}
          wrapBlock={wrapBlock}
          onWrapupChange={handleWrapupChange}
        />

        <ExportBar
          exportStatus={exportStatus}
          exportStatusMsg={exportStatusMsg}
          onCopyMarkdown={copyMarkdown}
          onSendToNotion={sendToNotion}
        />
      </div>
      <LooseEndsPanel
        open={looseEndsOpen}
        onToggle={handleLooseEndsToggle}
        items={looseEnds.items}
        loading={looseEnds.loading}
        onAdd={looseEnds.addItem}
        onComplete={looseEnds.completeItem}
        onDelete={looseEnds.deleteItem}
      />
    </div>
  );
}
