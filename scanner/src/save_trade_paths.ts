const fs = require("fs");
const path = require("path");

export function getSaveToFileCB(logDir: string): Function {
    return (allPathsResults, startCoins, timestamp) => {
        for (let i = 0; i < allPathsResults.length; i++) {
            let allPaths = allPathsResults[i];
            if (allPaths.length > 0) {
                let outDir = path.join(logDir, startCoins[i]);
                fs.mkdir(outDir, { recursive: true }, (err) => {
                    if (err) {
                        throw err;
                    }

                    let data = {
                        startCoin: startCoins[i],
                        timestamp: timestamp,
                        paths: allPaths
                    };

                    //fs.writeFileSync(path.join(outDir, `${timestamp}.json`), JSON.stringify(data, null, 4), "utf8");
                    fs.writeFile(path.join(outDir, `${timestamp}.json`), JSON.stringify(data, null, 4), "utf8", (err) => {
                        err && console.log(err);
                    });
                });
            }
        }
    }
}
