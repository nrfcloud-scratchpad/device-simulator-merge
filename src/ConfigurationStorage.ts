import * as fs from 'fs';

export interface ConfigurationData {
    platform: string;
    version: string;
    caCert: string;
    clientCert: string;
    privateKey: string;
    clientId: string;
    deviceType: string;
    brokerHostname: string;
    region: string;
    stage: string;
}

export interface IConfigurationStorage {
    getConfiguration(): Promise<ConfigurationData>;

    setConfiguration(configuration: ConfigurationData): Promise<void>;
}

export class FileConfigurationStorage implements IConfigurationStorage {
    private configFilename: string;

    constructor(configFilename: string) {
        this.configFilename = configFilename;
    }

    async ensureConfigFileExists() {
        const exists = await new Promise((resolve) => fs.exists(this.configFilename, resolve));
        if (!exists) {
            const fd = (await new Promise((resolve) => fs.open(this.configFilename, 'w', resolve))) as number;
            await new Promise((resolve) => fs.write(fd, '{}', resolve));
            await new Promise((resolve) => fs.close(fd, resolve));
        }
    }

    async getConfiguration(): Promise<ConfigurationData> {
        await this.ensureConfigFileExists();
        const configFileContent = (await new Promise(resolve => fs.readFile(this.configFilename, resolve))) as string;
        const configFromFile = JSON.parse(configFileContent);

        return <ConfigurationData>Object.assign({}, configFromFile);
    }

    async setConfiguration(configuration: ConfigurationData): Promise<void> {
        await this.ensureConfigFileExists();
        await new Promise(resolve => fs.writeFile(this.configFilename, JSON.stringify(configuration), 'utf8', resolve));
    }
}

export class MemoryConfigurationStorage implements IConfigurationStorage {
    private configuration: ConfigurationData;

    constructor(configuration: ConfigurationData) {
        this.configuration = configuration;
    }

    async getConfiguration(): Promise<ConfigurationData> {
        return this.configuration;
    }

    async setConfiguration(configuration: ConfigurationData): Promise<void> {
        this.configuration = configuration;
    }
}
