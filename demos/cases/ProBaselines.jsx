import { useMemo, useState } from 'react';
import { getData } from '../data';
import { Gantt, Editor, getEditorItems } from '../../src/';

function ProBaseline({ skinSettings }) {
  const data = useMemo(() => getData('day', { baselines: true }), []);

  const [api, setApi] = useState();

  const items = useMemo(
    () =>
      getEditorItems().flatMap((item) =>
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
                {
                  key: 'base_duration',
                  comp: 'counter',
                  hidden: true,
                },
              ],
              item,
            ]
          : item,
      ),
    [],
  );

  return (
    <>
      <Gantt
        ref={setApi}
        {...skinSettings}
        baselines={true}
        cellHeight={45}
        tasks={data.tasks}
        links={data.links}
      />
      {api && <Editor api={api} items={items} />}
    </>
  );
}

export default ProBaseline;
