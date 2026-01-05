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
import { Combo } from '@svar-ui/react-core';
import {
  createJalaliScales,
  createJalaliHighlightTime,
  formatJalaliDateColumn,
} from '../helpers/jalaliCalendar.js';
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
    if (out.start) out.start = new Date(out.start);
    if (out.end) out.end = new Date(out.end);
    return out;
  });
}

function serializeDates(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    const out = { ...item };
    if (out.start instanceof Date) out.start = out.start.toISOString();
    if (out.end instanceof Date) out.end = out.end.toISOString();
    return out;
  });
}

export default function GanttEditor() {
  const [api, setApi] = useState(null);
  // Initialize with default data immediately (not empty array)
  const [tasks, setTasks] = useState(defaultTasks);
  const [links, setLinks] = useState(defaultLinks);
  const [assignees, setAssignees] = useState([]);

  // Register searchable combo control for the editor (used for Assignee)
  useEffect(() => {
    registerEditorItem('combo', Combo);
  }, []);
  const safeTasks = useMemo(() => {
    // Guard against `open: true` with missing children data (causes gantt-store crash)
    if (!Array.isArray(tasks)) return [];
    return tasks.map((t) => {
      if (!t) return t;
      // Normalize assigneeId to string so it matches assignee option ids
      const normalized =
        t.assigneeId !== undefined && t.assigneeId !== null
          ? { ...t, assigneeId: String(t.assigneeId) }
          : t;

      if (normalized.open === true && !Array.isArray(normalized.data)) {
        const { open, ...rest } = normalized;
        return rest;
      }
      return normalized;
    });
  }, [tasks]);

  // Load data from JSON file on mount
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch('/api/gantt').then((res) => res.json()),
      fetch('/api/assignees').then((res) => res.json()),
    ])
      .then(([data, a]) => {
        if (cancelled) return;
        const nextTasks = parseDates(data?.tasks);
        const nextLinks = Array.isArray(data?.links) ? data.links : [];
        setTasks(nextTasks.length ? nextTasks : defaultTasks);
        setLinks(nextLinks);
        setAssignees(Array.isArray(a) ? a : []);
      })
      .catch(() => {
        // fallback to defaults
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const editorItems = useMemo(() => {
    const base = getEditorItems().map((i) => ({ ...i }));
    const typeIndex = base.findIndex((i) => i.key === 'type');
    const insertAt = typeIndex >= 0 ? typeIndex + 1 : 1;

    const assigneeItem = {
      key: 'assigneeId',
      comp: 'combo',
      label: 'Assignee',
      options: assignees,
      config: {
        placeholder: 'Select assignee',
        clear: true,
        textField: 'label',
      },
      // Render option with avatar (Combo supports render prop children via { option })
      children: ({ option }) => (
        <div className="wx-assignee-option">
          <div className="wx-assignee-avatar">
            {option?.avatar ? <img src={option.avatar} alt="" /> : null}
          </div>
          <div>{option?.label ?? ''}</div>
        </div>
      ),
    };

    base.splice(insertAt, 0, assigneeItem);
    return base;
  }, [assignees]);

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
                'assigneeId',
                'unscheduled',
              ];
              keep.forEach((k) => {
                if (t[k] !== undefined) clean[k] = t[k];
              });
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

        fetch('/api/gantt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave),
        }).catch(() => {});
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

    tasks.forEach((task) => {
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

  const TaskTemplate = useMemo(() => {
    return function AssigneeTaskTemplate({ data }) {
      const assignee = assigneesById.get(data?.assigneeId);
      // Milestone text is rendered outside; still show avatar if exists
      if (data?.type === 'milestone') {
        return assignee?.avatar ? (
          <div className="wx-assignee-task">
            <div className="wx-assignee-avatar">
              <img src={assignee.avatar} alt="" />
            </div>
          </div>
        ) : null;
      }

      return (
        <div className="wx-assignee-task">
          {assignee?.avatar ? (
            <div className="wx-assignee-avatar">
              <img src={assignee.avatar} alt="" />
            </div>
          ) : null}
          <div className="wx-assignee-task-text">{data?.text || ''}</div>
        </div>
      );
    };
  }, [assigneesById]);

  return (
    <div style={{ height: '100vh' }}>
      <Willow>
        <ContextMenu api={api}>
          <Gantt
            init={init}
            tasks={safeTasks}
            links={Array.isArray(links) ? links : []}
            scales={scales}
            {...(columns && { columns })}
            taskTemplate={TaskTemplate}
            end={endDate}
            highlightTime={highlightTime}
          />
        </ContextMenu>
        {api && <Editor api={api} items={editorItems} />}
      </Willow>
    </div>
  );
}

