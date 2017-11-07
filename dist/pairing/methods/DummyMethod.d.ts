import { IPairingMethod } from '../Pairing';
export declare class DummyMethod implements IPairingMethod {
    methodName: string;
    patternLength: number;
    dummyPattern: Array<number>;
    retrievePattern(): Promise<Array<number>>;
    cancelRetrievePattern(): Promise<void>;
    constructor(dummyPattern: Array<number>);
}
