import { EventEmitter } from 'events';
import { IPairingMethod, PairingState, PairingStatus } from './Pairing';

export interface IPairingEngine {
    updatePairingState(state: PairingState): void;
    on(event: 'pairingUpdate', listener: (state: PairingState, status: PairingStatus) => void): this;
    on(event: 'pattern', listener: (inProgress: boolean, remaining: number) => void): this;
    awaitPairingOutcome(): Promise<PairingState>;
}

export class PairingEngine extends EventEmitter implements IPairingEngine {
    readonly pairingMethods: Array<IPairingMethod>;
    private pairingState: PairingState;

    constructor(pairingMethods: Array<IPairingMethod>) {
        super();
        this.pairingMethods = pairingMethods;
    }

    updatePairingState(state: PairingState): void {
        // Check if pairing state has changed and do appropriate actions
        this.emit('pairingUpdate', )
        this.pairingState = state;
    }

    awaitPairingOutcome(): Promise<PairingState> {
        return Promise.resolve(<PairingState>{
            status: 'success',
            paired: false
        });
    }
}
