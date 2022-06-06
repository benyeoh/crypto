import { Layout, plot, stack, clear, Plot } from 'nodeplotlib';
import { getCoinsFromKey } from './path_utils';

export function plotBar2(pathStats, k1, k2, useStack = false, axis = null) {
    let data: Plot[] = [];
    if (!(k1 instanceof Array)) {
        k1 = [k1];
        k2 = [k2];
    }

    let keyStr = ""
    let axes = [];
    for (let i = 0; i < k1.length; i++) {
        let x = [];
        let y = [];
        for (let j = 0; j < pathStats.length; j++) {
            x.push(pathStats[j][0]);
            y.push(pathStats[j][1][k1[i]][k2[i]]);
        }

        if (keyStr === "") {
            keyStr = `${upperCaseify(k1[i])} ${upperCaseify(k2[i])}`
        } else {
            keyStr += `, ${upperCaseify(k1[i])} ${upperCaseify(k2[i])}`
        }

        let plot: Plot = {
            x: x,
            y: y,
            type: "bar",
            name: `${upperCaseify(k1[i])} ${upperCaseify(k2[i])}`,
            //width: 1600
        }

        if (axis !== null && axis[i] === 1) {
            plot.yaxis = "y2";
        }

        data.push(plot);
    }

    let layout: Layout = {
        barmode: "group",
        title: getCoinsFromKey(pathStats[0][0])[0] + `: ${keyStr}`,
        // width: 1600,
        //autosize: false
    };

    if (axis !== null && axis.includes(1)) {
        layout.yaxis2 = {
            overlaying: "y",
            side: "right"
        }
    }

    stack(data, layout);
}

export function plotBar(pathStats, k1) {
    let data: Plot[] = [];
    if (!(k1 instanceof Array)) {
        k1 = [k1];
    }

    let keyStr = ""
    for (let i = 0; i < k1.length; i++) {
        let x = [];
        let y = [];
        for (let j = 0; j < pathStats.length; j++) {
            x.push(pathStats[j][0]);
            y.push(pathStats[j][1][k1[i]]);
        }

        if (keyStr === "") {
            keyStr = `${upperCaseify(k1[i])}`
        } else {
            keyStr += `, ${upperCaseify(k1[i])}`
        }

        data.push({
            x: x,
            y: y,
            type: "bar",
            name: `${upperCaseify(k1[i])}`,
            //width: 1600

        });
    }

    let layout: Layout = {
        title: getCoinsFromKey(pathStats[0][0])[0] + ` - ${keyStr}`,
        //width: 1600,
        //autosize: false
    };

    stack(data, layout);
}

export function flushPlots() {
    plot();
}

function upperCaseify(str) {
    return str.replace(/([A-Z])/g, ' $1').replace(/^./, function (s) { return s.toUpperCase(); })
}
