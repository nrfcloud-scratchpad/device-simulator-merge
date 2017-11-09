/// <reference types="node" />
import { EventEmitter } from 'events';
import { ISensor } from './Sensor';
export declare class FakeGps extends EventEmitter implements ISensor {
    private nmeaRecording;
    private nmeaSeconds;
    private currentNmeaSecond;
    private sentenceFilter;
    private reader;
    private readStream;
    private nmeaTick;
    private started;
    constructor(nmeaRecording: string, sentenceFilter: Array<string>);
    private setupNmeaReader();
    private nextNmeaTick();
    start(): Promise<void>;
    private cleanUp();
    stop(): Promise<void>;
    isStarted(): boolean;
}
