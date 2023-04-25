export class Metrics {
    constructor({ paths, logs }: {
        paths: any;
        logs: any;
    });
    paths: any;
    logs: any;
    getMetricsFilePath(moduleName: any): any;
    /**
     * @param {string=} moduleName
     */
    getLatest(moduleName?: string | undefined): Promise<any>;
    follow({ moduleName, signal }?: {
        moduleName: any;
        signal: any;
    }): AsyncGenerator<any, void, unknown>;
    createWriteStream(moduleName: any): Promise<DeduplicateStream>;
    maybeCreateMetricsFile(moduleName: any): Promise<void>;
}
declare class DeduplicateStream extends Transform {
    constructor();
    last: any;
    _transform(obj: any, _: any, callback: any): void;
}
import { Transform } from 'node:stream';
export {};
//# sourceMappingURL=metrics.d.ts.map