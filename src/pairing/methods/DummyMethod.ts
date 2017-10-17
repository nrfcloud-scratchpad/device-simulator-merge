import { IPairingMethod } from '../Pairing';

export class DummyMethod implements IPairingMethod {
    methodName: string;
    dataLength: number;
    dummyPattern: Array<number>;

    async retrievePairingData(): Promise<Array<number>> {
        return this.dummyPattern;
    }

    constructor(dummyPattern: Array<number>) {
        this.dataLength = dummyPattern.length;
        this.methodName = 'dummy';
        this.dummyPattern = dummyPattern;
    }
}