const fs = require("fs");
const path = require("path");

export function getSaveToFileCB(logDir) {
    return (async (allPaths, startCoin, timestamp) => {
        if (allPaths.length > 0) {
            let outDir = path.join(logDir, startCoin);
            fs.mkdir(outDir, { recursive: true }, (err) => {
                if (err) {
                    throw err;
                }

                let data = {
                    startCoin: startCoin,
                    timestamp: timestamp,
                    paths: allPaths
                };

                fs.writeFileSync(path.join(outDir, `${timestamp}.json`), JSON.stringify(data, null, 4), "utf8");
            });
        }
    });
}
