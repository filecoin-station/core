export class Activity {
    constructor(core: any);
    core: any;
    get(): Promise<any>;
    follow({ signal, nLines }?: {
        signal: any;
        nLines?: number;
    }): AsyncGenerator<{
        timestamp: string;
        type: any;
        source: any;
        message: any;
        id: any;
    }, void, unknown>;
    createWriteStream(source: any): AddMetaStream;
    maybeCreateActivityFile(): Promise<void>;
}
export function formatActivityObject({ type, message, timestamp }: {
    type: any;
    message: any;
    timestamp: any;
}): string;
declare class AddMetaStream extends Transform {
    constructor({ source }: {
        source: any;
    });
    source: any;
    _transform(obj: any, _: any, callback: any): void;
}
import { Transform } from 'node:stream';
export {};
//# sourceMappingURL=activity.d.ts.map