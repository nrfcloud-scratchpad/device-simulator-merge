import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const program = require('commander');
const { red } = require('colors');

import { FileConfigurationStorage } from './ConfigurationStorage';
import { PairingEngine } from './pairing/PairingEngine';
import { DummyMethod } from './pairing/methods/DummyMethod';
import { FirmwareDirectory } from './firmware/FirmwareDirectory';
import { ISensor } from './sensors/Sensor';
import { FakeGps } from './sensors/FakeGps';
import { DummySensor } from './sensors/DummySensor';
import { AWSIoTHostConnection } from './connection/AWSIoTHostConnection';
import { SwitchesMethod } from './pairing/methods/ButtonsMethod';

let winston = require('winston');
let ran = false;

process.on('unhandledRejection', function (reason, p) {
    console.log('Possibly Unhandled Rejection at: Promise ', p, ' reason: ', reason);
});

function getLogger() {
    const transports = [
        new winston.transports.Console({
            name: 'console',
            level: 'debug'
        })
    ];

    return new winston.Logger({transports});
}

async function startSimulation(configFilename: string, firmwareNsrn: string, options: any): Promise<number> {
    const logger = getLogger();

    if (configFilename == null) {
        configFilename = path.join(os.homedir(), '.nrfcloud', 'simulator_config.json');
    }

    const exists = await new Promise<boolean>((resolve) => fs.exists(path.resolve(configFilename), resolve));

    if (!exists) {
        throw `Configuration file '${configFilename}' not found.`;
    }

    const configurationStorage = new FileConfigurationStorage(configFilename);
    const config = await configurationStorage.getConfiguration();

    const pairingMethods = [
        new DummyMethod([1, 2, 3, 4, 5, 6]),
        new SwitchesMethod(4)
    ];

    const pairingEngine = new PairingEngine(pairingMethods);

    const hostConnection = new AWSIoTHostConnection(config, logger);

    const sensors: Map<string, ISensor> = new Map<string, ISensor>();

    if (options && options.nmea) {
        sensors.set('gps', new FakeGps(options.nmea, ['GPGGA']));
    }

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

program
.command('start <firmware>')
.option('-c, --config [config]', 'Configuration file containing credentials.')
.option('-n, --nmea [nmea]', 'File containing NMEA sentences.')
.action((cmd: any, env: any) => {
    ran = true;

    startSimulation(env['config'], cmd, {
        nmea: env['nmea']
    }).then(retval => {
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
