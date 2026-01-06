import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  Gantt,
  Willow,
  ContextMenu,
  Editor,
  getEditorItems,
  registerEditorItem,
} from '../index.js';
import { defaultColumns } from '@svar-ui/gantt-store';
import { Button, Combo, MultiCombo, Segmented } from '@svar-ui/react-core';
import {
  createJalaliScales,
  createJalaliHighlightTime,
  formatJalaliDateColumn,
} from '../helpers/jalaliCalendar.js';
import '../components/jalali-styles.css';
import '../components/assignee/AssigneeUI.css';
import './GanttEditor.css';
import { loadAssignees, loadCategories, loadGanttData, saveGanttData } from '../lib/ganttService.js';

// Base styles from SVAR UI packages
import '@svar-ui/react-core/style.css';
import '@svar-ui/react-grid/style.css';
import '@svar-ui/react-editor/style.css';
import '@svar-ui/react-menu/style.css';
import '@svar-ui/react-toolbar/style.css';
import '@svar-ui/react-comments/style.css';
import '@svar-ui/react-tasklist/style.css';

/**
 * GanttEditor component with Jalali calendar support
 * Handles data persistence and editing
 */
// Default sample data
const defaultTasks = [
  {
    id: 1,
    text: 'My Project',
    start: new Date(2026, 0, 5),
    duration: 10,
    progress: 30,
    parent: 0,
    // NOTE: don't set `open: true` unless the task actually has `data: []` children,
    // otherwise gantt-store will try to iterate null children and crash.
    type: 'task',
  },
];
const defaultLinks = [];

function parseDates(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    const out = { ...item };
    // Normalize all persisted dates to LOCAL midnight to avoid timezone/DST rendering issues.
    // (If we store "00:00Z" it becomes 03:30 local in Iran and spans 2 day-cells.)
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

function serializeDates(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    const out = { ...item };
    // Persist as YYYY-MM-DD (local date) to keep day-precision stable across timezones
    const toYmd = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    if (out.start instanceof Date) out.start = toYmd(out.start);
    if (out.end instanceof Date) out.end = toYmd(out.end);
    return out;
  });
}

export default function GanttEditor() {
  const [api, setApi] = useState(null);
  const hydratedRef = useRef(false);
  const didScrollToTodayRef = useRef(false);
  // Initialize with default data immediately (not empty array)
  const [tasks, setTasks] = useState(defaultTasks);
  const [links, setLinks] = useState(defaultLinks);
  const [assignees, setAssignees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saveState, setSaveState] = useState({ status: 'idle', backend: null, error: null }); // idle|saving|saved|error

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('assignee'); // assignee | category

  // Close settings on Escape
  useEffect(() => {
    if (!settingsOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen]);

  // Register searchable combo controls for the editor (Assignees)
  useEffect(() => {
    registerEditorItem('combo', Combo);
    registerEditorItem('multicombo', MultiCombo);
  }, []);
  const safeTasks = useMemo(() => {
    // Guard against `open: true` with missing children data (causes gantt-store crash)
    if (!Array.isArray(tasks)) return [];
    return tasks.map((t) => {
      if (!t) return t;
      // Backward-compatible migration:
      // - old: assigneeId (string|number)
      // - new: assigneeIds (string[])
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

      // Normalize categoryId to string
      if (normalized.categoryId !== undefined && normalized.categoryId !== null && normalized.categoryId !== '') {
        normalized = { ...normalized, categoryId: String(normalized.categoryId) };
      }
      
      // Keep dates at local midnight; parseDates/serializeDates handle this.

      if (normalized.open === true && !Array.isArray(normalized.data)) {
        const { open, ...rest } = normalized;
        return rest;
      }
      return normalized;
    });
  }, [tasks]);

  // Load data from Supabase Storage (JSON file) on mount
  useEffect(() => {
    let cancelled = false;

    // Load Gantt data independently so it isn't lost if assignee/category APIs fail.
    loadGanttData()
      .then((data) => {
        if (cancelled) return;
        console.log('🔎 Gantt load result:', {
          backend: data?.backend,
          tasksCount: Array.isArray(data?.tasks) ? data.tasks.length : null,
          linksCount: Array.isArray(data?.links) ? data.links.length : null,
        });
        const nextTasks = parseDates(data?.tasks);
        const nextLinks = Array.isArray(data?.links) ? data.links : [];
        setTasks(nextTasks.length ? nextTasks : defaultTasks);
        setLinks(nextLinks);
        if (data?.backend) setSaveState((s) => ({ ...s, backend: data.backend }));
      })
      .catch((error) => {
        console.error('Error loading Gantt data:', error);
        setTasks(defaultTasks);
        setLinks([]);
      })
      .finally(() => {
        hydratedRef.current = true;
      });

    loadAssignees()
      .then((a) => {
        if (cancelled) return;
        setAssignees(Array.isArray(a) ? a : []);
      })
      .catch((error) => {
        console.error('Error loading assignees:', error);
        if (cancelled) return;
        setAssignees([]);
      });

    loadCategories()
      .then((c) => {
        if (cancelled) return;
        setCategories(Array.isArray(c) ? c : []);
      })
      .catch((error) => {
        console.error('Error loading categories:', error);
        if (cancelled) return;
        setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // On reload, scroll timeline to the beginning of the current day (local midnight).
  // We retry for a short window because the gantt can re-init scales/scroll during first layout passes.
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
      
      // Use the scale's minUnit (e.g., 'day' or 'hour') for accurate pixel calculation
      const unit = sc.minUnit || 'day';
      const cellWidth = sc.lengthUnitWidth || 100;
      
      // Calculate difference in the scale's minUnit (e.g., days or hours)
      // sc.diff(end, start, unit) returns the number of units between dates
      const diffInUnits = sc.diff(today, sc.start, unit);
      
      // Convert units to pixels
      // If minUnit is 'day', each day is cellWidth pixels
      // If minUnit is 'hour', each hour is cellWidth pixels (when lengthUnit is 'hour')
      let pxPerUnit = cellWidth;
      if (unit === 'day' && sc.lengthUnit === 'day') {
        pxPerUnit = cellWidth; // 1 day = cellWidth pixels
      } else if (unit === 'hour' && sc.lengthUnit === 'hour') {
        pxPerUnit = cellWidth; // 1 hour = cellWidth pixels
      } else if (unit === 'hour' && sc.lengthUnit === 'day') {
        pxPerUnit = cellWidth / 24; // 1 hour = cellWidth/24 pixels when lengthUnit is day
      }
      
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

      // Recompute every frame because scales can re-init after data load / resize.
      const desiredLeft = computeDesiredLeft(sc, chartEl);

      const current = chartEl.scrollLeft ?? 0;
      const delta = Math.abs(current - desiredLeft);

      // Debug: log on first few attempts to diagnose issues
      if (tries <= 5) {
        console.log('🔍 Scroll to today:', {
          tries,
          today: new Date().toISOString().split('T')[0],
          scaleStart: sc.start?.toISOString().split('T')[0],
          scaleEnd: sc.end?.toISOString().split('T')[0],
          minUnit: sc.minUnit,
          lengthUnit: sc.lengthUnit,
          lengthUnitWidth: sc.lengthUnitWidth,
          width: sc.width,
          chartWidth: chartEl.clientWidth,
          desiredLeft,
          current,
          delta,
        });
      }

      // If something reset scroll back to the start, keep re-applying until it sticks.
      if (delta > 2) {
        api.exec?.('scroll-chart', { left: desiredLeft });
        chartEl.scrollLeft = desiredLeft;
        stableFrames = 0;
      } else {
        stableFrames += 1;
      }

      // Require a few stable frames to avoid stopping too early while the chart is still initializing.
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

  // Inject CSS rules for category colors
  useEffect(() => {
    const styleId = 'gantt-category-colors';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    // Default: gray background for bars without category
    let css = `
      .wx-bar.wx-GKbcLEGA:not([data-category-id]):not([data-category-id=""]),
      .wx-bar.wx-GKbcLEGA[data-category-id=""] {
        background-color: #808080 !important;
      }
    `;

    // Category-specific colors
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        if (cat?.id && cat?.color) {
          css += `
            .wx-bar.wx-GKbcLEGA[data-category-id="${cat.id}"] {
              background-color: ${cat.color} !important;
            }
          `;
        }
      });
    }

    styleEl.textContent = css;

    return () => {
      // Don't remove the style element on unmount, as it might be used by other instances
    };
  }, [categories]);

  const assigneesById = useMemo(() => {
    const map = new Map();
    if (Array.isArray(assignees)) {
      assignees.forEach((a) => {
        if (!a) return;
        map.set(a.id, a);
        // also allow numeric lookups if any task stores number ids
        if (a.id !== undefined && a.id !== null) map.set(Number(a.id), a);
      });
    }
    return map;
  }, [assignees]);

  const categoriesById = useMemo(() => {
    const map = new Map();
    if (Array.isArray(categories)) {
      categories.forEach((c) => {
        if (!c) return;
        map.set(c.id, c);
        // also allow numeric lookups if any task stores number ids
        if (c.id !== undefined && c.id !== null) map.set(Number(c.id), c);
      });
    }
    return map;
  }, [categories]);

  const editorItems = useMemo(() => {
    const base = getEditorItems().map((i) => ({ ...i }));
    const typeIndex = base.findIndex((i) => i.key === 'type');
    const insertAt = typeIndex >= 0 ? typeIndex + 1 : 1;

    const assigneeItem = {
      key: 'assigneeIds',
      comp: 'multicombo',
      label: 'Assignees',
      options: assignees,
      config: {
        placeholder: 'Select assignees',
        clear: true,
        textField: 'label',
      },
      // Render option with avatar (MultiCombo supports render prop children via { option })
      children: ({ option }) => (
        <div className="wx-assignee-option">
          <div className="wx-assignee-avatar">
            {option?.avatar ? <img src={option.avatar} alt="" /> : null}
          </div>
          <div>{option?.label ?? ''}</div>
        </div>
      ),
    };

    const categoryItem = {
      key: 'categoryId',
      comp: 'combo',
      label: 'Category',
      options: categories,
      config: {
        placeholder: 'Select category',
        clear: true,
        textField: 'name',
      },
      // Render option with color dot
      children: ({ option }) => (
        <div className="wx-assignee-option">
          <div
            className="wx-category-dot16"
            style={{ backgroundColor: option?.color || '#ccc' }}
          />
          <div>{option?.name ?? ''}</div>
        </div>
      ),
    };

    base.splice(insertAt, 0, assigneeItem);
    // Insert category after assignees
    const assigneeItemIndex = base.findIndex((i) => i.key === 'assigneeIds');
    base.splice(assigneeItemIndex + 1, 0, categoryItem);
    return base;
  }, [assignees, categories]);

  // Initialize Gantt API and set up event handlers
  const init = useCallback(
    (ganttApi) => {
      setApi(ganttApi);

      // Save data on changes
      const saveData = async () => {
        // Prevent overwriting cloud/local data during initial mount/hydration.
        // Some gantt events may fire during init/render even before load completes.
        if (!hydratedRef.current) return;

        const currentTasks = ganttApi.serialize();
        const state = ganttApi.getState();
        // IMPORTANT: Persist RAW links (source/target/type/id), not computed `_links` (which contains $p, $pl, etc).
        // `state.links` is a DataArray (from gantt-store) and supports `.map(...)`.
        let currentLinks = [];
        try {
          if (Array.isArray(state?.links)) {
            currentLinks = state.links;
          } else if (state?.links && typeof state.links.map === 'function') {
            currentLinks = state.links.map((l) => l);
          }
        } catch {
          currentLinks = [];
        }
        currentLinks = (Array.isArray(currentLinks) ? currentLinks : [])
          .filter((l) => l && l.source !== undefined && l.target !== undefined)
          .map((l) => {
            const clean = {
              id: l.id,
              source: l.source,
              target: l.target,
              type: l.type,
            };
            if (l.lag !== undefined) clean.lag = l.lag;
            return clean;
          });

        const flattenAndPickTasks = (tree) => {
          const out = new Map();
          const walk = (arr) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((t) => {
              if (!t) return;
              const clean = {};
              const keep = [
                'id',
                'text',
                'start',
                'end',
                'duration',
                'progress',
                'parent',
                'type',
                'details',
                'assigneeIds',
                'categoryId',
                'unscheduled',
              ];
              keep.forEach((k) => {
                if (t[k] !== undefined) clean[k] = t[k];
              });
              // Backward-compat: if something wrote assigneeId, migrate to assigneeIds before saving
              if (
                (clean.assigneeIds === undefined || clean.assigneeIds === null) &&
                t.assigneeId !== undefined &&
                t.assigneeId !== null &&
                t.assigneeId !== ''
              ) {
                clean.assigneeIds = [String(t.assigneeId)];
              }
              out.set(clean.id, clean);
              if (Array.isArray(t.data)) walk(t.data);
            });
          };
          walk(tree);
          return Array.from(out.values());
        };

        const dataToSave = {
          tasks: serializeDates(flattenAndPickTasks(currentTasks)),
          links: currentLinks,
        };

        setSaveState((s) => ({ ...s, status: 'saving' }));
        try {
          const result = await saveGanttData(dataToSave);
          if (result?.ok) {
            setSaveState({ status: 'saved', backend: result.backend || null, error: result?.error || null });
          } else {
            setSaveState({ status: 'error', backend: result?.backend || null, error: result?.error || null });
          }
        } catch (error) {
          console.error('Error saving Gantt data:', error);
          setSaveState({ status: 'error', backend: null, error });
        }
      };

      // Listen to all change events
      // fire-and-forget (handlers are sync)
      ganttApi.on('update-task', () => void saveData());
      ganttApi.on('add-task', () => void saveData());
      ganttApi.on('delete-task', () => void saveData());
      ganttApi.on('add-link', () => void saveData());
      ganttApi.on('update-link', () => void saveData());
      ganttApi.on('delete-link', () => void saveData());
    },
    []
  );

  // Custom columns with Jalali date formatting
  // Hide 'start' and 'duration' columns by default
  const columns = useMemo(() => {
    try {
      // Use defaultColumns if available, otherwise let Gantt use its defaults
      if (!defaultColumns || !Array.isArray(defaultColumns) || defaultColumns.length === 0) {
        console.warn('defaultColumns not available, using Gantt defaults');
        return undefined; // Let Gantt use defaultColumns internally
      }
      return defaultColumns
        .filter((col) => col && col.id !== 'start' && col.id !== 'duration') // Hide start and duration columns
        .map((col) => {
          if (col && (col.id === 'start' || col.id === 'end')) {
            return {
              ...col,
              template: (date) => formatJalaliDateColumn(date),
            };
          }
          return col;
        });
    } catch (error) {
      console.error('Error creating columns:', error);
      return undefined; // Fallback to defaults
    }
  }, []);

  // Jalali scales configuration
  const scales = useMemo(() => createJalaliScales(), []);

  // Highlight Thursday and Friday columns
  const highlightTime = useMemo(() => createJalaliHighlightTime(), []);

  // Calculate the end date: one month after the latest task end date
  const endDate = useMemo(() => {
    let maxEndDate = null;

    (Array.isArray(tasks) ? tasks : []).forEach((task) => {
      if (!task) return;
      let taskEndDate;

      if (task.end) {
        taskEndDate = new Date(task.end);
      } else if (task.start && task.duration) {
        taskEndDate = new Date(task.start);
        taskEndDate.setDate(taskEndDate.getDate() + task.duration);
      } else if (task.start) {
        taskEndDate = new Date(task.start);
      }

      if (taskEndDate && (!maxEndDate || taskEndDate > maxEndDate)) {
        maxEndDate = taskEndDate;
      }
    });

    if (maxEndDate) {
      const oneMonthLater = new Date(maxEndDate);
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      return oneMonthLater;
    }

    return null;
  }, [tasks]);

  // Always show 1 week before the earliest task start
  const startDate = useMemo(() => {
    let minStartDate = null;
    (Array.isArray(tasks) ? tasks : []).forEach((task) => {
      if (!task?.start) return;
      const s = new Date(task.start);
      if (!minStartDate || s < minStartDate) minStartDate = s;
    });
    if (!minStartDate) return null;
    const d = new Date(minStartDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 7);
    return d;
  }, [tasks]);

  const TaskTemplate = useMemo(() => {
    return function AssigneeTaskTemplate({ data }) {
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

      // Milestone text is rendered outside; still show avatar if exists
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

  const settingsTabs = useMemo(
    () => [
      { id: 'assignee', label: 'Assignee' },
      { id: 'category', label: 'Category' },
    ],
    []
  );

  const AssigneeAvatar48 = useMemo(() => {
    return function AssigneeAvatar48Inner({ avatar, name }) {
      const [broken, setBroken] = useState(false);
      return (
        <div className="wx-settings-avatar48" aria-label={name || ''}>
          {!broken && avatar ? (
            <img
              src={avatar}
              alt=""
              onError={() => setBroken(true)}
              loading="lazy"
            />
          ) : null}
        </div>
      );
    };
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="wx-gantt-editor-header">
        <div className="wx-gantt-editor-header-title">
          <img src="/logo.svg" alt="Logo" className="wx-gantt-editor-logo" />
          <h1>Shopping Redesign & Design System unified roadmap</h1>
          <div
            className={[
              'wx-save-indicator',
              saveState.status === 'saving' ? 'wx-save-indicator--saving' : '',
              saveState.status === 'saved' ? 'wx-save-indicator--saved' : '',
              saveState.status === 'error' ? 'wx-save-indicator--error' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={
              saveState.status === 'error'
                ? 'Save failed (check console).'
                : saveState.backend === 'supabase'
                  ? 'Saved to Supabase Storage'
                  : saveState.backend === 'local' && saveState.error
                    ? 'Saved to localStorage (cloud save failed — check console; likely missing Storage write policy)'
                    : saveState.backend === 'local'
                      ? 'Saved to localStorage'
                      : 'Save status'
            }
          >
            {saveState.status === 'saving'
              ? 'Saving…'
              : saveState.status === 'error'
                ? 'Save failed'
                : saveState.backend === 'supabase'
                  ? 'Saved (cloud)'
                  : saveState.backend === 'local' && saveState.error
                    ? 'Saved (local*)'
                    : saveState.backend === 'local'
                      ? 'Saved (local)'
                    : '—'}
          </div>
        </div>
        <div className="wx-gantt-editor-header-actions">
          <Button
            type="secondary"
            icon="wxi-external-link"
            css="wx-gantt-editor-settings-btn"
            onClick={() => {
              window.location.href = '/viewer';
            }}
          >
            Viewer
          </Button>
          <Button
            type="secondary"
            icon="wxi-settings"
            css="wx-gantt-editor-settings-btn"
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </Button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Willow>
          <ContextMenu api={api}>
            <Gantt
              init={init}
              tasks={safeTasks}
              links={Array.isArray(links) ? links : []}
              scales={scales}
              {...(columns && { columns })}
              taskTemplate={TaskTemplate}
              start={startDate}
              end={endDate}
              autoScale={false}
              highlightTime={highlightTime}
            />
          </ContextMenu>
          {api && <Editor api={api} items={editorItems} />}
          {settingsOpen ? (
            <div
              className="wx-1FxkZa wx-modal"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                // only close when clicking the backdrop (not inside the window)
                if (e.target === e.currentTarget) setSettingsOpen(false);
              }}
              onClick={(e) => {
                // also handle normal click (some browsers/devices don't fire mousedown as expected)
                if (e.target === e.currentTarget) setSettingsOpen(false);
              }}
            >
              <div
                className="wx-1FxkZa wx-window"
                // no-op; events are handled by the backdrop guard above
              >
                <div className="wx-1FxkZa wx-header">
                  <div className="wx-settings-modal-header">
                    <div className="wx-settings-modal-title">Settings</div>
                    <Button
                      type="secondary"
                      icon="wxi-close"
                      css="wx-settings-close-btn"
                      onClick={() => setSettingsOpen(false)}
                    />
                  </div>
                </div>
                <div className="wx-settings-modal">
                  <div className="wx-settings-tabs">
                    <Segmented
                      value={settingsTab}
                      options={settingsTabs}
                      onChange={({ value }) => setSettingsTab(value)}
                    />
                  </div>

                  {settingsTab === 'assignee' ? (
                    <div className="wx-settings-list" role="list">
                      {assignees.map((u) => (
                        <div className="wx-settings-row" role="listitem" key={u.id}>
                          <AssigneeAvatar48 avatar={u.avatar} name={u.label} />
                          <div className="wx-settings-row-name">{u.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="wx-settings-list" role="list">
                      {categories.map((cat, idx) => (
                        <div
                          className="wx-settings-row"
                          role="listitem"
                          key={`${cat.name}-${idx}`}
                        >
                          <div
                            className="wx-settings-color24"
                            style={{ backgroundColor: cat.color || '#dfe2e6' }}
                            aria-label={cat.name || ''}
                          />
                          <div className="wx-settings-row-name">{cat.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Willow>
      </div>
    </div>
  );
}

