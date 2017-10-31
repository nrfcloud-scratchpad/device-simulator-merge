import { IPairingMethod } from '../Pairing';

export class DummyMethod implements IPairingMethod {
    methodName: string;
    patternLength: number;
    dummyPattern: Array<number>;

    async retrievePattern(): Promise<Array<number>> {
        return this.dummyPattern;
    }

    cancelRetrievePattern(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    constructor(dummyPattern: Array<number>) {
        this.patternLength = dummyPattern.length;
        this.methodName = 'dummy';
        this.dummyPattern = dummyPattern;
    }
}
