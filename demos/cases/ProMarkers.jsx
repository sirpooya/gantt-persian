import { useMemo } from 'react';
import { getData } from '../data';
import { Gantt } from '../../src/';
import './ProMarkers.css';

const ProMarkers = ({ skinSettings }) => {
  const data = useMemo(() => getData(), []);

  const markers = useMemo(
    () => [
      {
        start: new Date(2026, 3, 2),
        text: 'Start Project',
      },
      {
        start: new Date(2026, 3, 8),
        text: 'Today',
        css: 'myMiddleClass',
      },
      {
        start: new Date(2026, 4, 3),
        text: 'End Project',
        css: 'myEndClass',
      },
    ],
    [],
  );

  return (
    <div className="wx-g4H1PKcW gt-cell">
      <Gantt
        {...skinSettings}
        markers={markers}
        tasks={data.tasks}
        links={data.links}
        scales={data.scales}
      />
    </div>
  );
};

export default ProMarkers;
