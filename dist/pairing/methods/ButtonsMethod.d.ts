/// <reference types="node" />
import { IPairingMethod } from '../Pairing';
export declare class SwitchesMethod implements IPairingMethod {
    methodName: string;
    patternLength: number;
    numberOfButtons: number;
    pattern: Buffer;
    idx: number;
    rejectRetrievePattern: any;
    addKeypress(key: string): void;
    retrievePattern(patternLength: number): Promise<Array<number>>;
    cancelRetrievePattern(): Promise<void>;
    constructor(numberOfButtons: number);
}
