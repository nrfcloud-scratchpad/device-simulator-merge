import { ConfigurationData } from './ConfigurationStorage';
import { IPairingEngine } from './pairing/PairingEngine';
import { IHostConnection } from './connection/HostConnection';
import { ShadowModel, ShadowModelDesired } from './ShadowModel';

let logger = require('winston');

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
                hostConnection: IHostConnection,
                newLogger?: any) {
        this.config = config;
        this.pairingEngine = pairingEngine;
        this.hostConnection = hostConnection;
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
            this.hostConnection.updateShadow({
                pairing: state,
                pairingStatus: status
            });
        });

        this.hostConnection.on('shadowGetAccepted', (shadow: ShadowModel) => {
            if (shadow.desired.pairing) {
                this.pairingEngine.updatePairingState(shadow.desired.pairing);
            }
        });

        this.hostConnection.on('shadowDelta', (delta: ShadowModelDesired) => {
            if (delta.pairing) {
                this.pairingEngine.updatePairingState(delta.pairing);
            }
        });

        await this.hostConnection.connect();
    }

    async stop(): Promise<void> {
        await this.hostConnection.disconnect();
    }
}
