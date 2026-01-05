import { useState, useMemo } from 'react';
import { getData } from '../data';
import { Gantt, Editor } from '../../src';
import { Calendar } from '@svar-ui/gantt-store';

function ProCalendar({ skinSettings }) {
  const { tasks, links, scales } = useMemo(() => getData('calendar'), []);

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

  return (
    <>
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
    </>
  );
}

export default ProCalendar;
