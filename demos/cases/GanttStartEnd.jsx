import { useMemo, useState } from 'react';
import { getData } from '../data';
import { Gantt } from '../../src/';
import { DatePicker, Field, Locale, Switch } from '@svar-ui/react-core';
import './GanttStartEnd.css';

export default function GanttStartEnd({ skinSettings }) {
  const data = useMemo(() => getData(), []);
  const [start, setStart] = useState(new Date(2026, 3, 5));
  const [end, setEnd] = useState(new Date(2026, 4, 1));
  const [autoScale, setAutoScale] = useState(false);

  return (
    <div className="wx-FJQN2sNt demo">
      <Locale>
        <div className="wx-FJQN2sNt bar">
          <Field label="Start" position="left">
            <DatePicker
              value={start}
              onChange={({ value }) => setStart(value)}
            />
          </Field>
          <Field label="End" position="left">
            <DatePicker value={end} onChange={({ value }) => setEnd(value)} />
          </Field>
          <Field label="autoScale" position="left">
            <div className="wx-FJQN2sNt input">
              <Switch
                value={autoScale}
                onChange={({ value }) => setAutoScale(value)}
              />
            </div>
          </Field>
        </div>
      </Locale>

      <div className="wx-FJQN2sNt gantt">
        <Gantt
          {...skinSettings}
          tasks={data.tasks}
          links={data.links}
          scales={data.scales}
          autoScale={autoScale}
          zoom
          start={start}
          end={end}
        />
      </div>
    </div>
  );
}
