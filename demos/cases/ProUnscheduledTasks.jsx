import { useState } from 'react';
import { getData } from '../data';
import { Gantt, Editor } from '../../src';

function ProUnscheduledTasks({ skinSettings }) {
  const [api, setApi] = useState(null);

  const data = getData('day', { unscheduledTasks: true });

  return (
    <>
      <Gantt
        init={setApi}
        {...skinSettings}
        tasks={data.tasks}
        links={data.links}
        scales={data.scales}
        unscheduledTasks={true}
      />
      {api && <Editor api={api} />}
    </>
  );
}

export default ProUnscheduledTasks;
