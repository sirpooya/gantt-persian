import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { Gantt, Willow } from '../index.js';
import { loadAssignees, loadCategories, loadGanttDataPublicOnly } from '../lib/ganttService.js';
import { createJalaliScales, createJalaliHighlightTime } from '../helpers/jalaliCalendar.js';
import './GanttViewer.css';
import '../components/jalali-styles.css';
import '../components/assignee/AssigneeUI.css';

// Base styles from SVAR UI packages
import '@svar-ui/react-core/style.css';
import '@svar-ui/react-grid/style.css';
import '@svar-ui/react-editor/style.css';
import '@svar-ui/react-menu/style.css';
import '@svar-ui/react-toolbar/style.css';
import '@svar-ui/react-comments/style.css';
import '@svar-ui/react-tasklist/style.css';

function parseDates(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    const out = { ...item };
    const toLocalMidnight = (v) => {
      if (!v) return v;
      const d = v instanceof Date ? v : new Date(v);
      if (Number.isNaN(d.getTime())) return v;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    if (out.start) out.start = toLocalMidnight(out.start);
    if (out.end) out.end = toLocalMidnight(out.end);
    return out;
  });
}

function expandAllParents(tasks) {
  if (!Array.isArray(tasks) || !tasks.length) return [];
  const parentIds = new Set();
  tasks.forEach((t) => {
    if (!t) return;
    if (t.parent !== undefined && t.parent !== null && t.parent !== 0) parentIds.add(t.parent);
  });
  return tasks.map((t) => {
    if (!t) return t;
    if (parentIds.has(t.id)) return { ...t, open: true };
    return t;
  });
}

export default function GanttViewer() {
  const [api, setApi] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [categories, setCategories] = useState([]);
  const hydratedRef = useRef(false);
  const didScrollToTodayRef = useRef(false);

  // Jalali scales + highlight (Thu/Fri)
  const scales = useMemo(() => createJalaliScales(), []);
  const highlightTime = useMemo(() => createJalaliHighlightTime(), []);

  // Load data on mount
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadGanttDataPublicOnly(), loadAssignees(), loadCategories()])
      .then(([data, a, c]) => {
        if (cancelled) return;
        const nextTasks = expandAllParents(parseDates(data?.tasks));
        const nextLinks = Array.isArray(data?.links) ? data.links : [];
        setTasks(nextTasks);
        setLinks(nextLinks);
        setAssignees(Array.isArray(a) ? a : []);
        setCategories(Array.isArray(c) ? c : []);
      })
      .catch((error) => {
        console.error('Error loading viewer data:', error);
        setTasks([]);
        setLinks([]);
        setAssignees([]);
        setCategories([]);
      })
      .finally(() => {
        hydratedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize ids and keep bars safe
  const safeTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.map((t) => {
      if (!t) return t;
      let normalized = t;
      if (Array.isArray(t.assigneeIds)) {
        normalized = {
          ...t,
          assigneeIds: t.assigneeIds
            .filter((x) => x !== undefined && x !== null && x !== '')
            .map((x) => String(x)),
        };
      } else if (t.assigneeId !== undefined && t.assigneeId !== null && t.assigneeId !== '') {
        normalized = { ...t, assigneeIds: [String(t.assigneeId)] };
      }

      if (normalized.categoryId !== undefined && normalized.categoryId !== null && normalized.categoryId !== '') {
        normalized = { ...normalized, categoryId: String(normalized.categoryId) };
      }

      return normalized;
    });
  }, [safeTasks]);

  const assigneesById = useMemo(() => {
    const map = new Map();
    if (Array.isArray(assignees)) {
      assignees.forEach((a) => {
        if (!a) return;
        map.set(String(a.id), a);
        if (a.id !== undefined && a.id !== null) map.set(Number(a.id), a);
      });
    }
    return map;
  }, [assignees]);

  // Inject CSS rules for category colors (same idea as editor, but less brittle selector)
  useEffect(() => {
    const styleId = 'gantt-viewer-category-colors';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    let css = `
      .wx-bar:not([data-category-id]):not([data-category-id=""]),
      .wx-bar[data-category-id=""] {
        background-color: #808080 !important;
      }
    `;
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        if (cat?.id && cat?.color) {
          css += `
            .wx-bar[data-category-id="${cat.id}"] {
              background-color: ${cat.color} !important;
            }
          `;
        }
      });
    }
    styleEl.textContent = css;
  }, [categories]);

  const TaskTemplate = useMemo(() => {
    return function ViewerTaskTemplate({ data }) {
      const ids = Array.isArray(data?.assigneeIds)
        ? data.assigneeIds
        : data?.assigneeId !== undefined && data?.assigneeId !== null && data?.assigneeId !== ''
          ? [data.assigneeId]
          : [];

      const assigneeList = ids
        .map((id) => assigneesById.get(String(id)) || assigneesById.get(Number(id)))
        .filter(Boolean);
      const visible = assigneeList.slice(0, 3);
      const extraCount = Math.max(0, assigneeList.length - visible.length);

      if (data?.type === 'milestone') {
        return visible.length ? (
          <div className="wx-assignee-task">
            <div className="wx-assignee-avatar-stack">
              {visible.map((a, i) => (
                <div
                  key={`${a.id}-${i}`}
                  className="wx-assignee-avatar"
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}
                >
                  {a?.avatar ? <img src={a.avatar} alt="" /> : null}
                </div>
              ))}
              {extraCount ? <div className="wx-assignee-more">+{extraCount}</div> : null}
            </div>
          </div>
        ) : null;
      }

      return (
        <div className="wx-assignee-task">
          {visible.length ? (
            <div className="wx-assignee-avatar-stack">
              {visible.map((a, i) => (
                <div
                  key={`${a.id}-${i}`}
                  className="wx-assignee-avatar"
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}
                >
                  {a?.avatar ? <img src={a.avatar} alt="" /> : null}
                </div>
              ))}
              {extraCount ? <div className="wx-assignee-more">+{extraCount}</div> : null}
            </div>
          ) : null}
          <div className="wx-assignee-task-text">{data?.text || ''}</div>
        </div>
      );
    };
  }, [assigneesById]);

  // Ensure period always includes today (so "scroll to today" makes sense)
  const startDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let min = today;
    (Array.isArray(safeTasks) ? safeTasks : []).forEach((t) => {
      if (!t?.start) return;
      const s = new Date(t.start);
      if (!min || s < min) min = s;
    });
    const d = new Date(min);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 7);
    return d;
  }, [safeTasks]);

  const endDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let max = today;
    (Array.isArray(safeTasks) ? safeTasks : []).forEach((t) => {
      if (!t) return;
      let e = null;
      if (t.end) e = new Date(t.end);
      else if (t.start && t.duration) {
        e = new Date(t.start);
        e.setDate(e.getDate() + t.duration);
      } else if (t.start) e = new Date(t.start);
      if (e && (!max || e > max)) max = e;
    });
    const d = new Date(max);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, [tasks]);

  const init = useCallback((ganttApi) => {
    setApi(ganttApi);

    // Hard-disable ALL mutating actions in viewer mode.
    // Some UI handlers (e.g. link clicks in Bars.jsx) don't guard on `readonly`,
    // so we enforce read-only at the event bus level.
    const block = () => false;
    // Also block expanding/collapsing (open-task) to prevent changing the tree in viewer.
    ganttApi.intercept?.('open-task', block);
    ganttApi.intercept?.('add-task', block);
    ganttApi.intercept?.('update-task', block);
    ganttApi.intercept?.('delete-task', block);
    ganttApi.intercept?.('move-task', block);
    ganttApi.intercept?.('copy-task', block);
    ganttApi.intercept?.('indent-task', block);
    ganttApi.intercept?.('drag-task', block);

    ganttApi.intercept?.('add-link', block);
    ganttApi.intercept?.('update-link', block);
    ganttApi.intercept?.('delete-link', block);
  }, []);

  // On load, scroll timeline to the beginning of the current day (local midnight).
  // (Viewer is chart-only, so this puts "today" at the left edge.)
  useEffect(() => {
    if (!api) return;
    if (!hydratedRef.current) return;
    if (didScrollToTodayRef.current) return;

    let cancelled = false;
    let tries = 0;
    let stableFrames = 0;

    const computeDesiredLeft = (sc, chartEl) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const unit = sc.minUnit || 'day';
      const cellWidth = sc.lengthUnitWidth || 100;
      const diffInUnits = sc.diff(today, sc.start, unit);

      let pxPerUnit = cellWidth;
      if (unit === 'hour' && sc.lengthUnit === 'day') pxPerUnit = cellWidth / 24;

      let left = Math.round(diffInUnits * pxPerUnit);
      const maxLeft = Math.max(0, (sc.width ?? 0) - (chartEl.clientWidth ?? 0));
      if (left < 0) left = 0;
      if (left > maxLeft) left = maxLeft;
      return left;
    };

    const tick = () => {
      if (cancelled) return;
      tries += 1;

      const state = api.getState?.();
      const sc = state?._scales;
      const chartEl = document.querySelector('.wx-chart');

      if (!sc || !sc.start || typeof sc.diff !== 'function' || !chartEl) {
        if (tries < 120) requestAnimationFrame(tick);
        return;
      }

      const desiredLeft = computeDesiredLeft(sc, chartEl);
      const current = chartEl.scrollLeft ?? 0;
      const delta = Math.abs(current - desiredLeft);

      if (delta > 2) {
        api.exec?.('scroll-chart', { left: desiredLeft });
        chartEl.scrollLeft = desiredLeft;
        stableFrames = 0;
      } else {
        stableFrames += 1;
      }

      if (stableFrames >= 4) {
        didScrollToTodayRef.current = true;
        return;
      }

      if (tries < 120) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [api, tasks?.length]);

  return (
    <div className="wx-gantt-viewer">
      <Willow>
        <Gantt
          init={init}
          tasks={Array.isArray(safeTasks) ? safeTasks : []}
          links={Array.isArray(links) ? links : []}
          scales={scales}
          highlightTime={highlightTime}
          readonly={true}
          // Chart-only: hide grid by passing no columns
          columns={[]}
          taskTemplate={TaskTemplate}
          start={startDate}
          end={endDate}
          autoScale={false}
        />
      </Willow>
    </div>
  );
}


