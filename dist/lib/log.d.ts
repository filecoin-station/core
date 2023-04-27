export function formatLog(text: any, date?: Date): string;
export function parseLog(line: any): {
    date: Date;
    text: any;
};
export class SerializeStream extends Transform {
    constructor();
    _transform(obj: any, _: any, callback: any): void;
}
export class Logs {
    constructor(core: any);
    core: any;
    getLogFilePath(module: any): any;
    /**
     * @param {string=} module
     */
    get(module?: string | undefined): Promise<any>;
    follow(module: any): AsyncGenerator<any, void, unknown>;
    maybeCreateLogFile(module: any): Promise<void>;
    createWriteStream(path: any): PassThrough;
}
import { Transform } from 'node:stream';
import { PassThrough } from 'node:stream';
//# sourceMappingURL=log.d.ts.map