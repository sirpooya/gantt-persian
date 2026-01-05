import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@svar-ui/react-core';
import { getData } from '../data';
import { Gantt, Editor, ContextMenu } from '../../src';
import './ProUndo.css';

export default function ProUndo({ skinSettings }) {
  const [api, setApi] = useState();

  const { tasks, links, scales } = useMemo(() => getData(), []);
  function init(ganttApi) {
    setApi(ganttApi);
  }

  return (
    <div className="rows wx-D71fWZ9y">
      {api && <History api={api} />}
      <div className="gtcell wx-D71fWZ9y">
        <ContextMenu api={api}>
          <Gantt
            init={init}
            {...skinSettings}
            tasks={tasks}
            links={links}
            scales={scales}
            undo
          />
        </ContextMenu>
        {api && <Editor api={api} />}
      </div>
    </div>
  );
}

function History({ api }) {

  const [history, setHistory] = useState(null);
  function handleUndo() {
    api.exec('undo');
  }

  function handleRedo() {
    api.exec('redo');
  }

 
  useEffect(() => {
    api.getReactiveState().history.subscribe((v) => (setHistory(v)));
  }, []);

  return (
    <div className="buttons wx-D71fWZ9y">
    <div className="button wx-D71fWZ9y">
      <Button
        type="primary"
        onClick={handleUndo}
        disabled={history && !history.undo}
      >
        Undo
      </Button>
      {history && history.undo > 0 && (
        <span>{history.undo}</span>
      )}
    </div>
    <div className="button wx-D71fWZ9y">
      <Button
        type="primary"
        onClick={handleRedo}
        disabled={history && !history.redo}
      >
        Redo
      </Button>
      {history && history.redo > 0 && (
        <span>{history.redo}</span>
      )}
    </div>
  </div>
);
}