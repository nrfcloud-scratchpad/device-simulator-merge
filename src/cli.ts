import * as program from 'commander';
import { red } from 'colors';

import { readConfiguration } from './Configuration';
import { PairingEngine } from './pairing/PairingEngine';
import { DummyMethod } from './pairing/methods/DummyMethod';
import { ISensor } from './sensors/Sensor';
import { FakeGps } from './sensors/FakeGps';
import { AWSIoTHostConnection } from './connection/AWSIoTHostConnection';
import { SwitchesMethod } from './pairing/methods/ButtonsMethod';
import { FakeAccelerometer } from './sensors/FakeAccelerometer';
import FakeThermometer from './sensors/FakeThermometer';
import FakeDevice from './sensors/FakeDevice';
import App from './app/App';

process.on('unhandledRejection', function (reason, p) {
    console.log('Possibly Unhandled Rejection at: Promise ', p, ' reason: ', reason);
});

const pairingMethods = [
    new DummyMethod([1, 2, 3, 4, 5, 6]),
    new SwitchesMethod(4)
];

const sensors = (nmea: string, acc: string, temp: string, device: string) => {
    const sensors = new Map<string, ISensor>();

    if (nmea) { sensors.set('gps', new FakeGps(nmea, ['GPGGA'])); }
    if (acc) { sensors.set('acc', new FakeAccelerometer(acc, true, 1000)); }
    if (temp) { sensors.set('temp', new FakeThermometer(temp, true, 7000)); }
    if (device) { sensors.set('device', new FakeDevice(device, false, 1000)); }

    return sensors;
};

async function startSimulation({config, nmea, acc, temp, device}: program.Command) {
    const configuration = readConfiguration(config);

    const app = new App(
        new PairingEngine(pairingMethods),
        new AWSIoTHostConnection(configuration),
        sensors(nmea, acc, temp, device)
    );
    app.main();
}

program
    .option('-c, --config <config>', 'Configuration file containing credentials.')
    .option('-n, --nmea <nmea>', 'File containing NMEA sentences.')
    .option('-a, --acc <acc>', 'File containing accelerometer recordings.')
    .option('-t, --temp <temp>', 'File containing temperature recordings.')
    .option('-d, --device <device>', 'File containing device info (band, mode, operator, battery, sim iccid, etc.).')
    .parse(process.argv);

startSimulation(program).catch(error => {
    process.stderr.write(`${red(error)}\n`);
});
