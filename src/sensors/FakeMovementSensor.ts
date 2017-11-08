import { EventEmitter } from 'events';
import { ISensor } from './Sensor';
import * as fs from 'fs';
import * as readline from 'readline';
import { OrderedMap } from 'immutable';

export class FakeMovementSensor extends EventEmitter implements ISensor {
    private movementSensorRecording: string;
    private currentTimestamp: number;  // Milliseconds elapsed since 1 January 1970 00:00:00 UTC, with leap seconds ignored.
    private defaultSampleRate: number;
    private previousTimestamp: number;

    private reader: readline.ReadLine;
    private readStream: fs.ReadStream;
    private samples: OrderedMap<number, Array<number>>;
    private doCleanup: boolean;

    constructor(flipRecording: string, defaultSampleRate: number = 100) {
        super();
        this.defaultSampleRate = defaultSampleRate;
        this.movementSensorRecording = flipRecording;
        this.samples = OrderedMap<number, Array<number>>();
        this.doCleanup = false;
    }

    private static parseSample(sample: string): Array<number> {
        const columns = sample.split(',');
        return [parseInt(columns[0]), parseInt(columns[1]), parseInt(columns[2])];
    }

    private setupReader() {
        this.readStream = fs.createReadStream(this.movementSensorRecording);
        this.reader = readline.createInterface({
            input: this.readStream
        });

        this.currentTimestamp = Date.now();

        this.reader.on('line', line => {
            const columns = line.split(',');

            if (columns.length === 3) {
                // 3-axis accelerometer data
                this.samples = this.samples.set(this.currentTimestamp, FakeMovementSensor.parseSample(line));
                this.currentTimestamp += this.defaultSampleRate;
            } else if (columns.length === 1) {
                // Wait time
                this.samples = this.samples.set(this.currentTimestamp, []);
                this.currentTimestamp += parseInt(columns[0]);
            } else {
                console.log(`Unknown sample received: '${line}'.`);
            }
        });

        this.reader.on('close', () => {
            this.cleanUp();
        });

        this.reader.on('end', () => {
            this.cleanUp();
        });

        // Start ticking
        this.nextTick();
    }

    private emitSample(timestamp: number, sample: Array<number>): void {
        if (sample && sample.length === 3) {
            this.emit('data', timestamp, new Uint8Array(Buffer.from(sample)));
        }
    }

    private nextTick() {
        // If no samples read yet, wait
        if (!this.samples || this.samples.size === 0) {
            if (this.doCleanup) {
                this.emit('stopped');
            } else {
                setTimeout(() => this.nextTick(), this.defaultSampleRate);

            }

            return;
        }

        const next = this.samples.keySeq().first();
        const currentTimestamp = next;
        const sample = this.samples.get(next);

        // If no previous timestamp, fake one that is current - defaultSampleRate
        if (!this.previousTimestamp) {
            this.previousTimestamp = currentTimestamp - this.defaultSampleRate;
        }

        if (next) {
            const nextEmit = currentTimestamp - this.previousTimestamp;

            setTimeout(() => {
                this.emitSample(currentTimestamp, sample);
                this.samples = this.samples.delete(currentTimestamp);
                this.nextTick();
            }, nextEmit);

            this.previousTimestamp = currentTimestamp;
        }
    }

    async start(): Promise<void> {
        this.doCleanup = false;
        const fileExists = await new Promise((resolve) => fs.exists(this.movementSensorRecording, resolve));

        if (!fileExists) {
            throw `Movement sensor recording with filename '${this.movementSensorRecording}' does not exist.`;
        }

        this.setupReader();
    }

    private cleanUp() {
        this.doCleanup = true;

        if (this.reader) {
            this.reader.close();
        }

        if (this.readStream) {
            this.readStream.close();
        }
    }

    stop(): Promise<void> {
        this.cleanUp();
        return;
    }
}
