import { EventEmitter } from 'events';
import { ISensor } from './Sensor';
import * as fs from 'fs';
import * as readline from 'readline';

export default class extends EventEmitter implements ISensor {
    private samples: string[] = [];
    private doRun = false;

    constructor(private sensorRecording: string, private doLoop: boolean, private sampleRate: number) {
        super();
    }

    private setupReader() {
        const input = fs.createReadStream(this.sensorRecording);
        const reader = readline.createInterface({input});

        reader.on('line', line => {
            this.samples.push(line);
        });

        reader.on('close', () => {
            if (reader) {
                reader.close();
            }

            if (input) {
                input.close();
            }

            // Start sending data
            this.emitSamples();
        });
    }

    private async emitSamples(): Promise<void> {
        do {
            for (const sample of this.samples) {
                if (!this.doRun) {
                    return;
                }

                this.emit('data', Date.now(), new Uint8Array(Buffer.from(sample)));

                await new Promise<void>(resolve => {
                    setTimeout(() => resolve(), this.sampleRate);
                });
            }
        } while (this.doRun && this.doLoop);

        this.emit('stopped');
    }

    async start(): Promise<void> {
        if (!fs.existsSync(this.sensorRecording)) {
            throw `Sensor recording with filename '${this.sensorRecording}' does not exist.`;
        }

        this.doRun = true;
        this.setupReader();
    }

    async stop(): Promise<void> {
        this.doRun = false;
    }

    isStarted(): boolean {
        return this.doRun;
    }
}