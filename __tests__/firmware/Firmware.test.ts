import { IHostConnection } from '../../src/connection/HostConnection';
import { FakeHostConnection } from '../../src/connection/FakeHostConnection';
import { DummyMethod } from '../../src/pairing/methods/DummyMethod';
import { PairingEngine } from '../../src/pairing/PairingEngine';
import { ISensor } from '../../src/sensors/Sensor';
import { FakeGps } from '../../src/sensors/FakeGps';
import { DummySensor } from '../../src/sensors/DummySensor';
import { FirmwareDirectory } from '../../src/firmware/FirmwareDirectory';
import { ConfigurationData, MemoryConfigurationStorage } from '../../src/ConfigurationStorage';
import { ShadowModelReported } from '../../src/ShadowModel';

let logger = require('winston');
let firmwareDirectory: FirmwareDirectory;

describe('firmware directory', () => {
    beforeEach(async () => {
        const configurationStorage = new MemoryConfigurationStorage(<ConfigurationData>{});
        const config = await configurationStorage.getConfiguration();

        const pairingMethods = [new DummyMethod([1, 2, 3, 4, 5, 6])];
        const pairingEngine = new PairingEngine(pairingMethods);

        const onUpdateShadow = async (updateShadow: ShadowModelReported) => {
            console.log('! onUpdateShadow');
            return;
        };

        const onSendMessage = async (message: any) => {
            console.log(`! onSendMessage ${JSON.stringify(message)}`);
            return;
        };

        const hostConnection: IHostConnection = new FakeHostConnection(
            onUpdateShadow,
            onSendMessage,
            logger);

        const sensors: Map<string, ISensor> = new Map<string, ISensor>();
        sensors.set('gps', new FakeGps('/tmp/output.txt', ['GPGGA']));
        sensors.set('acc', new DummySensor(new Uint8Array([1, 2, 3, 4, 5]), 1000));

        firmwareDirectory = new FirmwareDirectory(
            config,
            pairingEngine,
            hostConnection,
            sensors,
            logger
        );

        firmwareDirectory.create();
    });

    it('shall contain gps flip firmware and simulate it', async () => {
        const firmware = firmwareDirectory.getFirmware('nordicsemi-todo-todo-todo-todo-gpsflip-todo');
        await firmware.main();
    });
});
