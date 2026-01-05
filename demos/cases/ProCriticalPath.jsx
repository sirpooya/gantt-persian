import { useMemo, useState } from 'react';
import { getData } from '../data';
import { Gantt, Editor } from '../../src';
import { DatePicker, Field, Locale, RichSelect } from '@svar-ui/react-core';
import './ProCriticalPath.css';

export default function ProCriticalPath({ skinSettings }) {
  const data = useMemo(() => getData('critical'), []);

  const [api, setApi] = useState();
  const [pathMode, setPathMode] = useState('flexible');
  const [projectStart, setProjectStart] = useState(new Date(2026, 3, 2));
  const [projectEnd, setProjectEnd] = useState(new Date(2026, 3, 12));

  function init(ganttApi) {
    setApi(ganttApi);
  }

  return (
    <>
      <div className="demo wx-D71fWZ6y">
        <Locale>
          <div className="bar wx-D71fWZ6y">
            <Field label="Mode" position="left">
              <RichSelect
                options={[
                  { id: 'flexible', label: 'Flexible' },
                  { id: 'strict', label: 'Strict' },
                ]}
                value={pathMode}
                onChange={({ value }) => setPathMode(value)}
              />
            </Field>
            <Field label="Project start" position="left">
              <DatePicker
                value={projectStart}
                onChange={({ value }) => setProjectStart(value)}
              />
            </Field>
            <Field label="Project end" position="left">
              <DatePicker
                value={projectEnd}
                onChange={({ value }) => setProjectEnd(value)}
              />
            </Field>
          </div>
        </Locale>
        <Gantt
          {...skinSettings}
          init={init}
          tasks={data.tasks}
          links={data.links}
          scales={data.scales}
          criticalPath={{ type: pathMode }}
          projectStart={projectStart}
          projectEnd={projectEnd}
        />
      </div>
      {api && <Editor api={api} />}
    </>
  );
}
