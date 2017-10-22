import { FakeGps } from '../../src/sensors/FakeGps';
import { ISensor } from '../../src/sensors/Sensor';

let fakeGps: ISensor;

const nmeaRecording = '/tmp/output.txt';

let dataMock: any;
let stoppedMock: any;

describe('fake gps', () => {
    beforeEach(() => {
        fakeGps = new FakeGps(nmeaRecording, ['GPGGA', 'GPGLL']);

        dataMock = jest.fn();
        fakeGps.on('data', dataMock);

        stoppedMock = jest.fn();
        fakeGps.on('stopped', stoppedMock);
    });

    it('shall be able to receive data from recorded nmea sentences', async () => {
        await fakeGps.start();

        await new Promise<void>(resolve => setTimeout(resolve, 4000));

        expect(dataMock).toHaveBeenCalled();
        expect(stoppedMock).toHaveBeenCalledTimes(1);
    });
});
