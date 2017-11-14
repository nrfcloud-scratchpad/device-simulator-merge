import { FirmwareError, FirmwareState, IFirmware, MessageStatus } from '../Firmware';
import { ConfigurationData } from '../../ConfigurationStorage';
import { IPairingEngine } from '../../pairing/PairingEngine';
import { IHostConnection } from '../../connection/HostConnection';
import { ShadowModel, ShadowModelDesired, ShadowModelReported } from '../../ShadowModel';
import { ISensor } from '../../sensors/Sensor';
import { DemopackMessage } from './GpsFlipModel';
import { Pairing } from '../../pairing/Pairing';
import { Sample } from '../../sensors/FakeAccelerometer';

//
// Simulate behaviour of Alta device:
//   https://projecttools.nordicsemi.no/jira/browse/IS-1130
//

let logger = require('winston');

const GPS = 'GPS';
const GPS_SEND_INTERVAL = 10000;

const FLIP = 'FLIP';

enum Orientation {
    NORMAL,
    UPSIDE_DOWN,
    ON_SIDE
}

class Gps {
    lastGpsSend: number;

    constructor() {
        this.lastGpsSend = 0;
    }
}

const FLIP_RING_BUFFER_SIZE = 30;
const FLIP_UPSIDE_DOWN_TRIGGER_DURATION = 5000; // Should be 5 seconds
const FLIP_NORMAL_POSITION_DURATION = 5000; // Should be 5 seconds

class Flip {
    private currentOrientation: Orientation;
    private lastOrientationChange: number;
    private accRingBuffer: Array<number[]>;
    private accRingBufferPos: number;

    constructor() {
        this.currentOrientation = Orientation.NORMAL;
        this.lastOrientationChange = 0;
        this.accRingBuffer = new Array<number[]>();
        this.accRingBufferPos = 0;
    }

    update(timestamp: number, sample: Sample) {
        this.updateOrientation(timestamp, sample);
        this.updateRingBuffer(sample);
    }

    private updateRingBuffer(sample: Sample) {
        if (this.accRingBuffer.length >= FLIP_RING_BUFFER_SIZE) {
            this.accRingBuffer.shift();
        }

        this.accRingBuffer.push(sample.toArray());
    }

    private updateOrientation(timestamp: number, sample: Sample) {
        const previousOrientation = this.currentOrientation;

        switch (this.currentOrientation) {
            case Orientation.NORMAL:
                if (sample.Z < -40) {
                    this.currentOrientation = Orientation.UPSIDE_DOWN;
                }
                else if (sample.Z < 40) {
                    this.currentOrientation = Orientation.ON_SIDE;
                }
                break;
            case Orientation.ON_SIDE:
                if (sample.Z < -50) {
                    this.currentOrientation = Orientation.UPSIDE_DOWN;
                } else if (sample.Z > 50) {
                    this.currentOrientation = Orientation.NORMAL;
                }
                break;
            case Orientation.UPSIDE_DOWN:
                if (sample.Z > 40) {
                    this.currentOrientation = Orientation.NORMAL;
                }
                else if (sample.Z > -50) {
                    this.currentOrientation = Orientation.ON_SIDE;
                }
                break;
            default:
                break;
        }

        if (previousOrientation !== this.currentOrientation) {
            this.lastOrientationChange = timestamp;
        }

        logger.debug(`orientation: ${previousOrientation} -> ${this.currentOrientation} @${new Date(this.lastOrientationChange).toISOString()}: ${JSON.stringify(sample)}`);
    }

    isFlipped(timestamp: number): boolean {
        return ((timestamp - this.lastOrientationChange) >= FLIP_UPSIDE_DOWN_TRIGGER_DURATION &&
            this.currentOrientation === Orientation.UPSIDE_DOWN);
    }

    isInNormalPosition(timestamp: number): boolean {
        return ((timestamp - this.lastOrientationChange) >= FLIP_NORMAL_POSITION_DURATION &&
            this.currentOrientation === Orientation.NORMAL);
    }

    copyRingBuffer(): Array<number[]> {
        const dst = new Array<number[]>();

        this.accRingBuffer.forEach(element => {
            dst.push(element);
        });

        return dst;
    }
}

export class GpsFlip implements IFirmware {
    private config: ConfigurationData;
    private pairingEngine: IPairingEngine;
    private state: FirmwareState;
    private hostConnection: IHostConnection;
    private sensors: Map<string, ISensor>;
    private applicationStarted: boolean;
    private gps: Gps;
    private flip: Flip;
    private flipSent: boolean;

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
            logger.error(`Error sending GPS sensor data to nRF Cloud. Error is ${error.message}.`);
        });
    }

    private sendFlipData(timestamp: number, data: any): void {
        const timeStamp = new Date(timestamp).toISOString();
        logger.debug(`Timestamp in message #${this.state.messages.sent}, ${timeStamp} removed from message, since firmware implementation does not support it yet.`);

        const message = <DemopackMessage>{
            appId: FLIP,
            messageId: this.state.messages.sent,
            messageType: 'OK',
            data
        };

        this.state.messages.sent++;

        this.hostConnection.sendMessage(JSON.stringify(message)).catch(error => {
            logger.error(`Error sending FLIP data to nRF Cloud. Error is ${error.message}.`);
        });
    }

    private async startApplication(pairing: Pairing): Promise<void> {
        if (pairing.state === 'paired') {
            if (pairing.topics && pairing.topics.d2c) {
                await this.hostConnection.setTopics(pairing.topics.c2d, pairing.topics.d2c);

                if (this.gps) {
                    await this.sendGeneric(GPS, 'HELLO', Date.now());
                }

                if (this.flip) {
                    await this.sendGeneric(FLIP, 'HELLO', Date.now());
                }

                this.applicationStarted = true;
                logger.info(`Pairing done, application started.`);
            } else {
                logger.warn('Paired but application topics are NOT provided by nRF Cloud.');
            }
        }
    }

    private setupPairing() {
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
    }

    private static convertToInt8(data: Uint8Array): Int8Array {
        const dest = new Int8Array(data.length);

        data.forEach((value, idx) => {
            dest[idx] = value << 24 >> 24;
        });

        return dest;
    }

    async main(): Promise<number> {
        if (!this.sensors) {
            throw new FirmwareError('Sensors not provided. Required by GpsFlip.');
        }

        this.setupPairing();

        this.hostConnection.on('reconnect', () => {
            logger.info('Reconnecting to nRF Cloud.');
        });

        this.hostConnection.on('connect', () => {
            logger.info('Connected to nRF Cloud.');
        });

        this.hostConnection.on('disconnect', () => {
            logger.info('Disconnected from nRF Cloud.');
        });

        const gps = this.sensors.get('gps');

        if (gps) {
            this.gps = new Gps();
        }

        const acc = this.sensors.get('acc');

        if (acc) {
            this.flip = new Flip();
            this.flipSent = false;
        }

        this.hostConnection.on('message', (message: any) => {
            const demopackMessage = <DemopackMessage>Object.assign({}, message);

            if (gps != null && demopackMessage.appId === GPS && demopackMessage.messageType === 'OK' &&
                this.applicationStarted === true && !gps.isStarted()) {
                gps.start();
                logger.info(`Received GPS message ${JSON.stringify(demopackMessage)}`);
            } else if (acc != null && demopackMessage.appId === FLIP && demopackMessage.messageType === 'OK' &&
                this.applicationStarted === true && !acc.isStarted()) {
                acc.start();
                logger.info(`Received FLIP message ${JSON.stringify(demopackMessage)}`);
            } else {
                logger.info(`Received message (ignoring it) ${JSON.stringify(demopackMessage)}, applicationStarted: ${this.applicationStarted}`);
            }
        });

        if (gps) {
            gps.on('data', (timestamp: number, data) => {
                if (Date.now() >= this.gps.lastGpsSend + GPS_SEND_INTERVAL) {
                    this.sendGpsData(timestamp, String.fromCharCode.apply(null, data));
                    this.gps.lastGpsSend = Date.now();
                }
            });
        }

        if (acc) {
            acc.on('data', (timestamp: number, data) => {
                const sample = Sample.fromArray(GpsFlip.convertToInt8(data));
                this.flip.update(timestamp, sample);
                if (this.flip.isFlipped(timestamp) && !this.flipSent) {
                    this.flipSent = true;
                    this.sendFlipData(timestamp, this.flip.copyRingBuffer());
                } else if (this.flip.isInNormalPosition(timestamp) && this.flipSent) {
                    this.flipSent = false;
                }
            });
        }

        await this.hostConnection.connect();

        return new Promise<number>(() => {
        });
    }
}
