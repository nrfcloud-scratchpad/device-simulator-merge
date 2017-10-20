import { ConfigurationData } from './ConfigurationStorage';
import { ShadowModel, ShadowModelDesired } from './ShadowModel';

import { EventEmitter } from 'events';
import { DeviceSimulatorState } from './DeviceSimulator';

const awsIot = require('aws-iot-device-sdk');
let logger = require('winston');

export interface IHostConnection extends EventEmitter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;

    on(event: 'shadowGetAccepted', handler: (shadow: ShadowModel) => void): this;
    on(event: 'shadowDelta', handler: (shadow: ShadowModelDesired) => void): this;
}

export class AWSIoTHostConnection extends EventEmitter implements IHostConnection {
    private config: ConfigurationData;
    private state: DeviceSimulatorState;
    private mqtt: any;

    constructor(config: ConfigurationData, newLogger?: any) {
        super();

        this.config = config;

        if (newLogger) {
            logger = newLogger;
        }
    }

    private getShadowBaseTopic(): string {
        return `$aws/things/${this.config.clientId}/shadow`;
    }

    connect(): Promise<void> {
        logger.debug(`Connecting to nRF Cloud stage ${this.config.stage}`);

        return new Promise<void>((resolveConnect, rejectConnect) => {
            try {
                this.mqtt = awsIot.device({
                    ...this.config
                });

                this.mqtt.subscribe(`${this.getShadowBaseTopic()}/get/accepted`);
                this.mqtt.subscribe(`${this.getShadowBaseTopic()}/delta`);
            } catch (error) {
                logger.error(`Error connecting to nRF Cloud. ${error}`);
                rejectConnect(error);
            }

            this.mqtt.on('error', (error: any) => {
                logger.error(`AWS IoT error ${error.message}`);

                // Do a guess if gateway has been deleted on the backend
                if (this.mqtt
                    && error
                    && error.code === 'EPROTO'
                    && error.message.indexOf('alert certificate unknown') > -1
                    && error.message.indexOf('SSL alert number 46') > -1
                ) {
                    logger.error(`This device has its certificate revoked.`);
                }
            });

            this.mqtt.on('connect', () => {
                this.state.connected = true;
                this.state.connects += 1;
                this.mqtt.publish(`${this.getShadowBaseTopic()}/get`);

                if (resolveConnect) {
                    resolveConnect();
                }
            });

            this.mqtt.on('disconnect', () => {
                logger.info(`Disconnected from nRF Cloud.`);
                this.state.connected = false;
            });

            this.mqtt.on('reconnect', () => {
                logger.info('Reconnecting to nRF Cloud.');
            });

            this.mqtt.on('reconnect', () => {
                logger.info('Reconnecting to nRF Cloud.');
            });

            this.mqtt.on('message', (topic: string, payload: any) => {
                if (payload == null || payload === '') {
                    return;
                }

                const shadowBaseTopic = this.getShadowBaseTopic();

                this.state.messages.received++;

                switch (topic) {
                    case `${shadowBaseTopic}/get/accepted`:
                        const shadow = <ShadowModel>JSON.parse(payload);
                        this.emit('shadowGetAccepted', shadow);
                        break;
                    case `${shadowBaseTopic}/update/delta`:
                        const state = <ShadowModelDesired>JSON.parse(payload);
                        this.emit('shadowDelta', state);
                        break;
                    default:
                        logger.error(`Received message on unknown topic '${topic}', message '${JSON.parse(payload)}'`);
                        break;
                }
            });

        });
    }

    disconnect(): Promise<void> {

    }
}