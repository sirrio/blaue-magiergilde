const fs = require('node:fs');
const path = require('node:path');
const { Worker, isMainThread, workerData } = require('node:worker_threads');

if (!isMainThread) {
    require(workerData.testPath);
} else {
    const testsDir = __dirname;
    const entries = fs.readdirSync(testsDir, { withFileTypes: true });
    const testFiles = entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.test.js'))
        .map(entry => entry.name)
        .sort();

    function runTestFile(file) {
        const testPath = path.join(testsDir, file);

        return new Promise((resolve, reject) => {
            const worker = new Worker(__filename, {
                workerData: { testPath },
            });

            worker.once('error', reject);
            worker.once('exit', (code) => {
                if (code === 0) {
                    resolve();
                    return;
                }

                reject(new Error(`Test worker exited with code ${code}: ${file}`));
            });
        });
    }

    async function main() {
        for (const file of testFiles) {
            await runTestFile(file);
        }
    }

    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
