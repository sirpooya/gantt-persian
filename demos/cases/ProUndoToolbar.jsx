import { useState, useMemo } from 'react';
import { getData } from '../data';
import { Gantt, Toolbar, Editor } from '../../src/';
import './ProUndoToolbar.css';

export default function ProUndoToolbar({ skinSettings }) {
  const [api, setApi] = useState();

  const data = useMemo(() => getData(), []);

  return (
    <>
      <Toolbar api={api} />
      <div className="gtcell wx-D71fWZAy">
        <Gantt
          {...skinSettings}
          init={setApi}
          tasks={data.tasks}
          links={data.links}
          scales={data.scales}
          undo
        />
        {api && <Editor api={api} />}
      </div>
    </>
  );
}
