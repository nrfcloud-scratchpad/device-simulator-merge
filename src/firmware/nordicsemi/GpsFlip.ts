import { FirmwareError, FirmwareState, IFirmware, MessageStatus } from '../Firmware';
import { ConfigurationData } from '../../ConfigurationStorage';
import { IPairingEngine } from '../../pairing/PairingEngine';
import { IHostConnection } from '../../connection/HostConnection';
import { ShadowModel, ShadowModelDesired } from '../../ShadowModel';
import { ISensor } from '../../sensors/Sensor';
import { DemopackMessage } from './GpsFlipModel';

let logger = require('winston');

export class GpsFlip implements IFirmware {
    config: ConfigurationData;
    pairingEngine: IPairingEngine;
    state: FirmwareState;
    hostConnection: IHostConnection;
    sensors: Map<string, ISensor>;

    constructor(config: ConfigurationData,
                pairingEngine: IPairingEngine,
                hostConnection: IHostConnection,
                sensors: Map<string, ISensor>,
                newLogger?: any) {
        this.config = config;
        this.pairingEngine = pairingEngine;
        this.hostConnection = hostConnection;
        this.state = <FirmwareState>{
            connects: 0,
            connected: false,
            messages: <MessageStatus>{
                sent: 0,
                received: 0
            }
        };
        this.sensors = sensors;

        if (newLogger) {
            logger = newLogger;
        }
    }

    private sendGpsData(timestamp: number, data: string): void {
        const timeStamp = new Date(timestamp).toISOString();

        const message = <DemopackMessage>{
            appId: 'GPS',
            messageId: this.state.messages.sent,
            messageType: 'DATA',
            timeStamp,
            data
        };

        this.state.messages.sent++;

        this.hostConnection.sendMessage(JSON.stringify(message)).catch(error => {
            logger.error(`Error sending GPS sensor data to nRF Cloud. Error is ${error.message}`);
        });
    }

    async main(): Promise<number> {
        if (!this.sensors) {
            throw new FirmwareError('Sensors not provided. Required by GpsFlip.');
        }

        if (!this.sensors.get('gps')) {
            throw new FirmwareError('GPS sensor not provided. Required by GpsFlip.');
        }

        if (!this.sensors.get('acc')) {
            throw new FirmwareError('Accelerometer sensor not provided. Required by GpsFlip.');
        }

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

        this.hostConnection.on('connect', () => {
            this.sensors.get('gps').start();
            this.sensors.get('acc').start();
        });

        this.hostConnection.on('disconnect', () => {
            this.sensors.get('gps').stop();
            this.sensors.get('acc').stop();
        });

        this.hostConnection.on('message', (message: any) => {
            // TODO: parse firmware specific protocol
            logger.debug(`Received message ${message}`);
        });

        this.sensors.get('gps').on('data', (timestamp: number, data) => {
            this.sendGpsData(timestamp, String.fromCharCode.apply(null, data));
        });

        await this.hostConnection.connect();

        return 0;
    }
}
