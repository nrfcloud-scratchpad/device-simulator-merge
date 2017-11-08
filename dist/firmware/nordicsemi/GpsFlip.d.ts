import { FirmwareState, IFirmware } from '../Firmware';
import { ConfigurationData } from '../../ConfigurationStorage';
import { IPairingEngine } from '../../pairing/PairingEngine';
import { IHostConnection } from '../../connection/HostConnection';
import { ISensor } from '../../sensors/Sensor';
export declare class GpsFlip implements IFirmware {
    config: ConfigurationData;
    pairingEngine: IPairingEngine;
    state: FirmwareState;
    hostConnection: IHostConnection;
    sensors: Map<string, ISensor>;
    private applicationStarted;
    constructor(config: ConfigurationData, pairingEngine: IPairingEngine, hostConnection: IHostConnection, sensors: Map<string, ISensor>, newLogger?: any);
    private sendOk(timestamp);
    private sendGpsData(timestamp, data);
    private startApplication(pairing);
    main(): Promise<number>;
}
