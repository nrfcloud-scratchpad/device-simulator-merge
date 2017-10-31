import { EventEmitter } from 'events';
import { IPairingMethod, Pairing, PairingStatus, Topics } from './Pairing';

export interface IPairingEngine {
    updatePairingState(state: Pairing): void;

    on(event: 'pairingUpdate', listener: (state: Pairing, status: PairingStatus) => void): this;

    on(event: 'paired', listener: (topics: Topics) => void): this;

    on(event: 'patternRetrieved', listener: (pairingStatus: PairingStatus) => void): this;
}

let logger = require('winston');

export class PairingEngine extends EventEmitter implements IPairingEngine {
    readonly pairingMethods: Array<IPairingMethod>;
    private previousState: string;

    private selectedPairingMethod: IPairingMethod;

    constructor(pairingMethods: Array<IPairingMethod>, newLogger?: any) {
        super();
        this.pairingMethods = pairingMethods;

        if (newLogger) {
            logger = newLogger;
        }
    }

    private initiatePairing(state: Pairing) {
        // Cleanup stale states by sending null back to shadow
        state.config = null;
        state.topics = null;

        this.emit('pairingUpdate', state, null);
    }

    private async cancelRetrievePattern(): Promise<void> {
        if (this.pairingMethods && this.selectedPairingMethod) {
            const foundMethod = this.pairingMethods.find(method => {
                return method.methodName === this.selectedPairingMethod.methodName;
            });

            if (!foundMethod) {
                logger.error(`Pairing method ${this.selectedPairingMethod.methodName} is not registered with the pairing engine.`);
            } else {
                await foundMethod.cancelRetrievePattern();
            }
        }
    }

    private waitingForPattern(state: Pairing) {
        if (state.config == null) {
            logger.error('attribute config does not exist.');
            return;
        }

        if (state.config.method == null) {
            logger.error('attribute config.method does not exist.');
            return;
        }

        // Report that we have received the initiate pairing method, process afterwards
        state.topics = null; // Cleanup stale states by sending null back to shadow
        this.emit('pairingUpdate', state, null);

        if (this.pairingMethods) {
            const foundMethod = this.pairingMethods.find(method => {
                return method.methodName === state.config.method;
            });

            if (!foundMethod) {
                logger.error(`Pairing method ${state.config.method} is not registered with the pairing engine.`);
            } else {
                this.selectedPairingMethod = foundMethod;

                foundMethod.retrievePattern(state.config.length).then(pattern => {
                    this.emit('pairingUpdate', null, <PairingStatus>{
                        pattern,
                        method: foundMethod.methodName
                    });
                }).catch(error => {
                    logger.error(`Error retrieving pattern ${error}.`);
                });
            }
        } else {
            throw new Error('No pairing methods registered but pairing is requested.');
        }
    }

    private unknownState(state: Pairing) {
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
                // Cleanup stale states by sending null back to shadow
                state.config = null;
                this.emit('pairingUpdate', state, null);
                this.emit('paired');
                break;
            case 'timeout':
            case 'pattern_mismatch':
                // Cleanup stale states by sending null back to shadow
                state.config = null;
                state.topics = null;

                this.emit('pairingUpdate', state, null);
                this.cancelRetrievePattern();
                break;
            default:
                this.unknownState(state);
                break;
        }
    }
}
