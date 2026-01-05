import { useMemo, useState } from 'react';
import { Gantt, Editor, defaultEditorItems, defaultColumns } from '../../src';
import { format } from 'date-fns';
import { getBaselinesData } from '../data';

function ProUnscheduledTasksAndBaselines({ skinSettings }) {
  const [api, setApi] = useState(null);

  const data = useMemo(() => {
    const rawData = getBaselinesData();
    const cloned = { ...rawData };

    cloned.tasks = cloned.tasks.map((task) => {
      if (task.id === 10 || task.id === 12) {
        task = { ...task, unscheduled: true };
      }

      if (task.id === 10) {
        task = {
          ...task,
          start: new Date(2024, 3, 5),
          end: new Date(2024, 3, 7),
        };
      }
      if (task.id === 11) {
        task = {
          ...task,
          start: new Date(2024, 3, 2),
          end: new Date(2024, 3, 5),
        };
      }
      return task;
    });

    return cloned;
  }, []);

  const items = useMemo(() => {
    return defaultEditorItems.flatMap((item) =>
      item.key === 'links'
        ? [
            ...[
              {
                key: 'base_start',
                comp: 'date',
                label: 'Baseline start',
              },
              {
                key: 'base_end',
                comp: 'date',
                label: 'Baseline end',
              },
            ],
            item,
          ]
        : item,
    );
  }, []);

  const columns = useMemo(() => {
    return defaultColumns.map((col) => {
      if (col.id == 'start')
        col.template = (value, row) =>
          row.unscheduled ? '-' : format(value, 'dd-MM-yyyy');
      if (col.id == 'duration')
        col.template = (value, row) => (row.unscheduled ? '-' : value);
      return col;
    });
  }, []);

  return (
    <>
      <Gantt
        init={setApi}
        {...skinSettings}
        columns={columns}
        tasks={data.tasks}
        links={data.links}
        scales={data.scales}
        unscheduledTasks={true}
        baselines={true}
        cellHeight={45}
      />
      {api && <Editor api={api} items={items} />}
    </>
  );
}

export default ProUnscheduledTasksAndBaselines;
