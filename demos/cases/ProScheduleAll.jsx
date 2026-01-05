import { useState, useMemo } from 'react';
import { getData } from '../data';
import { Gantt, Editor, ContextMenu } from '../../src';
import { DatePicker, Field, Checkbox } from '@svar-ui/react-core';
import { Calendar } from '@svar-ui/gantt-store';
import './ProScheduleAll.css';

function ProScheduleAll({ skinSettings }) {
  const data = useMemo(
    () =>
      getData('calendar', {
        splitTasks: true,
        unscheduledTasks: true,
      }),
    [],
  );

  const [api, setApi] = useState();
  const [tasks, setTasks] = useState(data.tasks);

  const calendar = useMemo(() => new Calendar(), []);
  const [projectStart, setProjectStart] = useState(new Date(2026, 3, 2));
  const [projectEnd, setProjectEnd] = useState(new Date(2026, 4, 20));

  const [criticalPath, setCriticalPath] = useState({ type: 'flexible' });
  const [baselines, setBaselines] = useState(true);
  const [unscheduledTasks, setUnscheduledTasks] = useState(true);
  const [splitTasks, setSplitTasks] = useState(true);

  const [cellHeight, setCellHeight] = useState(44);

  const markers = useMemo(
    () =>
      projectStart
        ? [
            {
              text: 'Start',
              start: projectStart,
            },
          ]
        : [],
    [projectStart],
  );

  function onCriticalPathChange() {
    setCriticalPath(
      criticalPath?.type === 'flexible' ? null : { type: 'flexible' },
    );
  }

  function onBaselinesChange(ev) {
    setBaselines(ev.value);
    setCellHeight(ev.value ? 44 : 38);
  }

  function onSplitChange() {
    setTasks(
      api.serialize().map((t) => {
        //recalculate duration
        if (t.segments) delete t.duration;
        return t;
      }),
    );
  }

  //calculate baselines after summary dates are set
  function init(ganttApi) {
    setApi(ganttApi);
    setTasks(
      ganttApi.serialize().map((t) => {
        return {
          ...t,
          base_start: t.start,
          base_end: t.end,
          base_duration: t.segments ? 0 : t.duration,
        };
      }),
    );
  }

  /*data.links.push({
		source: 2,
		target: 3,
		type: "e2s",
		id: 100,
	});
	data.links.push({
		source: 30,
		target: 4,
		type: "e2s",
		id: 101,
	});*/

  return (
    <div className="demo wx-D71fWZ7y">
      <div className="bar wx-D71fWZ7y">
        <Field label="Project start" position="left" width="250px">
          <DatePicker
            value={projectStart}
            onChange={({ value }) => setProjectStart(value)}
          />
        </Field>
        <Field label="Project end" position="left" width="250px">
          <DatePicker
            value={projectEnd}
            onChange={({ value }) => setProjectEnd(value)}
          />
        </Field>
        <Checkbox
          value={!!criticalPath}
          label="Critical path"
          onChange={onCriticalPathChange}
        />
        <Checkbox
          value={baselines}
          label="Baselines"
          onChange={onBaselinesChange}
        />
        <Checkbox
          value={unscheduledTasks}
          label="Unscheduled tasks"
          onChange={({ value }) => setUnscheduledTasks(value)}
        />
        <Checkbox
          value={splitTasks}
          label="Split tasks"
          onChange={(ev) => {
            setSplitTasks(ev.value);
            onSplitChange();
          }}
        />
      </div>
      <div className="gantt wx-D71fWZ7y">
        {api && <Editor api={api} />}
        <ContextMenu api={api}>
          <Gantt
            init={init}
            {...skinSettings}
            cellWidth={50}
            cellHeight={cellHeight}
            tasks={tasks}
            links={data.links}
            scales={data.scales}
            calendar={calendar}
            schedule={{ auto: true }}
            criticalPath={criticalPath}
            projectStart={projectStart}
            projectEnd={projectEnd}
            markers={markers}
            baselines={baselines}
            unscheduledTasks={unscheduledTasks}
            splitTasks={splitTasks}
          />
        </ContextMenu>
      </div>
    </div>
  );
}

export default ProScheduleAll;
