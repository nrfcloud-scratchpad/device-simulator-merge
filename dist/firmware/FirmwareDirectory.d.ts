import { IFirmware } from './Firmware';
import { IHostConnection } from '../connection/HostConnection';
import { IPairingEngine } from '../pairing/PairingEngine';
import { ConfigurationData } from '../ConfigurationStorage';
import { ISensor } from '../sensors/Sensor';
export declare class FirmwareDirectory {
    private firmware;
    private config;
    private pairingEngine;
    private hostConnection;
    private sensors;
    constructor(config: ConfigurationData, pairingEngine: IPairingEngine, hostConnection: IHostConnection, sensors: Map<string, ISensor>, newLogger?: any);
    create(): void;
    getFirmwareList(): Array<string>;
    getFirmware(firmware: string): IFirmware;
}
