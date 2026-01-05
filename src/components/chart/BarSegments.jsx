import './BarSegments.css';

function BarSegments(props) {
  const { task, type } = props;

  function segmentStyle(i) {
    const s = task.segments[i];
    return {
      left: `${s.$x}px`,
      top: '0px',
      width: `${s.$w}px`,
      height: '100%',
    };
  }

  function getSegProgress(segmentIndex) {
    if (!task.progress) return 0;

    const progress = (task.duration * task.progress) / 100;
    const segments = task.segments;
    let duration = 0,
      i = 0,
      result = null;
    do {
      const s = segments[i];
      if (i === segmentIndex) {
        if (duration > progress) result = 0;
        else result = Math.min((progress - duration) / s.duration, 1) * 100;
      }
      duration += s.duration;
      i++;
    } while (result === null && i < segments.length);
    return result || 0;
  }

  return (
    <div className="wx-segments wx-GKbcLEGA">
      {task.segments.map((seg, i) => (
        <div
          key={i}
          className={`wx-segment wx-bar wx-${type} wx-GKbcLEGA`}
          data-segment={i}
          style={segmentStyle(i)}
        >
          {task.progress ? (
            <div className="wx-progress-wrapper">
              <div
                className="wx-progress-percent wx-GKbcLEGA"
                style={{ width: `${getSegProgress(i)}%` }}
              ></div>
            </div>
          ) : null}
          <div className="wx-content">{seg.text || ''}</div>
        </div>
      ))}
    </div>
  );
}

export default BarSegments;
