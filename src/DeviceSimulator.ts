import { ConfigurationData, IConfigurationStorage } from './ConfigurationStorage';
import { IPairingEngine } from './pairing/PairingEngine';
import { ShadowModel, ShadowModelDesired } from './ShadowModel';
import { IHostConnection } from './HostConnection';
import { Pairing, PairingStatus } from './pairing/Pairing';

let logger = require('winston');
const awsIot = require('aws-iot-device-sdk');

export interface MessageStatus {
    received: number;
    sent: number;
}

export interface DeviceSimulatorState {
    connects: number;
    connected: boolean;
    messages: MessageStatus;
}

export interface IDeviceSimulator {
    start(): Promise<void>;
    stop(): Promise<void>;
}

export class DeviceSimulator implements IDeviceSimulator {
    config: ConfigurationData;
    pairingEngine: IPairingEngine;
    state: DeviceSimulatorState;
    hostConnection: IHostConnection;

    constructor(config: ConfigurationData,
                pairingEngine: IPairingEngine,
                newLogger?: any) {
        this.config = config;
        this.pairingEngine = pairingEngine;
        this.state = <DeviceSimulatorState>{
            connects: 0,
            connected: false,
            messages: <MessageStatus>{
                sent: 0,
                received: 0
            }
        };

        if (newLogger) {
            logger = newLogger;
        }
    }

    async start(): Promise<void> {
        this.pairingEngine.on('pairingUpdate', (state, status) => {
            this.hostConnection.publish(...);
        });

        this.hostConnection.on('shadowAccept', shadow => {
            if (shadow.desired.pairing) {
                this.pairingEngine.updatePairingState(shadow.desired.pairing);
            }
        });

        await this.hostConnection.connect();
    }

    async stop(): Promise<void> {
        await this.hostConnection.disconnect();
    }
}
