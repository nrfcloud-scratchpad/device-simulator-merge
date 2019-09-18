import * as program from 'commander';
import { cyan, green, red, yellow, magenta } from 'colors';
import * as dotenv from 'dotenv';
import { connect } from './connection';
import * as path from 'path';
import { dfu } from './dfu';

dotenv.config();

const main = async ({
  certsResponse,
  id,
  certificate,
  key,
  endpoint,
  appFwVersion,
}: program.Command) => {
  if (certsResponse) {
    const config = JSON.parse(certsResponse);
    key = Buffer.from(config.privateKey, 'utf-8');
    certificate = Buffer.from(config.certificate, 'utf-8');
  } else {
    key = path.resolve(key);
    certificate = path.resolve(certificate);
  }
  const topics = {
    jobs: {
      notifyNext: `$aws/things/${id}/jobs/notify-next`,
      update: (jobId: string) => `$aws/things/${id}/jobs/${jobId}/update`,
      updateAccepted: (jobId: string) =>
        `$aws/things/${id}/jobs/${jobId}/update/accepted`,
    },
    shadow: {
      update: `$aws/things/${id}/shadow/update`,
    },
  };

  console.log({
    id,
    key,
    certificate,
    endpoint,
    region: endpoint.split('.')[2],
    topics,
    appFwVersion: parseInt(appFwVersion, 10),
  });

  console.log(cyan(`connecting to ${yellow(endpoint)}...`));

  const connection = connect({
    id,
    certificate,
    key,
    endpoint,
  });

  connection.on('error', (error: any) => {
    console.error(`AWS IoT error ${error.message}`);
  });

  connection.on('connect', async () => {
    console.log(green('connected'));
    const f = dfu(id, connection);
    await f.run({
      appFwVersion,
    });
  });

  connection.on('close', () => {
    console.error('disconnect');
  });

  connection.on('reconnect', () => {
    console.log(magenta('reconnect'));
  });
};

program
  .option(
    '-cr, --certs-response <certsResponse>',
    'JSON returned by call to the Device API endpoint: POST /devices/{deviceid}/certificates',
    process.env.CERTS_RESPONSE,
  )
  .option('-d, --id <id>', 'id of the device', process.env.DEVICE_ID)
  .option(
    '-c, --certificate <certificate>',
    'location of the device certificate',
    process.env.DEVICE_CERTIFICATE,
  )
  .option(
    '-k, --key <key>',
    'location of the device private key',
    process.env.DEVICE_KEY,
  )
  .option(
    '-e, --endpoint <endpoint>',
    'AWS IoT MQTT endpoint',
    process.env.MQTT_ENDPOINT,
  )
  .option(
    '-a, --app-fw-version <appFwVersion>',
    'Version of the app firmware',
    1,
  )
  .parse(process.argv);

main(program).catch(error => {
  process.stderr.write(`${red(error)}\n`);
});
