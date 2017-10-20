import { ShadowModel, ShadowModelDesired, ShadowModelReported } from '../ShadowModel';
import { EventEmitter } from 'events';

export interface IHostConnection extends EventEmitter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;

    updateShadow(reported: ShadowModelReported): Promise<void>;

    on(event: 'disconnect', handler: () => void): this;
    on(event: 'connect', handler: () => void): this;
    on(event: 'shadowGetAccepted', handler: (shadow: ShadowModel) => void): this;
    on(event: 'shadowDelta', handler: (shadow: ShadowModelDesired) => void): this;
}