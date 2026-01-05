import { useState, useMemo, useCallback } from 'react';
import { getData } from '../data';
import { Gantt, Editor } from '../../src';
import { Calendar } from '@svar-ui/gantt-store';
import { Button } from '@svar-ui/react-core';
import './ProCalendarChanges.css';

function ProCalendarChanges({ skinSettings }) {
  const initialData = useMemo(() => getData('calendar'), []);
  const [tasks, setTasks] = useState(initialData.tasks);
  const { links, scales } = initialData;

  const calendar = useMemo(
    () =>
      new Calendar({
        weekHours: {
          monday: 8,
          tuesday: 8,
          wednesday: 8,
          thursday: 8,
          friday: 8,
          saturday: 0,
          sunday: 0,
        },
      }),
    [],
  );

  const [api, setApi] = useState();

  const addNewRule = useCallback(() => {
    calendar.addRule((date) => {
      const weekday = date.getDay();
      if (weekday === 3) return 0;
    });

    setTasks(
      api.serialize().map((task) => {
        if (!calendar.isWorkingDay(task.start)) {
          task.start = calendar.getNextWorkingDay(task.start);
        }
        return task;
      }),
    );
  }, [api, calendar]);

  return (
    <div className="wx-FkPcChng rows">
      <div className="wx-FkPcChng bar">
        <span> Rule: every Wednesday is off</span>
        <Button type="primary" onClick={addNewRule}>
          Add rule
        </Button>
      </div>

      <div className="wx-FkPcChng gtcell">
        <Gantt
          {...skinSettings}
          init={setApi}
          calendar={calendar}
          tasks={tasks}
          links={links}
          scales={scales}
          cellWidth={60}
        />
        {api && <Editor api={api} />}
      </div>
    </div>
  );
}

export default ProCalendarChanges;
