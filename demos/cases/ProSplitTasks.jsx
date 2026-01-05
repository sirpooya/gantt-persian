import { useState, useMemo } from 'react';
import { getData } from '../data';
import { Gantt, ContextMenu, Editor, Toolbar } from '../../src/';
import './ProSplitTasks.css';

export default function ProSplitTasks({ skinSettings }) {
  const [api, setApi] = useState();
  const data = useMemo(() => getData('day', { splitTasks: true }), []);

  return (
    <>
      <Toolbar api={api} />
      <div className="gtcell">
        <ContextMenu api={api}>
          <Gantt
            init={setApi}
            {...skinSettings}
            tasks={data.tasks}
            links={data.links}
            scales={data.scales}
            splitTasks={true}
          />
        </ContextMenu>
        {api && <Editor api={api} />}
      </div>
    </>
  );
}
