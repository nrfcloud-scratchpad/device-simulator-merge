import { IHostConnection } from '../../src/connection/HostConnection';
import { FakeHostConnection } from '../../src/connection/FakeHostConnection';

let hostConnection: IHostConnection;

let shadowGetAcceptedMock: any;
let shadowDeltaMock: any;
let disconnectMock: any;
let connectMock: any;

describe('device', () => {
    beforeEach(() => {
        hostConnection = new FakeHostConnection();

        shadowGetAcceptedMock = jest.fn();
        hostConnection.on('shadowGetAccepted', shadowGetAcceptedMock);

        shadowDeltaMock = jest.fn();
        hostConnection.on('shadowDelta', shadowDeltaMock);

        connectMock = jest.fn();
        hostConnection.on('connect', connectMock);

        disconnectMock = jest.fn();
        hostConnection.on('disconnect', disconnectMock);
    });

    it('shall be able to connect and disconnect', async () => {
        await hostConnection.connect();
        await hostConnection.disconnect();

        expect(connectMock).toHaveBeenCalledTimes(1);
        expect(disconnectMock).toHaveBeenCalledTimes(1);
    });
});
