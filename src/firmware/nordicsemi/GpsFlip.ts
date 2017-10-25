import { FirmwareError, FirmwareState, IFirmware, MessageStatus } from '../Firmware';
import { ConfigurationData } from '../../ConfigurationStorage';
import { IPairingEngine } from '../../pairing/PairingEngine';
import { IHostConnection } from '../../connection/HostConnection';
import { ShadowModel, ShadowModelDesired, ShadowModelReported } from '../../ShadowModel';
import { ISensor } from '../../sensors/Sensor';
import { DemopackMessage } from './GpsFlipModel';
import { Pairing } from '../../pairing/Pairing';

let logger = require('winston');

export class GpsFlip implements IFirmware {
    config: ConfigurationData;
    pairingEngine: IPairingEngine;
    state: FirmwareState;
    hostConnection: IHostConnection;
    sensors: Map<string, ISensor>;
    private applicationStarted: boolean;

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
        this.applicationStarted = false;

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

    private async startApplication(pairing: Pairing): Promise<void> {
        if (pairing.state === 'paired' && pairing.topics && pairing.topics.d2c) {
            await this.hostConnection.setTopics(pairing.topics.c2d, pairing.topics.d2c);
            await this.sensors.get('gps').start();
            await this.sensors.get('acc').start();
            this.applicationStarted = true;
        }
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
                pairingStatus: status,
            });
        });

        this.hostConnection.on('shadowGetAccepted', async (shadow: ShadowModel) => {
            this.pairingEngine.updatePairingState(shadow.desired.pairing);

            if (shadow.desired.pairing && shadow.desired.pairing.state === 'paired') {
                await this.startApplication(shadow.desired.pairing);
            }
        });

        this.hostConnection.on('shadowDelta', async (delta: ShadowModelDesired) => {
            if (delta.pairing) {
                this.pairingEngine.updatePairingState(delta.pairing);

                if (delta.pairing.state === 'paired') {
                    await this.startApplication(delta.pairing);
                }
            } else {
                // Some application specific state is desired, reply back as reported and process afterwards
                await this.hostConnection.updateShadow(<ShadowModelReported>delta);
            }
        });

        this.hostConnection.on('reconnect', () => {
            if (this.applicationStarted) {
                this.sensors.get('gps').start();
                this.sensors.get('acc').start();
            }
        });

        this.hostConnection.on('connect', () => {
            logger.info('on connect');
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
