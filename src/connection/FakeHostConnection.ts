import { IHostConnection } from './HostConnection';
import { ShadowModelReported, ShadowModelDesired } from '../ShadowModel';
import { EventEmitter } from 'events';
import { Pairing } from '../pairing/Pairing';

export class FakeHostConnection extends EventEmitter implements IHostConnection {
    private reported: ShadowModelReported;

    connect(): Promise<void> {
        this.emit('connect');

        this.emit('shadowDelta', <ShadowModelDesired>{
            pairing: <Pairing>{
                state: 'initiate'
            }
        });

        return;
    }

    disconnect(): Promise<void> {
        this.emit('disconnect');
        return;
    }

    async updateShadow(reported: ShadowModelReported): Promise<void> {
        this.reported = reported;
    }

    getUpdatedShadow() {
        return this.reported;
    }
}