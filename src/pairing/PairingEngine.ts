import { EventEmitter } from 'events';
import { IPairingMethod, PairingState, PairingStatus } from './Pairing';

export interface IPairingEngine {
    updatePairingState(state: PairingState): void;
    on(event: 'pairingUpdate', listener: (state: PairingState, status: PairingStatus) => void): this;
    patternInput(): Promise<void>;
    pairingOutcome(): Promise<PairingState>;
}

export class PairingEngine extends EventEmitter implements IPairingEngine {
    readonly pairingMethods: Array<IPairingMethod>;

    private retrievePromise: Promise<PairingStatus>;
    private retrievePromiseReject: any;

    private outcomePromise: Promise<PairingState>;
    private outcomePromiseResolve: any;
    private outcomePromiseReject: any;
    private previousState: string;

    private selectedPairingMethod: IPairingMethod;

    constructor(pairingMethods: Array<IPairingMethod>) {
        super();
        this.pairingMethods = pairingMethods;
    }

    private cleanupOutcome() {
        if (this.outcomePromise) {
            this.outcomePromiseReject('State transition cancelled outcome.');
        }

        if (this.retrievePromise) {
            this.retrievePromiseReject('State transition cancelled retrieve.');
        }
    }

    private initiatePairing(state: PairingState) {
        this.cleanupOutcome();
        this.emit('pairingUpdate', state, null);
    }

    private waitingForPattern(state: PairingState) {
        this.cleanupOutcome();

        if (!state.config) {
            throw new Error('attribute config does not exist.');
        }

        if (!state.config.method) {
            throw new Error('attribute config.method does not exist.');
        }

        if (this.pairingMethods) {
            const foundMethod = this.pairingMethods.find(method => {
                return method.methodName === state.config.method;
            });

            this.emit('pairingUpdate', state, null);

            if (!foundMethod) {
                // FIXME: handle this case
            } else {
                this.selectedPairingMethod = foundMethod;
                this.retrievePromise = new Promise<PairingStatus>(async (resolve, reject) => {
                    this.retrievePromiseReject = reject;

                    const pattern = await foundMethod.retrievePattern(state.config.length);

                    resolve(<PairingStatus>{
                        pattern,
                        method: foundMethod.methodName
                    });
                });

                this.outcomePromise = new Promise<PairingState>((resolve, reject) => {
                    this.outcomePromiseResolve = resolve;
                    this.outcomePromiseReject = reject;
                });
            }
        } else {
            throw new Error('No pairing methods registered but pairing is requested.');
        }
    }

    private unknownState(state: PairingState) {
        this.cleanupOutcome();
        throw new Error(`Shadow ask to set device in unknown state '${state.state}'`);
    }

    updatePairingState(state: PairingState) {
        console.log(`STATE: ${this.previousState} -> ${state.state}`);
        this.previousState = state.state;

        switch (state.state) {
            case 'initiate':
                this.initiatePairing(state);
                break;
            case 'waiting_for_pattern':
                this.waitingForPattern(state);
                break;
            case 'paired':
                this.emit('pairingUpdate', state, null);

                if (this.outcomePromise) {
                    this.outcomePromiseResolve(state);
                }

                break;
            case 'timeout':
                this.emit('pairingUpdate', state, null);

                if (this.retrievePromise) {
                    this.retrievePromiseReject('timed out');
                }

                if (this.outcomePromise) {
                    this.outcomePromiseResolve(state);
                }

                break;
            case 'pattern_mismatch':
                this.emit('pairingUpdate', state, null);

                if (this.outcomePromise) {
                    this.outcomePromiseResolve(state);
                }

                break;
            default:
                this.unknownState(state);
                break;
        }
    }

    async patternInput(): Promise<void> {
        if (!this.retrievePromise) {
            throw new Error('No pairing method set.');
        }

        const status = await this.retrievePromise;
        this.retrievePromise = null;
        this.emit('pairingUpdate', null, status);
    }

    async pairingOutcome(): Promise<PairingState> {
        if (!this.outcomePromise) {
            throw new Error('Not possible to get outcome.');
        }

        const state = await this.outcomePromise;
        this.outcomePromise = null;
        return state;
    }
}
