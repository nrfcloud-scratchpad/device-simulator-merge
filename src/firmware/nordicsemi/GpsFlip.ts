import { FirmwareError, FirmwareState, IFirmware, MessageStatus } from '../Firmware';
import { ConfigurationData } from '../../ConfigurationStorage';
import { IPairingEngine } from '../../pairing/PairingEngine';
import { IHostConnection } from '../../connection/HostConnection';
import { ShadowModel, ShadowModelDesired, ShadowModelReported } from '../../ShadowModel';
import { ISensor } from '../../sensors/Sensor';
import { DemopackMessage } from './GpsFlipModel';
import { Pairing } from '../../pairing/Pairing';

let logger = require('winston');

const GPS = 'GPS';
const GPS_SEND_INTERVAL = 10000;

export class GpsFlip implements IFirmware {
    private config: ConfigurationData;
    private pairingEngine: IPairingEngine;
    private state: FirmwareState;
    private hostConnection: IHostConnection;
    private sensors: Map<string, ISensor>;
    private applicationStarted: boolean;
    private lastGpsSend: number;


    constructor(
        config: ConfigurationData,
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
                received: 0,
            },
        };
        this.sensors = sensors;
        this.applicationStarted = false;
        this.lastGpsSend = 0;

        if (newLogger) {
            logger = newLogger;
        }
    }

    private sendGeneric(appId: string, messageType: string, timestamp: number): void {
        const timeStamp = new Date(timestamp).toISOString();
        logger.debug(`Timestamp in message #${this.state.messages.sent}, ${timeStamp} removed from message, since firmware implementation does not support it yet.`);

        const message = <DemopackMessage>{
            appId,
            messageId: this.state.messages.sent,
            messageType: messageType,
        };

        this.state.messages.sent++;

        this.hostConnection.sendMessage(JSON.stringify(message)).catch(error => {
            logger.error(`Error sending ${messageType} to nRF Cloud. Error is ${error.message}.`);
        });
    }

    private sendGpsData(timestamp: number, data: string): void {
        const timeStamp = new Date(timestamp).toISOString();
        logger.debug(`Timestamp in message #${this.state.messages.sent}, ${timeStamp} removed from message, since firmware implementation does not support it yet.`);

        const message = <DemopackMessage>{
            appId: GPS,
            messageId: this.state.messages.sent,
            messageType: 'DATA',
            data
        };

        this.state.messages.sent++;

        this.hostConnection.sendMessage(JSON.stringify(message)).catch(error => {
            logger.error(`Error sending GPS sensor data to nRF Cloud. Error is ${error.message}`);
        });
    }

    private async startApplication(pairing: Pairing): Promise<void> {
        if (pairing.state === 'paired') {
            if (pairing.topics && pairing.topics.d2c) {
                await this.hostConnection.setTopics(pairing.topics.c2d, pairing.topics.d2c);

                await this.sendGeneric(GPS, 'HELLO', Date.now());
                this.applicationStarted = true;

                logger.info(`Pairing done, application started.`);
            } else {
                logger.warn('Paired but application topics are NOT provided by nRF Cloud.');
            }
        }
    }

    async main(): Promise<number> {
        if (!this.sensors) {
            throw new FirmwareError('Sensors not provided. Required by GpsFlip.');
        }

        if (!this.sensors.get('gps')) {
            throw new FirmwareError('GPS sensor not provided. Required by GpsFlip.');
        }

        this.pairingEngine.on('pairingUpdate', (state, status) => {
            logger.debug(`gpsFlip; updating shadow -> reported.pairing: ${JSON.stringify(state)} status: ${JSON.stringify(status)}`);
            this.hostConnection.updateShadow({
                pairing: state === null ? undefined : state,
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
                logger.debug(`shadow; json data not related to pairing: ${JSON.stringify(delta)}`);
                await this.hostConnection.updateShadow(<ShadowModelReported>delta);
            }
        });

        const gps = this.sensors.get('gps');

        this.hostConnection.on('reconnect', () => {
            logger.info('Reconnecting to nRF Cloud.');
        });

        this.hostConnection.on('connect', () => {
            logger.info('Connected to nRF Cloud.');
        });

        this.hostConnection.on('disconnect', () => {
            logger.info('Disconnected from nRF Cloud.');
        });

        this.hostConnection.on('message', (message: any) => {
            const demopackMessage = <DemopackMessage>Object.assign({}, message);

            if (demopackMessage.appId === GPS && demopackMessage.messageType === 'OK' &&
                this.applicationStarted && !gps.isStarted()) {
                gps.start();
                logger.info(`Received message ${JSON.stringify(demopackMessage)}`);
            } else {
                logger.info(`Received message (ignoring it) ${JSON.stringify(demopackMessage)}`);
            }
        });

        gps.on('data', (timestamp: number, data) => {
            if (Date.now() >= this.lastGpsSend + GPS_SEND_INTERVAL) {
                this.sendGpsData(timestamp, String.fromCharCode.apply(null, data));
                this.lastGpsSend = Date.now();
            }
        });

        await this.hostConnection.connect();

        return new Promise<number>(() => {
        });
    }
}
