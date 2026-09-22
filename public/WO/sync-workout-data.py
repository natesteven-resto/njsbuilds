"""Update the local-file-compatible metadata script after editing workout.json."""
import json
from pathlib import Path
root = Path(__file__).resolve().parent
data = json.loads((root / 'workout.json').read_text())
(root / 'workout-data.js').write_text('window.WORKOUT = ' + json.dumps(data, indent=2) + ';\n')
