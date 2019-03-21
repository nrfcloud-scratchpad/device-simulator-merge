## Device Simulator [![npm version](https://img.shields.io/npm/v/@nrfcloud/device-simulator.svg)](https://www.npmjs.com/package/@nrfcloud/device-simulator)

[![Build Status](https://codebuild.us-east-1.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiaUdxVzMyUXFBdE9RWEdUaUk0cW5SSTA0QzFZbEFBblpscVp5d2w1Sjd0T0p1L1BaWUN4OEo1Z2F0c2JOOThvMDB0ZWdpdkE5ejBPRDB1cXFVYUpMR3lJPSIsIml2UGFyYW1ldGVyU3BlYyI6Ik9xNFJJbzBGZzVwRGZNSjciLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=saga)](https://console.aws.amazon.com/codesuite/codebuild/projects/device-simulator/history?region=us-east-1)  
[![Greenkeeper badge](https://badges.greenkeeper.io/nRFCloud/device-simulator.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Command line utility for simulating a device connecting to and pairing with [nRFcloud.com](https://nRFCloud.com).


## CLI Usage

### Installation
    
    mkdir simulator
    cd simulator
    npm init -y
    npm i --save @nrfcloud/device simulator

### Usage

    npx @nrfcloud/device-simulator \
      -c <configuration file from nrfcloud-cli> \
      -n <file with GPS NMEA sentences> \
      -a <file with accelerometer recording> \
      -t <file with thermometer recording>
    
Example:

    npx @nrfcloud/device-simulator \
      -c my-device.json \
      -n /tmp/nmea-recording.txt \
      -a __tests__/sensors/accelerometer-recording.txt \
      -t __tests__/sensors/thermometer-recording.txt
    
## Sensor Data

### NMEA sentences

A GPS recording of NMEA sentences can be found [here](https://drive.google.com/uc?export=download&id=0BxDUQnmvFeMNOXM1ZmFFNHZZU2s).
         
If you have curl installed:
    
    curl -L -o /tmp/nmea-recording.txt "https://drive.google.com/uc?export=download&id=0BxDUQnmvFeMNOXM1ZmFFNHZZU2s"

If you want to make your own GPS data, head over to https://nmeagen.org. The "Multi-point line" seems to work best. Lay some points and then click the "Generate NMEA file" button.    

### Accelerometer samples

An accelerometer recording can be found [here](./__tests__/sensors/accelerometer-recording.txt).

### Thermometer samples

A thermometer recording can be found here [here](./__tests__/sensors/thermometer-recording.txt).

## Creating Devices and Certs

Clone this repo and install the dependencies:

    npm ci

Use `STAGE=dev STACK=dev node scripts/register-simulator.js` to create a new certificate.

For more info see https://projecttools.nordicsemi.no/confluence/display/IRIS/nRF91+Simulator

## Device configuration

To create a device configuration use [nrfcloud-cli](https://github.com/NordicPlayground/nrfcloud-cli).
 
Example usage for adding a device to nRF Cloud (this is not associating a device with a tenant):
    
    npx dist/cli.js device-register -t nsrn:devices:types/device/nordicsemi/nRF91/PCA10074/gpsFlipDemo/0 <your device id>
