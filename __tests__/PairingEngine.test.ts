import { PairingEngine } from '../src/pairing/PairingEngine';
import { DummyMethod } from '../src/pairing/methods/DummyMethod';
import { PairingState, IPairingMethod, PairingStatus, PairingConfig } from '../src/pairing/Pairing';

describe('device paring', () => {
    it('shall be started if back-end requests it', async () => {
        const pairingMethods = new Array<IPairingMethod>();
        pairingMethods.push(new DummyMethod([1, 2, 3, 4, 5, 6]));

        const pairingEngine = new PairingEngine(pairingMethods);

        const pairingUpdateMock = jest.fn();
        pairingEngine.on('pairingUpdate', pairingUpdateMock);

        pairingEngine.updatePairingState(<PairingState>{
            paired: false,
            status: 'initiate'
        });

        pairingEngine.updatePairingState(<PairingState>{
            paired: false,
            status: 'initiate',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        const pairingState = await pairingEngine.awaitPairingOutcome();
        expect(pairingState).toBe(<PairingState>{
            status: 'success',
            paired: true
        });

        expect(pairingUpdateMock.mock.calls.length).toBe(2);

        expect(pairingUpdateMock.mock.calls[0][0]).toBe(<PairingState>{
            status: 'initiate',
            paired: false
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBe(<PairingStatus>{
            supports: ['dummy'],
        });

        expect(pairingUpdateMock.mock.calls[1][0]).toBe(<PairingState>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            }
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBe(<PairingStatus>{
            method: 'dummy',
            pattern: [1, 2, 3, 4, 5, 6]
        });
    });
});
