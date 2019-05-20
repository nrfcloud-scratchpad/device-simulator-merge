import * as program from 'commander';
import { cyan, green, red, yellow, magenta } from 'colors';
import * as dotenv from 'dotenv';
import { connect } from './connection';
import * as path from 'path';

dotenv.config();

console.log(process.env.DEVICE_ID);

const main = async ({
  id,
  certificate,
  key,
  endpoint,
  fwversion,
}: program.Command) => {
  const keyFile = path.resolve(key);
  const certFile = path.resolve(certificate);
  const topics = {
    jobs: {
      notifyNext: `$aws/things/${id}/jobs/notify-next`,
    },
    shadow: {
      update: `$aws/things/${id}/shadow/update`,
    },
  };

  console.log({
    id,
    keyFile,
    certFile,
    endpoint,
    region: endpoint.split('.')[2],
    topics,
    fwversion: parseInt(fwversion, 10),
  });

  console.log(cyan(`connecting to ${yellow(endpoint)}...`));

  const connection = connect({
    id,
    certificate: certFile,
    key: keyFile,
    endpoint,
  });

  connection.on('error', (error: any) => {
    console.error(`AWS IoT error ${error.message}`);
  });

  connection.on('connect', () => {
    console.log(green('connected'));
    // Publish firmware version
    console.log(cyan(`reporting firmware version ${yellow(fwversion)}...`));
    connection.publish(
      topics.shadow.update,
      JSON.stringify({
        state: {
          reported: {
            nrfcloud__fwversion: fwversion,
          },
        },
      }),
      undefined,
      error => {
        if (error) {
          throw error;
        }
        console.log(green('reported'));
        // Listen for jobs
        console.log(
          cyan(`subscribing to ${yellow(topics.jobs.notifyNext)}...`),
        );
        connection.subscribe(topics.jobs.notifyNext, undefined, () => {
          console.log(green('subscribed'));
        });
      },
    );
  });

  connection.on('close', () => {
    console.error('disconnect');
  });

  connection.on('reconnect', () => {
    console.log(magenta('reconnect'));
  });

  connection.on('message', (topic: string, payload: any) => {
    console.log(magenta(`< ${topic}`));
    console.log(magenta(payload));
  });
};

program
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
  .option('-f, --fwversion <fwversion>', 'Version of the firmware', 0)
  .parse(process.argv);

main(program).catch(error => {
  process.stderr.write(`${red(error)}\n`);
});
