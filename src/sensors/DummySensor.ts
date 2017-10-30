import { EventEmitter } from 'events';
import { ISensor } from './Sensor';

export class DummySensor extends EventEmitter implements ISensor {
    private dummyData: Uint8Array;
    private interval: number;
    private tick: NodeJS.Timer;

    constructor(dummyData: Uint8Array, interval: number) {
        super();
        this.dummyData = dummyData;
        this.interval = interval;
    }

    async start(): Promise<void> {
        this.tick = setInterval(() => {
            this.emit('data', Date.now(), this.dummyData);
        }, this.interval);
    }

    private cleanUp() {
        if (this.tick) {
            clearInterval(this.tick);
        }
    }

    async stop(): Promise<void> {
        this.cleanUp();
        return;
    }
}
