import { EventEmitter } from 'events';
import { IPairingMethod, Pairing, PairingStatus, Topics } from './Pairing';

export interface IPairingEngine {
    updatePairingState(state: Pairing): void;
    on(event: 'pairingUpdate', listener: (state: Pairing, status: PairingStatus) => void): this;
    on(event: 'paired', listener: (topics: Topics) => void): this;
    patternInput(): Promise<void>;
    pairingOutcome(): Promise<Pairing>;
}

let logger = require('winston');

export class PairingEngine extends EventEmitter implements IPairingEngine {
    readonly pairingMethods: Array<IPairingMethod>;

    private patternPromise: Promise<PairingStatus>;
    private patternPromiseReject: any;

    private outcomePromise: Promise<Pairing>;
    private outcomePromiseResolve: any;
    private outcomePromiseReject: any;
    private previousState: string;

    private selectedPairingMethod: IPairingMethod;

    constructor(pairingMethods: Array<IPairingMethod>, newLogger?: any) {
        super();
        this.pairingMethods = pairingMethods;

        if (newLogger) {
            logger = newLogger;
        }
    }

    private cleanupOutcome() {
        if (this.outcomePromise) {
            this.outcomePromiseReject('State transition cancelled outcome.');
        }

        if (this.patternPromise) {
            this.patternPromiseReject('State transition cancelled pattern.');
        }
    }

    private initiatePairing(state: Pairing) {
        this.cleanupOutcome();
        this.emit('pairingUpdate', state, null);
    }

    private waitingForPattern(state: Pairing) {
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

                this.patternPromise = new Promise<PairingStatus>((resolve, reject) => {
                    this.patternPromiseReject = reject;

                    foundMethod.retrievePattern(state.config.length).then(pattern => {
                        resolve(<PairingStatus>{
                            pattern,
                            method: foundMethod.methodName
                        });
                    }).catch(error => reject(error));
                });

                this.outcomePromise = new Promise<Pairing>((resolve, reject) => {
                    this.outcomePromiseResolve = resolve;
                    this.outcomePromiseReject = reject;
                });
            }
        } else {
            throw new Error('No pairing methods registered but pairing is requested.');
        }
    }

    private unknownState(state: Pairing) {
        this.cleanupOutcome();
        throw new Error(`Shadow ask to set device in unknown state '${state.state}'`);
    }

    updatePairingState(state: Pairing) {
        logger.debug(`STATE: ${this.previousState} -> ${state.state}`);

        this.previousState = state.state;

        switch (state.state) {
            case 'initiate':
                this.initiatePairing(state);
                break;
            case 'pattern_wait':
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

                if (this.patternPromise) {
                    this.patternPromiseReject('timed out');
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
        if (!this.patternPromise) {
            throw new Error('No pairing method set.');
        }

        const status = await this.patternPromise;
        this.patternPromise = null;
        this.emit('pairingUpdate', null, status);
    }

    async pairingOutcome(): Promise<Pairing> {
        if (!this.outcomePromise) {
            throw new Error('Not possible to get outcome.');
        }

        const state = await this.outcomePromise;
        this.outcomePromise = null;
        return state;
    }
}
