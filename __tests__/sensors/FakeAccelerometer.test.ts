import { FakeAccelerometer } from '../../src/sensors/FakeAccelerometer';
import { ISensor } from '../../src/sensors/Sensor';

let accelerometer: ISensor;

const accelerometerRecording = '__tests__/sensors/accelerometer-recording.txt';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

let dataMock: any;
let stoppedMock: any;

describe('fake accelerometer', () => {
    beforeEach(() => {
        accelerometer = new FakeAccelerometer(accelerometerRecording, false, 10);

        dataMock = jest.fn();
        accelerometer.on('data', dataMock);

        stoppedMock = jest.fn();
        accelerometer.on('stopped', stoppedMock);
    });

    it('shall be able to receive data from accelerometer recording', async done => {
        await accelerometer.start();

        await new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, 9000);
        });

        expect(dataMock).toHaveBeenCalledTimes(277);
        expect(stoppedMock).toHaveBeenCalledTimes(1);

        done();
    });
});
