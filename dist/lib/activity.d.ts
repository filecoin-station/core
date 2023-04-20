export function createActivityStream(source: any): AddMetaStream;
export function followActivity({ signal }?: {
    signal: any;
}): AsyncGenerator<{
    timestamp: string;
    type: any;
    source: any;
    message: any;
    id: any;
}, void, unknown>;
export function getActivity(): Promise<any>;
export function maybeCreateActivityFile(): Promise<void>;
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