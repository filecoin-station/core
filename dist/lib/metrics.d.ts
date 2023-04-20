export function createMetricsStream(moduleName: any): Promise<DeduplicateStream>;
export function maybeCreateMetricsFile(moduleName: any): Promise<void>;
export function getLatestMetrics(moduleName: any): Promise<any>;
export function followMetrics({ moduleName, signal }?: {
    moduleName: any;
    signal: any;
}): AsyncGenerator<any, void, unknown>;
declare class DeduplicateStream extends Transform {
    constructor();
    last: any;
    _transform(obj: any, _: any, callback: any): void;
}
import { Transform } from 'node:stream';
export {};
//# sourceMappingURL=metrics.d.ts.map