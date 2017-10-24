import { IPairingEngine, PairingEngine } from '../../src/pairing/PairingEngine';
import { DummyMethod } from '../../src/pairing/methods/DummyMethod';
import { Pairing, PairingStatus, PairingConfig } from '../../src/pairing/Pairing';

let pairingUpdateMock: any;
let pairingEngine: IPairingEngine;

describe('device user association', () => {
    beforeEach(() => {
        const pairingMethods = [];
        pairingMethods.push(new DummyMethod([1, 2, 3, 4, 5, 6]));

        pairingEngine = new PairingEngine(pairingMethods);

        pairingUpdateMock = jest.fn();
        pairingEngine.on('pairingUpdate', pairingUpdateMock);
    });

    it('shall support state paired', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<Pairing>{
            state: 'initiate'
        });

        // STATE: pattern_wait
        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        await pairingEngine.patternInput();

        // STATE: paired
        pairingEngine.updatePairingState(<Pairing>{
            state: 'paired'
        });

        const pairingState = await pairingEngine.pairingOutcome();
        expect(pairingState).toEqual(<Pairing>{
            state: 'paired'
        });

        expect(pairingUpdateMock.mock.calls.length).toBe(4);

        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
            state: 'initiate'
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'pattern_wait'
        });

        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // Third callback
        expect(pairingUpdateMock.mock.calls[2][0]).toBeNull();
        expect(pairingUpdateMock.mock.calls[2][1]).toEqual(<PairingStatus>{
            method: 'dummy',
            pattern: [1, 2, 3, 4, 5, 6]
        });

        // Fourth callback
        expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<Pairing>{
            state: 'paired'
        });
        expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();
    });

    it('shall support state timeout', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<Pairing>{
            state: 'initiate'
        });

        // STATE: pattern_wait
        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        // STATE: timeout
        pairingEngine.updatePairingState(<Pairing>{
            state: 'timeout'
        });

        const pairingState = await pairingEngine.pairingOutcome();
        expect(pairingState).toEqual(<Pairing>{
            state: 'timeout'
        });

        expect(pairingUpdateMock.mock.calls.length).toBe(3);

        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
            state: 'initiate'
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'pattern_wait'
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // Third callback
        expect(pairingUpdateMock.mock.calls[2][0]).toEqual(<Pairing>{
            state: 'timeout'
        });
        expect(pairingUpdateMock.mock.calls[2][1]).toBeNull();
    });

    it('shall support state pattern_mismatch', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<Pairing>{
            state: 'initiate'
        });

        // STATE: pattern_wait
        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        await pairingEngine.patternInput();

        // STATE: pattern_mismatch
        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_mismatch'
        });

        const pairingState = await
            pairingEngine.pairingOutcome();
        expect(pairingState).toEqual(<Pairing>{
            state: 'pattern_mismatch'
        });

        expect(pairingUpdateMock.mock.calls.length).toBe(4);

        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
            state: 'initiate'
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'pattern_wait'
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // Third callback
        expect(pairingUpdateMock.mock.calls[2][0]).toBeNull();
        expect(pairingUpdateMock.mock.calls[2][1]).toEqual(<PairingStatus>{
            method: 'dummy',
            pattern: [1, 2, 3, 4, 5, 6]
        });

        // Fourth callback
        expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<Pairing>{
            state: 'pattern_mismatch'
        });
        expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();
    });

    it('shall support state transition pattern_wait -> timeout -> pattern_wait -> paired', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<Pairing>{
                state: 'initiate'
        });

        // STATE: pattern_wait
        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
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

        pairingEngine.updatePairingState(<Pairing>{
            state: 'timeout'
        });

        let outcome = await pairingEngine.pairingOutcome();
        expect(outcome).toEqual(<Pairing>{
            state: 'timeout'
        });

        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
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

        pairingEngine.updatePairingState(<Pairing>{
            state: 'paired'
        });

        outcome = await pairingEngine.pairingOutcome();
        expect(outcome).toEqual(<Pairing>{
            state: 'paired'
        });

        expect(pairingUpdateMock).toHaveBeenCalledTimes(6);

        expect(patternInputMock).toHaveBeenCalledTimes(2);
        expect(patternInputMock.mock.calls[0][0]).toBe('fail');
        expect(patternInputMock.mock.calls[1][0]).toBe('ok');

        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
            state: 'initiate'
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'pattern_wait'
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // Third callback
        expect(pairingUpdateMock.mock.calls[2][0]).toEqual(<Pairing>{
            state: 'timeout'
        });
        expect(pairingUpdateMock.mock.calls[2][1]).toBeNull();

        // Fourth callback
        expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<Pairing>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'pattern_wait'
        });
        expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();

        // Fifth callback
        expect(pairingUpdateMock.mock.calls[4][0]).toEqual(<Pairing>{
            state: 'paired'
        });
        expect(pairingUpdateMock.mock.calls[4][1]).toBeNull();
    });
});
