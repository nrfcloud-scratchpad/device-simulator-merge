const Thingy = require('./Thingy');
const Pairing = require('./Pairing');

const device = new Thingy();
const pairing = new Pairing(device);

let cli;
/*
if (process.argv[2]) {
    if (process.argv[2] === 'cli') {
        cli = true;

        stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');

        stageInProcess = false;

        stdin.on('data', key => {
            if (key === '\u0003') {
                pairing.unsubscribeToTopic('#');
                process.exit()
            }

            switch (key) {
                case 'n':
                    if (!stageInProcess) {
                        console.log('complete next step');
                    }
                    break;

                default:
                    break;

            }
        })
    }
}
*/

const main = () => {
    device.extractDeviceId()
    .then(pairing.connect)
    .then(() => {
        console.log("huzzah");
    })
    .catch(reason => {
        console.log("Rejection: something failed:");
        console.log(reason);
    });
}

main();