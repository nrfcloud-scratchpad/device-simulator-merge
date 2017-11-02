import { IPairingEngine, PairingEngine } from '../../src/pairing/PairingEngine';
import { DummyMethod } from '../../src/pairing/methods/DummyMethod';
import { Pairing, PairingStatus, PairingConfig, PairingTopics } from '../../src/pairing/Pairing';

let pairingUpdateMock: any;
let pairedMock: any;
let pairingEngine: IPairingEngine;

describe('device user association', () => {
    beforeEach(() => {
        const pairingMethods = [];
        pairingMethods.push(new DummyMethod([1, 2, 3, 4, 5, 6]));

        pairingEngine = new PairingEngine(pairingMethods);

        pairingUpdateMock = jest.fn();
        pairingEngine.on('pairingUpdate', pairingUpdateMock);

        pairedMock = jest.fn();
        pairingEngine.on('paired', pairingUpdateMock);
    });

    it('shall support state paired', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<Pairing>{
            state: 'initiate'
        });

        // Engine shall report back with state above (#1)

        // STATE: pattern_wait
        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        // Engine shall report back with state above (#2)
        // Engine shall report back with status from pairing input (#3)

        // STATE: paired

        // Since the retrieval of pattern data is async (callback #3), we have to call the remaining code in a later iteration
        setTimeout(done => {
            pairingEngine.updatePairingState(<Pairing>{
                state: 'paired'
            });

            // Engine shall report back with state above (#4)

            // Expect 4 pairingUpdate callbacks
            expect(pairingUpdateMock.mock.calls.length).toBe(4);

            // #1
            expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
                state: 'initiate'
            });
            expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

            // #2
            expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
                config: <PairingConfig>{
                    method: 'dummy',
                    length: 6
                },
                state: 'pattern_wait',
            });

            expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

            // #3
            expect(pairingUpdateMock.mock.calls[2][0]).toBeNull();
            expect(pairingUpdateMock.mock.calls[2][1]).toEqual(<PairingStatus>{
                method: 'dummy',
                pattern: [1, 2, 3, 4, 5, 6]
            });

            // #4
            expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<Pairing>{
                state: 'paired',
                config: null,
            });
            expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();


            expect(pairedMock.mock.calls.lengthAdjust).toBe(1);

            done();
        }, 1);
    });

    it('shall support state timeout', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<Pairing>{
            state: 'initiate'
        });

        // Engine shall report back with state above (#1)

        // STATE: pattern_wait
        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        // Engine shall report back with state above (#2)

        // STATE: timeout
        pairingEngine.updatePairingState(<Pairing>{
            state: 'timeout'
        });

        // Engine shall report back with state above (#3)

        // Expect 3 pairingUpdate callbacks
        expect(pairingUpdateMock.mock.calls.length).toBe(3);

        // #1
        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
            state: 'initiate',
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        // #2
        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'pattern_wait',
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // #3
        expect(pairingUpdateMock.mock.calls[2][0]).toEqual(<Pairing>{
            state: 'timeout',
            config: null, // setting to null clears this value in the shadow
        });
        expect(pairingUpdateMock.mock.calls[2][1]).toBeNull();
    });

    it('shall support state pattern_mismatch', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<Pairing>{
            state: 'initiate'
        });

        // Engine shall report back with state above (#1)


        // STATE: pattern_wait
        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        // Engine shall report back with state above (#2)
        // Engine shall report back with status from pairing input (#3)

        // Since the retrieval of pattern data is async (callback #3), we have to call the remaining code in a later iteration
        setTimeout(done => {
            // STATE: pattern_mismatch
            pairingEngine.updatePairingState(<Pairing>{
                state: 'pattern_mismatch'
            });

            // Engine shall report back with state above (#4)

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
                state: 'pattern_wait',
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
                state: 'pattern_mismatch',
                config: null,
            });
            expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();

            done();
        }, 0);
    });

    it('shall support state transition pattern_wait -> timeout -> pattern_wait -> paired', async () => {
        // STATE: initiate
        pairingEngine.updatePairingState(<Pairing>{
            state: 'initiate'
        });

        // Engine shall report back with state above (#1)

        // STATE: pattern_wait
        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
            config: <PairingConfig>{
                length: 6,
                method: 'dummy'
            }
        });

        // Engine shall report back with state above (#2)
        pairingEngine.updatePairingState(<Pairing>{
            state: 'timeout'
        });

        pairingEngine.updatePairingState(<Pairing>{
            state: 'pattern_wait',
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            }
        });

        pairingEngine.updatePairingState(<Pairing>{
            state: 'paired',
            topics: <PairingTopics>{
                d2c: '--d2c',
                c2d: 'c2d--'
            }
        });

        expect(pairingUpdateMock).toHaveBeenCalledTimes(6);

        expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
            state: 'initiate',
        });
        expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

        expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'pattern_wait',
        });
        expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

        // Third callback
        expect(pairingUpdateMock.mock.calls[2][0]).toEqual(<Pairing>{
            state: 'timeout',
            config: null, // setting to null clears this value in the shadow
        });
        expect(pairingUpdateMock.mock.calls[2][1]).toBeNull();

        // Fourth callback
        expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<Pairing>{
            config: <PairingConfig>{
                method: 'dummy',
                length: 6
            },
            state: 'pattern_wait',
        });
        expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();

        // Fifth callback
        expect(pairingUpdateMock.mock.calls[4][0]).toEqual(<Pairing>{
            state: 'paired',
            config: null,
            topics: <PairingTopics>{
                c2d: 'c2d--',
                d2c: '--d2c'
            }
        });
        expect(pairingUpdateMock.mock.calls[4][1]).toBeNull();
    });
});
