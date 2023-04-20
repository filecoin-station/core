export function formatLog(text: any, date?: Date): string;
export function parseLog(line: any): {
    date: Date;
    text: any;
};
export function createLogStream(path: any): PassThrough;
export class SerializeStream extends Transform {
    constructor();
    _transform(obj: any, _: any, callback: any): void;
}
export function getLatestLogs(module?: string | undefined): Promise<any>;
export function followLogs(module: any): AsyncGenerator<any, void, unknown>;
export function maybeCreateLogFile(module: any): Promise<void>;
import { PassThrough } from 'node:stream';
import { Transform } from 'node:stream';
//# sourceMappingURL=log.d.ts.map