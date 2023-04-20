export namespace core {
    namespace activity {
        export { getActivity as get };
        export { followActivity as follow };
    }
    namespace logs {
        export { getLatestLogs as get };
        export { followLogs as follow };
    }
    namespace metrics {
        export { getLatestMetrics as getLatest };
        export { followMetrics as follow };
    }
}
import { getActivity } from './lib/activity.js';
import { followActivity } from './lib/activity.js';
import { getLatestLogs } from './lib/log.js';
import { followLogs } from './lib/log.js';
import { getLatestMetrics } from './lib/metrics';
import { followMetrics } from './lib/metrics';
//# sourceMappingURL=index.d.ts.map