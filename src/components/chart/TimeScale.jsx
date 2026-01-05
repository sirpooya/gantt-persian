import { useContext } from 'react';
import storeContext from '../../context';
import { useStore } from '@svar-ui/lib-react';
import './TimeScale.css';

function TimeScale(props) {
  const { highlightTime } = props;

  const api = useContext(storeContext);
  const scales = useStore(api, '_scales');

  return (
    <div className="wx-ZkvhDKir wx-scale" style={{ width: scales.width }}>
      {(scales?.rows || []).map((row, rowIdx) => (
        <div
          className="wx-ZkvhDKir wx-row"
          style={{ height: `${row.height}px` }}
          key={rowIdx}
        >
          {(row.cells || []).map((cell, cellIdx) => {
            const extraClass = highlightTime
              ? highlightTime(cell.date, cell.unit)
              : '';
            const className =
              'wx-cell ' + (cell.css || '') + ' ' + (extraClass || '');
            return (
              <div
                className={'wx-ZkvhDKir ' + className}
                style={{ width: `${cell.width}px` }}
                key={cellIdx}
              >
                {cell.value}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default TimeScale;
