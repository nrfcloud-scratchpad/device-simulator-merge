import { IPairingEngine, PairingEngine } from '../../src/pairing/PairingEngine';
import { DummyMethod } from '../../src/pairing/methods/DummyMethod';
import {
  Pairing,
  PairingStatus,
  PairingConfig,
  PairingTopics,
} from '../../src/pairing/Pairing';

let pairingUpdateMock: any;
let pairedMock: any;
let pairingEngine: IPairingEngine;

async function wait(waitPeriod: number = 1): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, waitPeriod);
  });
}

describe('device user association', () => {
  beforeEach(() => {
    const pairingMethods = [];
    pairingMethods.push(new DummyMethod([1, 2, 3, 4, 5, 6]));

    pairingEngine = new PairingEngine(pairingMethods);

    pairingUpdateMock = jest.fn();
    pairingEngine.on('pairingUpdate', pairingUpdateMock);

    pairedMock = jest.fn();
    pairingEngine.on('paired', pairedMock);
  });

  it('shall support state paired', async done => {
    // STATE: initiate
    pairingEngine.updatePairingState(<Pairing>{
      state: 'initiate',
    });

    expect(pairingUpdateMock).toHaveBeenCalledWith(
      <Pairing>{
        state: 'initiate',
      },
      null,
    );

    // Engine shall report back with state above (#1)

    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        length: 6,
        method: 'dummy',
      },
    });

    expect(pairingUpdateMock).toHaveBeenCalledWith(
      <Pairing>{
        config: <PairingConfig>{
          method: 'dummy',
          length: 6,
        },
        state: 'pattern_wait',
      },
      null,
    );

    await wait();

    // Engine shall report back with state above (#2)
    // Engine shall report back with status from pairing input (#3)

    expect(pairingUpdateMock).toHaveBeenCalledWith(null, <PairingStatus>{
      method: 'dummy',
      pattern: [1, 2, 3, 4, 5, 6],
    });

    // STATE: paired

    // Since the retrieval of pattern data is async (callback #3), we have to call the remaining code in a later iteration
    pairingEngine.updatePairingState(<Pairing>{
      state: 'paired',
      topics: <PairingTopics>{
        c2d: '-aaa',
        d2c: '-bbb',
      },
    });

    expect(pairingUpdateMock).toHaveBeenCalledWith(
      <Pairing>{
        state: 'paired',
        config: null,
        topics: <PairingTopics>{
          c2d: '-aaa',
          d2c: '-bbb',
        },
      },
      null,
    );

    // Engine shall report back with state above

    // Expect pairingUpdate callbacks
    expect(pairingUpdateMock.mock.calls.length).toBe(4);

    // Expect paired callbacks
    expect(pairedMock.mock.calls.length).toBe(1);

    done();
  });

  it('shall support state timeout', () => {
    // STATE: initiate
    pairingEngine.updatePairingState(<Pairing>{
      state: 'initiate',
    });

    // Engine shall report back with state above (#1)

    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        length: 6,
        method: 'dummy',
      },
    });

    // Engine shall report back with state above (#2)

    // STATE: timeout
    pairingEngine.updatePairingState(<Pairing>{
      state: 'timeout',
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
        length: 6,
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

  it('shall support state pattern_mismatch', async done => {
    // STATE: initiate
    pairingEngine.updatePairingState(<Pairing>{
      state: 'initiate',
    });

    // Engine shall report back with state above (#1)

    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        length: 6,
        method: 'dummy',
      },
    });

    // Engine shall report back with state above (#2)
    // Engine shall report back with status from pairing input (#3)

    // Since the retrieval of pattern data is async (callback #3), we have to call the remaining code in a later iteration
    await wait();

    // STATE: pattern_mismatch
    pairingEngine.updatePairingState(<Pairing>{
      state: 'pattern_mismatch',
    });

    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        length: 6,
        method: 'dummy',
      },
    });

    await wait();

    // Engine shall report back with state above
    expect(pairingUpdateMock.mock.calls.length).toBe(
      4 /* state*/ + 2 /* status */,
    );

    // Callback #1
    expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
      state: 'initiate',
    });
    expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

    // Callback #2
    expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
      config: <PairingConfig>{
        method: 'dummy',
        length: 6,
      },
      state: 'pattern_wait',
    });
    expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

    // Callback #3
    expect(pairingUpdateMock.mock.calls[2][0]).toBeNull();
    expect(pairingUpdateMock.mock.calls[2][1]).toEqual(<PairingStatus>{
      method: 'dummy',
      pattern: [1, 2, 3, 4, 5, 6],
    });

    // Callback #4
    expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<Pairing>{
      state: 'pattern_mismatch',
      config: null,
    });
    expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();

    // Callback #5
    expect(pairingUpdateMock.mock.calls[4][0]).toEqual(<Pairing>{
      config: <PairingConfig>{
        method: 'dummy',
        length: 6,
      },
      state: 'pattern_wait',
    });
    expect(pairingUpdateMock.mock.calls[4][1]).toBeNull();

    done();
  });

  it('shall support state transition pattern_wait -> timeout -> pattern_wait -> paired', async done => {
    // STATE: initiate
    pairingEngine.updatePairingState(<Pairing>{
      state: 'initiate',
    });

    // Engine shall report back with state above (#1)

    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        length: 6,
        method: 'dummy',
        iteration: 1,
      },
    });

    await wait();

    // STATE: timeout
    pairingEngine.updatePairingState(<Pairing>{
      state: 'timeout',
    });

    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        method: 'dummy',
        length: 6,
        iteration: 1,
      },
    });

    await wait();

    // STATE: paired
    pairingEngine.updatePairingState(<Pairing>{
      state: 'paired',
      topics: <PairingTopics>{
        d2c: '--d2c',
        c2d: 'c2d--',
      },
    });

    expect(pairingUpdateMock).toHaveBeenCalledTimes(
      5 /* state */ + 2 /* status */,
    );

    // Callback #1
    expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
      state: 'initiate',
    });
    expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

    // Callback #2
    expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
      config: <PairingConfig>{
        method: 'dummy',
        length: 6,
        iteration: 1,
      },
      state: 'pattern_wait',
    });

    expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

    // Callback #3
    expect(pairingUpdateMock.mock.calls[2][0]).toBeNull();
    expect(pairingUpdateMock.mock.calls[2][1]).toEqual(<PairingStatus>{
      method: 'dummy',
      pattern: [1, 2, 3, 4, 5, 6],
    });

    // Callback #4
    expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<Pairing>{
      state: 'timeout',
      config: null, // setting to null clears this value in the shadow
    });
    expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();

    // Callback #5
    expect(pairingUpdateMock.mock.calls[4][0]).toEqual(<Pairing>{
      config: <PairingConfig>{
        method: 'dummy',
        length: 6,
        iteration: 1,
      },
      state: 'pattern_wait',
    });
    expect(pairingUpdateMock.mock.calls[4][1]).toBeNull();

    // Callback #5
    // FIXME: actually testing Callback #2
    expect(pairingUpdateMock.mock.calls[2][1]).toEqual(<PairingStatus>{
      method: 'dummy',
      pattern: [1, 2, 3, 4, 5, 6],
    });

    // Callback #6
    expect(pairingUpdateMock.mock.calls[6][0]).toMatchObject(<Pairing>{
      state: 'paired',
      topics: <PairingTopics>{
        c2d: 'c2d--',
        d2c: '--d2c',
      },
    });
    expect(pairingUpdateMock.mock.calls[6][1]).toBeNull();

    done();
  });

  it('shall support multiple pairing iterations', async done => {
    // STATE: initiate
    pairingEngine.updatePairingState(<Pairing>{
      state: 'initiate',
    });

    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        length: 6,
        iteration: 1,
        method: 'dummy',
      },
    });

    await wait();

    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      config: <PairingConfig>{
        iteration: 2,
      },
    });

    await wait();

    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      config: <PairingConfig>{
        iteration: 3,
      },
    });

    await wait();

    // STATE: paired
    pairingEngine.updatePairingState(<Pairing>{
      state: 'paired',
      topics: <PairingTopics>{
        d2c: '-aa',
        c2d: 'bb-',
      },
    });

    expect(pairingUpdateMock).toHaveBeenCalledTimes(
      5 /* state */ + 3 /* status */,
    );
    expect(pairedMock).toHaveBeenCalledTimes(1);

    // Callback #1
    expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
      state: 'initiate',
    });
    expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

    // Callback #2
    expect(pairingUpdateMock.mock.calls[1][0]).toEqual(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        method: 'dummy',
        iteration: 1,
        length: 6,
      },
    });
    expect(pairingUpdateMock.mock.calls[1][1]).toBeNull();

    // Callback #3
    // TODO:

    // Callback #4
    expect(pairingUpdateMock.mock.calls[3][0]).toEqual(<Pairing>{
      config: <PairingConfig>{
        iteration: 2,
      },
    });
    expect(pairingUpdateMock.mock.calls[3][1]).toBeNull();

    // Callback #5
    // TODO

    // Callback #6
    expect(pairingUpdateMock.mock.calls[5][0]).toEqual(<Pairing>{
      config: <PairingConfig>{
        iteration: 3,
      },
    });
    expect(pairingUpdateMock.mock.calls[5][1]).toBeNull();

    // Callback #6
    // TODO

    // Callback #7
    expect(pairingUpdateMock.mock.calls[7][0]).toEqual(<Pairing>{
      state: 'paired',
      topics: <PairingTopics>{
        d2c: '-aa',
        c2d: 'bb-',
      },
      config: null,
    });
    expect(pairingUpdateMock.mock.calls[7][1]).toBeNull();

    done();
  });

  it('shall support starting in an iteration state', async done => {
    //TODO: Implement setTimeout to capture pattern emit in the same way as previous tests
    // STATE: pattern_wait
    pairingEngine.updatePairingState(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        iteration: 2,
        length: 6,
        method: 'dummy',
      },
    });

    await wait();

    pairingEngine.updatePairingState(<Pairing>{
      config: <PairingConfig>{
        iteration: 3,
      },
    });

    await wait();

    pairingEngine.updatePairingState(<Pairing>{
      state: 'paired',
    });

    expect(pairingUpdateMock).toHaveBeenCalledTimes(
      3 /* status */ + 2 /* state */,
    );
    expect(pairedMock).toHaveBeenCalledTimes(1);

    // Callback #1
    expect(pairingUpdateMock.mock.calls[0][0]).toEqual(<Pairing>{
      state: 'pattern_wait',
      config: <PairingConfig>{
        method: 'dummy',
        length: 6,
        iteration: 2,
      },
    });
    expect(pairingUpdateMock.mock.calls[0][1]).toBeNull();

    // Callback #2
    // TODO

    // Callback #3
    expect(pairingUpdateMock.mock.calls[2][0]).toEqual(<Pairing>{
      config: <PairingConfig>{
        iteration: 3,
      },
    });
    expect(pairingUpdateMock.mock.calls[2][1]).toBeNull();

    // Callback #4
    // TODO

    // Callback #5
    expect(pairingUpdateMock.mock.calls[4][0]).toEqual(<Pairing>{
      state: 'paired',
      config: null,
    });
    expect(pairingUpdateMock.mock.calls[4][1]).toBeNull();

    done();
  });
});
