import { PairingEngine } from '../src/pairing/PairingEngine';
import { DummyMethod } from '../src/pairing/methods/DummyMethod';
import { PairingState, IPairingMethod, PairingStatus } from '../src/pairing/Pairing';

describe('device shall start paring', () => {
    it('shall be started if back-end requests it', async () => {
        const pairingDesiredState = <PairingState>{
            paired: false,
            status: 'initiate'
        };

        const pairingMethods = new Array<IPairingMethod>();
        pairingMethods.push(new DummyMethod([1, 2, 3, 4, 5, 6]));

        const pairingEngine = new PairingEngine(pairingMethods);
        pairingEngine.updatePairingState(pairingDesiredState);

        pairingEngine.on('pairingUpdate', (state, status) => {
            expect(state).toBe(<PairingState>{
                paired: true,
                status: 'success'
            });

            expect(status).toBe(<PairingStatus>{
                pattern: [1, 2, 3, 4, 5, 6],
                method: 'dummy'
            });
        });

        await pairingEngine.awaitPairingOutcome();
    });
});
