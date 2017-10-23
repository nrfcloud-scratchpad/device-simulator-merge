import { FirmwareError, IFirmware } from './Firmware';
import { GpsFlip } from './nordicsemi/GpsFlip';
import { IHostConnection } from '../connection/HostConnection';
import { IPairingEngine } from '../pairing/PairingEngine';
import { ConfigurationData } from '../ConfigurationStorage';
import { ISensor } from '../sensors/Sensor';

let logger = require('winston');

export class FirmwareDirectory {
    private firmware: Map<string, IFirmware>;
    private config: ConfigurationData;
    private pairingEngine: IPairingEngine;
    private hostConnection: IHostConnection;
    private sensors: Map<string, ISensor>;

    constructor(config: ConfigurationData,
                pairingEngine: IPairingEngine,
                hostConnection: IHostConnection,
                sensors: Map<string, ISensor>,
                newLogger?: any) {
        this.config = config;
        this.pairingEngine = pairingEngine;
        this.hostConnection = hostConnection;
        this.sensors = sensors;
        this.firmware = new Map<string, IFirmware>();

        if (newLogger) {
            logger = newLogger;
        }
    }

    create() {
        this.firmware.set('nordicsemi-todo-todo-todo-todo-gpsflip-todo',
            new GpsFlip(
                this.config,
                this.pairingEngine,
                this.hostConnection,
                this.sensors,
                logger)
        );
    }

    getFirmwareList(): Array<string> {
        if (!this.firmware) {
            throw new FirmwareError(`No firmware registered with directory.`);
        }

        const keys = this.firmware.keys();
        const retval = [];

        for (let key of keys) {
            retval.push(key);
        }

        return retval;
    }

    getFirmware(firmware: string): IFirmware {
        if (!this.firmware) {
            throw new FirmwareError(`No firmware registered with directory.`);
        }

        if (!this.firmware.get(firmware)) {
            throw new FirmwareError(`Firmware with nsrn '${firmware}' does not exist.`);
        }

        return this.firmware.get(firmware);
    }
}
