import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const program = require('commander');
const {red} = require('colors');

import { FileConfigurationStorage } from './ConfigurationStorage';
import { PairingEngine } from './pairing/PairingEngine';
import { AWSIoTHostConnection } from './connection/AWSIoTHostConnection';
import { DummyMethod } from './pairing/methods/DummyMethod';
import { DeviceSimulator } from './DeviceSimulator';

let logger = require('winston');
let ran = false;

async function startSimulator(configFilename: string): Promise<void> {
    if (configFilename == null) {
        configFilename = path.join(os.homedir(), '.nrfcloud', 'simulator_config.json');
    }

    const exists = await new Promise((resolve) => fs.exists(configFilename, resolve));

    if (!exists) {
        throw `Configuration file '${configFilename}' not found.`;
    }

    const configurationStorage = new FileConfigurationStorage(configFilename);
    const config = await configurationStorage.getConfiguration();

    const pairingMethods = [new DummyMethod([1, 2, 3, 4, 5, 6])];
    const pairingEngine = new PairingEngine(pairingMethods);

    const hostConnection = new AWSIoTHostConnection(config, logger);

    const deviceSimulator = new DeviceSimulator(
        config,
        pairingEngine,
        hostConnection,
        logger);

    await deviceSimulator.start();
}

program
    .command('start [config]')
    .action((config: string) => {
        ran = true;

        Promise.all([startSimulator(config), new Promise(() => {})]
        ).catch(error => {
            process.stderr.write(`${red(error)}\n`);
        });
    });

program.parse(process.argv);

if (!ran) {
    program.outputHelp();
    process.exit(1);
}
