import { FakeGps } from '../../src/sensors/FakeGps';
import { ISensor } from '../../src/sensors/Sensor';

let fakeGps: ISensor;

const nmeaRecording = '__tests__/sensors/nmea-recording.txt';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

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

    it('shall be able to receive data from recorded nmea sentences', async done => {
        await fakeGps.start();

        await new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, 5000);
        });

        expect(dataMock).toHaveBeenCalledTimes(2);
        expect(stoppedMock).toHaveBeenCalledTimes(1);
        done();
    });
});
