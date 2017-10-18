import { IPairingEngine, PairingEngine } from '../src/pairing/PairingEngine';
import { DummyMethod } from '../src/pairing/methods/DummyMethod';
import { PairingState, IPairingMethod, PairingStatus, PairingConfig } from '../src/pairing/Pairing';

let pairingUpdateMock: any;
let pairingEngine: IPairingEngine;

describe('device user association', () => {
    beforeEach(() => {
        const pairingMethods = new Array<IPairingMethod>();
        pairingMethods.push(new DummyMethod([1, 2, 3, 4, 5, 6]));

        pairingEngine = new PairingEngine(pairingMethods);

        pairingUpdateMock = jest.fn();
        pairingEngine.on('pairingUpdate', pairingUpdateMock);
    });

    it('shall support state paired', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<PairingState>{
            state: 'initiate'
        });

        // STATE: waiting_for_pattern
        pairingEngine.updatePairingState(<PairingState>{
            state: 'waiting_for_pattern',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        await pairingEngine.patternInput();

        // STATE: paired
        pairingEngine.updatePairingState(<PairingState>{
            state: 'paired'
        });

        const pairingState = await pairingEngine.pairingOutcome();
        expect(pairingState).toEqual(<PairingState>{
            state: 'paired'
        });

        expect(pairingUpdateMock.mock.calls.length).toBe(4);

        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<PairingState>{
            state: 'initiate'
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<PairingState>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'waiting_for_pattern'
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // Third callback
        expect(pairingUpdateMock.mock.calls[2][0]).toBeNull();
        expect(pairingUpdateMock.mock.calls[2][1]).toEqual(<PairingStatus>{
            method: 'dummy',
            pattern: [1, 2, 3, 4, 5, 6]
        });

        // Fourth callback
        expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<PairingState>{
            state: 'paired'
        });
        expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();
    });

    it('shall support state timeout', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<PairingState>{
            state: 'initiate'
        });

        // STATE: waiting_for_pattern
        pairingEngine.updatePairingState(<PairingState>{
            state: 'waiting_for_pattern',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        // STATE: timeout
        pairingEngine.updatePairingState(<PairingState>{
            state: 'timeout'
        });

        const pairingState = await pairingEngine.pairingOutcome();
        expect(pairingState).toEqual(<PairingState>{
            state: 'timeout'
        });

        expect(pairingUpdateMock.mock.calls.length).toBe(3);

        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<PairingState>{
            state: 'initiate'
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<PairingState>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'waiting_for_pattern'
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // Third callback
        expect(pairingUpdateMock.mock.calls[2][0]).toEqual(<PairingState>{
            state: 'timeout'
        });
        expect(pairingUpdateMock.mock.calls[2][1]).toBeNull();
    });

    it('shall support state pattern_mismatch', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<PairingState>{
            state: 'initiate'
        });

        // STATE: waiting_for_pattern
        pairingEngine.updatePairingState(<PairingState>{
            state: 'waiting_for_pattern',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        await pairingEngine.patternInput();

        // STATE: pattern_mismatch
        pairingEngine.updatePairingState(<PairingState>{
            state: 'pattern_mismatch'
        });

        const pairingState = await pairingEngine.pairingOutcome();
        expect(pairingState).toEqual(<PairingState>{
            state: 'pattern_mismatch'
        });

        expect(pairingUpdateMock.mock.calls.length).toBe(4);

        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<PairingState>{
            state: 'initiate'
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<PairingState>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'waiting_for_pattern'
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // Third callback
        expect(pairingUpdateMock.mock.calls[2][0]).toBeNull();
        expect(pairingUpdateMock.mock.calls[2][1]).toEqual(<PairingStatus>{
            method: 'dummy',
            pattern: [1, 2, 3, 4, 5, 6]
        });

        // Fourth callback
        expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<PairingState>{
            state: 'pattern_mismatch'
        });
        expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();
    });

    it('shall support state transition waiting_for_pattern -> timeout -> waiting_for_pattern -> paired', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<PairingState>{
            state: 'initiate'
        });

        // STATE: waiting_for_pattern
        pairingEngine.updatePairingState(<PairingState>{
            state: 'waiting_for_pattern',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        const patternInputMock = jest.fn();

        pairingEngine.patternInput().then(() => {
            patternInputMock('ok');
        }).catch(error => {
            patternInputMock('fail', error);
        });

        pairingEngine.updatePairingState(<PairingState>{
            state: 'timeout'
        });

        let outcome = await pairingEngine.pairingOutcome();
        expect(outcome).toEqual(<PairingState>{
            state: 'timeout'
        });

        pairingEngine.updatePairingState(<PairingState>{
            state: 'waiting_for_pattern',
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            }
        });

        pairingEngine.patternInput().then(() => {
            patternInputMock('ok');
        }).catch(error => {
            patternInputMock('fail', error);
        });

        pairingEngine.updatePairingState(<PairingState>{
           state: 'paired'
        });

        outcome = await pairingEngine.pairingOutcome();
        expect(outcome).toEqual(<PairingState>{
            state: 'paired'
        });

        expect(pairingUpdateMock).toHaveBeenCalledTimes(6);

        expect(patternInputMock).toHaveBeenCalledTimes(2);
        expect(patternInputMock.mock.calls[0][0]).toBe('fail');
        expect(patternInputMock.mock.calls[1][0]).toBe('ok');

        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<PairingState>{
            state: 'initiate'
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<PairingState>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'waiting_for_pattern'
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // Third callback
        expect(pairingUpdateMock.mock.calls[2][0]).toEqual(<PairingState>{
            state: 'timeout'
        });
        expect(pairingUpdateMock.mock.calls[2][1]).toBeNull();

        // Fourth callback
        expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<PairingState>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'waiting_for_pattern'
        });
        expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();

        // Fifth callback
        expect(pairingUpdateMock.mock.calls[4][0]).toEqual(<PairingState>{
            state: 'paired'
        });
        expect(pairingUpdateMock.mock.calls[4][1]).toBeNull();

    });
});
