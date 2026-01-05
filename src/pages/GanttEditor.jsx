import React, { useMemo, useCallback, useState, useEffect } from 'react';
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
import { loadGanttData, saveGanttData } from '../lib/ganttService.js';

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
  // Initialize with default data immediately (not empty array)
  const [tasks, setTasks] = useState(defaultTasks);
  const [links, setLinks] = useState(defaultLinks);
  const [assignees, setAssignees] = useState([]);
  const [categories, setCategories] = useState([]);

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

    Promise.all([
      loadGanttData(),
      fetch('/api/assignees').then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
    ])
      .then(([data, a, c]) => {
        if (cancelled) return;
        const nextTasks = parseDates(data?.tasks);
        const nextLinks = Array.isArray(data?.links) ? data.links : [];
        setTasks(nextTasks.length ? nextTasks : defaultTasks);
        setLinks(nextLinks);
        setAssignees(Array.isArray(a) ? a : []);
        setCategories(Array.isArray(c) ? c : []);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        // fallback to defaults - ensure app still renders
        setTasks(defaultTasks);
        setLinks([]);
        setAssignees([]);
        setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      const saveData = () => {
        const currentTasks = ganttApi.serialize();
        const state = ganttApi.getState();
        const currentLinks = state._links || [];

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

        saveGanttData(dataToSave).catch((error) => {
          console.error('Error saving Gantt data:', error);
        });
      };

      // Listen to all change events
      ganttApi.on('update-task', saveData);
      ganttApi.on('add-task', saveData);
      ganttApi.on('delete-task', saveData);
      ganttApi.on('add-link', saveData);
      ganttApi.on('delete-link', saveData);
    },
    []
  );

  // Custom columns with Jalali date formatting
  const columns = useMemo(() => {
    try {
      // Use defaultColumns if available, otherwise let Gantt use its defaults
      if (!defaultColumns || !Array.isArray(defaultColumns) || defaultColumns.length === 0) {
        console.warn('defaultColumns not available, using Gantt defaults');
        return undefined; // Let Gantt use defaultColumns internally
      }
      return defaultColumns.map((col) => {
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
        </div>
        <div className="wx-gantt-editor-header-actions">
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

