import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const program = require('commander');
const {red} = require('colors');

import { FileConfigurationStorage } from './ConfigurationStorage';
import { PairingEngine } from './pairing/PairingEngine';
import { DummyMethod } from './pairing/methods/DummyMethod';
import { FirmwareDirectory } from './firmware/FirmwareDirectory';
import { ISensor } from './sensors/Sensor';
import { FakeGps } from './sensors/FakeGps';
import { DummySensor } from './sensors/DummySensor';
import { AWSIoTHostConnection } from './connection/AWSIoTHostConnection';

let winston = require('winston');
let ran = false;

function getLogger() {
    const transports = [
        new winston.transports.Console({
            name: 'console',
            level: 'debug',
            timestamp: () => new Date(),
        })
    ];

    return new winston.Logger({transports});
}

async function startSimulation(configFilename: string, firmwareNsrn: string): Promise<number> {
    const logger = getLogger();

    if (configFilename == null) {
        configFilename = path.join(os.homedir(), '.nrfcloud', 'simulator_config.json');
    }

    const exists = await new Promise<boolean>((resolve) => fs.exists(configFilename, resolve));

    if (!exists) {
        throw `Configuration file '${configFilename}' not found.`;
    }

    const configurationStorage = new FileConfigurationStorage(configFilename);
    const config = await configurationStorage.getConfiguration();

    const pairingMethods = [new DummyMethod([1, 2, 3, 4, 5, 6])];
    const pairingEngine = new PairingEngine(pairingMethods);

    const hostConnection = new AWSIoTHostConnection(config, logger);

    const sensors: Map<string, ISensor> = new Map<string, ISensor>();
    sensors.set('gps', new FakeGps('/tmp/output.txt', ['GPGGA']));
    sensors.set('acc', new DummySensor(new Uint8Array([1, 2, 3, 4, 5]), 1000));

    const firmwareDirectory = new FirmwareDirectory(
        config,
        pairingEngine,
        hostConnection,
        sensors,
        logger
    );

    firmwareDirectory.create();

    const firmware = firmwareDirectory.getFirmware(firmwareNsrn);
    return firmware.main();
}

program.command('start <firmware> [config]').action((firmware: string, config: string) => {
    ran = true;

    startSimulation(config, firmware).then(retval => {
        console.log(`Simulator stopped with return value ${retval}.`);
    }).catch(error => {
        process.stderr.write(`${red(error)}\n`);
    });
});

program.parse(process.argv);

if (!ran) {
    program.outputHelp();
    process.exit(1);
}
