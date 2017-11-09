import { IFirmware } from '../Firmware';
import { ConfigurationData } from '../../ConfigurationStorage';
import { IPairingEngine } from '../../pairing/PairingEngine';
import { IHostConnection } from '../../connection/HostConnection';
import { ISensor } from '../../sensors/Sensor';
export declare class GpsFlip implements IFirmware {
    private config;
    private pairingEngine;
    private state;
    private hostConnection;
    private sensors;
    private applicationStarted;
    private lastGpsSend;
    constructor(config: ConfigurationData, pairingEngine: IPairingEngine, hostConnection: IHostConnection, sensors: Map<string, ISensor>, newLogger?: any);
    private sendGeneric(appId, messageType, timestamp);
    private sendGpsData(timestamp, data);
    private startApplication(pairing);
    main(): Promise<number>;
}
