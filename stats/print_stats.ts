#!/usr/bin/env -S npx ts-node
const glob = require("glob");
const path = require("path");
import { plot, Plot } from 'nodeplotlib';


// Fetch all pair files
const allCoinDirs = glob.sync("../tmp/*");
for (let i = 0; i < allCoinDirs.length; i++) {
    let paths = glob.sync(path.join(allCoinDirs[i], "*.json"))
    paths.sort((a, b) => {
        let aTime = parseInt(a.split(",")[0]);
        let bTime = parseInt(b.split(",")[0]);
        return aTime - bTime;
    });

    console.log(paths);
    break;
}

// let pairsList = [];
// // Create a graph model of all pairs and find all possible swap paths
// for (let i = 0; i < allPairFiles.length; i++) {
//     let pairs = JSON.parse(fs.readFileSync(allPairFiles[i], "utf8"));
//     pairsList.push(pairs);
// }


// const data: Plot[] = [{ x: [1, 3, 4, 5], y: [3, 12, 1, 4] }];
// plot(data);
