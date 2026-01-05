import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { getData } from '../data';
import { Gantt, defaultColumns } from '../../src/';
import { Field, Switch } from '@svar-ui/react-core';
import './GanttPreventActions.css';

function GanttPreventActions({ skinSettings }) {
  const data = useMemo(() => getData(), []);

  const [add, setAdd] = useState(true); // if false - cannot add and edit task
  const [drag, setDrag] = useState(true); // if false - cannot drag tasks on scale
  const [order, setOrder] = useState(true); // if false - cannot reorder tasks in grid
  const [newLink, setNewLink] = useState(true); // if false - cannot create new links
  const [deleteLink, setDeleteLink] = useState(true); // if false - cannot delete links
  const [progress, setProgress] = useState(true); // if false - cannot edit progress in chart

  const dragRef = useRef(drag);
  const orderRef = useRef(order);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const init = useCallback((gApi) => {
    gApi.intercept('drag-task', (ev) => {
      if (typeof ev.top !== 'undefined') return orderRef.current;
      return dragRef.current; // ev.width && ev.left
    });
  }, []);

  const columns = useMemo(
    () =>
      add ? defaultColumns : defaultColumns.filter((a) => a.id != 'add-task'),
    [add],
  );

  return (
    <div className="wx-RPSbwjNq rows">
      <div className="wx-RPSbwjNq bar">
        <Field label="Adding tasks" position={'left'}>
          <Switch value={add} onChange={({ value }) => setAdd(value)} />
        </Field>
        <Field label="Creating links" position={'left'}>
          <Switch value={newLink} onChange={({ value }) => setNewLink(value)} />
        </Field>
        <Field label="Deleting links" position={'left'}>
          <Switch
            value={deleteLink}
            onChange={({ value }) => setDeleteLink(value)}
          />
        </Field>
        <Field label="Dragging tasks" position={'left'}>
          <Switch value={drag} onChange={({ value }) => setDrag(value)} />
        </Field>
        <Field label="Reordering tasks" position={'left'}>
          <Switch value={order} onChange={({ value }) => setOrder(value)} />
        </Field>
        <Field label="Editing progress" position={'left'}>
          <Switch
            value={progress}
            onChange={({ value }) => setProgress(value)}
          />
        </Field>
      </div>
      <div
        className={
          'wx-RPSbwjNq ' +
          ('gantt' +
            (!newLink ? ' hide-links' : '') +
            (!deleteLink ? ' hide-delete-links' : '') +
            (!drag ? ' hide-drag' : '') +
            (!progress ? ' hide-progress' : ''))
        }
      >
        <Gantt
          init={init}
          {...(skinSettings || {})}
          tasks={data.tasks}
          links={data.links}
          scales={data.scales}
          columns={columns}
        />
      </div>
    </div>
  );
}

export default GanttPreventActions;
