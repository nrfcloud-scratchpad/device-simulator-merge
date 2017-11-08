import { FakeMovementSensor } from '../../src/sensors/FakeMovementSensor';
import { ISensor } from '../../src/sensors/Sensor';

let movementSensor: ISensor;

const movementSensorRecording = '__tests__/sensors/movement-sensor-recording.txt';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

let dataMock: any;
let stoppedMock: any;

describe('fake movement sensor', () => {
    beforeEach(() => {
        movementSensor = new FakeMovementSensor(movementSensorRecording, 10);

        dataMock = jest.fn();
        movementSensor.on('data', dataMock);

        stoppedMock = jest.fn();
        movementSensor.on('stopped', stoppedMock);
    });

    it('shall be able to receive data from movement recording', async done => {
        await movementSensor.start();

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
