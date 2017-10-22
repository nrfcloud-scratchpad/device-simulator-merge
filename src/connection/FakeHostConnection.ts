import { IHostConnection } from './HostConnection';
import { ShadowModelReported, ShadowModelDesired } from '../ShadowModel';
import { EventEmitter } from 'events';
import { Pairing } from '../pairing/Pairing';

let logger = require('winston');

export type OnUpdateShadow = (updateShadow: ShadowModelReported) => Promise<void>;
export type OnSendMessage = (message: any) => Promise<void>;

export class FakeHostConnection extends EventEmitter implements IHostConnection {
    private reported: ShadowModelReported;
    private onUpdateShadow: OnUpdateShadow;
    private onSendMessage: OnSendMessage;

    constructor(onUpdateShadow?: OnUpdateShadow,
                onSendMessage?: OnSendMessage, newLogger?: any) {
        super();
        this.onUpdateShadow = onUpdateShadow;
        this.onSendMessage = onSendMessage;

        if (newLogger) {
            logger = newLogger;
        }
    }

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
        logger.debug(`Fake: Updating shadow.reported on host '${JSON.stringify(reported)}'`);

        if (this.onUpdateShadow) {
            await this.onUpdateShadow(reported);
        }

        this.reported = reported;
    }

    async sendMessage(message: any): Promise<void> {
        logger.debug(`Fake: Sending message to host '${JSON.stringify(message)}'`);

        if (this.onSendMessage) {
            await this.onSendMessage(message);
        }

        return;
    }
}
