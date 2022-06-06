"use strict";
exports.__esModule = true;
exports.CPMM = exports.ApproxCPMM = void 0;
var bignumber_js_1 = require("bignumber.js");
var ApproxCPMM = /** @class */ (function () {
    function ApproxCPMM(tokenPath) {
        this.parsedPath = this.parsePath(tokenPath);
        var newState = this.computeVariables(this.parsedPath);
        this.apn1 = newState.apn1;
        this.ap1n = newState.ap1n;
        this.rateAn_1n = newState.rateAn_1n;
        this.rateBn_1n = newState.rateBn_1n;
        this.rateA12 = newState.rateA12;
    }
    ApproxCPMM.prototype.parsePath = function (tokenPath) {
        var parsedPath = [];
        for (var i = 1; i < tokenPath.length; i++) {
            var pathNode = tokenPath[i];
            var tokenInfo = pathNode["node"];
            var pairInfo = pathNode["edge"];
            var reserve1 = Number(pairInfo.token1Reserve);
            var reserve2 = Number(pairInfo.token2Reserve);
            var rateA = Number(pairInfo.rateA);
            var rateB = Number(pairInfo.rateB);
            var decimalIn = pairInfo.token1.decimals;
            var decimalOut = pairInfo.token2.decimals;
            if (tokenInfo.name === pairInfo.token1.name) {
                // Swap order
                var tmpReserve = reserve1;
                reserve1 = reserve2;
                reserve2 = tmpReserve;
                decimalIn = pairInfo.token2.decimals;
                decimalOut = pairInfo.token1.decimals;
            }
            parsedPath.push({
                reserveIn: reserve1,
                reserveOut: reserve2,
                rateA: rateA,
                rateB: rateB,
                decimalIn: decimalIn,
                decimalOut: decimalOut
            });
        }
        return parsedPath;
    };
    ApproxCPMM.prototype.computeVariables = function (parsedPath) {
        var reserve1 = parsedPath[0].reserveIn;
        var reserve2 = parsedPath[0].reserveOut;
        var rateA = parsedPath[0].rateA;
        var rateB = parsedPath[0].rateB;
        // See formula in paper
        var ann_1 = reserve2;
        var an_1n = reserve1;
        var newState = {
            apn1: ann_1,
            ap1n: an_1n,
            rateAn_1n: rateA,
            rateBn_1n: rateB,
            rateA12: rateA
        };
        var rateAn_2n_1, rateBn_2n_1;
        for (var i = 1; i < parsedPath.length; i++) {
            reserve1 = parsedPath[i].reserveIn;
            reserve2 = parsedPath[i].reserveOut;
            rateA = parsedPath[i].rateA;
            rateB = parsedPath[i].rateB;
            ann_1 = reserve2;
            an_1n = reserve1;
            rateAn_2n_1 = newState.rateAn_1n;
            rateBn_2n_1 = newState.rateBn_1n;
            newState.rateAn_1n = rateA;
            newState.rateBn_1n = rateB;
            //let ap_denom = an_1n.plus(newState.rateAn_1n.multipliedBy(rateAn_2n_1.div(newState.rateA12)).multipliedBy(rateBn_2n_1).multipliedBy(newState.apn1));
            var ap_denom = an_1n + (newState.rateAn_1n * (rateAn_2n_1 / (newState.rateA12)) * (rateBn_2n_1) * (newState.apn1));
            //let apn1_numer = newState.apn1.multipliedBy(ann_1).multipliedBy(rateBn_2n_1).multipliedBy(rateAn_2n_1);
            var apn1_numer = newState.apn1 * (ann_1) * (rateBn_2n_1) * (rateAn_2n_1);
            newState.apn1 = apn1_numer / (ap_denom);
            var ap1n_numer = newState.ap1n * (an_1n);
            newState.ap1n = ap1n_numer / (ap_denom);
        }
        //console.log(newState);
        return newState;
    };
    ApproxCPMM.prototype.updatePathState = function (path, volume) {
        var newPath = [];
        var volOut;
        var volIn = volume;
        for (var i = 0; i < path.length; i++) {
            var reserve1 = path[i]["reserveIn"];
            var reserve2 = path[i]["reserveOut"];
            var rateA = path[i]["rateA"];
            var rateB = path[i]["rateB"];
            volOut = (rateA * (rateB) * (reserve2) * (volIn)) / (reserve1 + (rateA * (volIn)));
            volOut = volOut;
            newPath.push({
                reserveIn: reserve1 + volIn,
                reserveOut: reserve2 - volOut,
                rateA: rateA,
                rateB: rateB,
                decimalIn: path[i]["decimalIn"],
                decimalOut: path[i]["decimalOut"]
            });
            //console.log(`volIn: ${volIn.toFixed()}, volOut: ${volOut.toFixed()}`);
            volIn = volOut;
        }
        return newPath;
    };
    ;
    ApproxCPMM.prototype.computeArbitrageFactor = function (volume) {
        // Assuming that we already swapped some assets at the original (virtual) swap price for this trade path,
        // and assuming that there's a new trade after us with the same path with `volume` inputs, we compute
        // a profitability factor if we choose to immediately swap back our assets. IE, sandwich attack.
        // A profitability factor > 1 describes a profit under that scenario, while < 1 describes a loss
        // This is mitigation for front running. Note that we assume a pessimistic case here since we
        // imagine that the front runner is able to swap X assets without slippage.
        var newPath = this.updatePathState(this.parsedPath, volume);
        var newState = this.computeVariables(newPath);
        var aNew_bNew = newState.ap1n / newState.apn1;
        var b_a = this.apn1 / this.ap1n;
        return aNew_bNew * (b_a) * (newState.rateAn_1n) * (newState.rateBn_1n) * (this.rateAn_1n) * (this.rateBn_1n);
    };
    ApproxCPMM.prototype.computeMaxNoArbitrageVolume = function (startMaxVolume, maxNumIters, minThreshold) {
        if (maxNumIters === void 0) { maxNumIters = 7; }
        if (minThreshold === void 0) { minThreshold = 0.9997; }
        var vol = startMaxVolume;
        var maxVol = vol;
        var minVol = 0;
        var bestSoFar = null;
        var numIters = 0;
        while (true) {
            var factor = this.computeArbitrageFactor(vol);
            // Binary search the solution
            if (factor < 1.0) {
                bestSoFar = vol;
                if (factor >= (minThreshold) || bestSoFar == (startMaxVolume)) {
                    return [bestSoFar, factor];
                }
                else {
                    minVol = vol;
                    vol = (maxVol + (minVol)) * (0.5);
                }
            }
            else {
                maxVol = vol;
                vol = (maxVol + (minVol)) * (0.5);
            }
            if (numIters >= maxNumIters) {
                return [bestSoFar, factor];
            }
            numIters += 1;
        }
    };
    ApproxCPMM.prototype.computeArbitrageFactorPerSwap = function (volume) {
        var newPath = this.updatePathState(this.parsedPath, volume);
        var perSwapArbFactor = [];
        for (var i = 0; i < this.parsedPath.length; i++) {
            var bef = this.parsedPath[i];
            var aft = newPath[i];
            var aNew_bNew = aft["reserveIn"] / (aft["reserveOut"]);
            var b_a = bef["reserveOut"] / (bef["reserveIn"]);
            perSwapArbFactor.push(aNew_bNew * (b_a) * (aft["rateA"]) * (aft["rateB"]) * (bef["rateA"]) * (bef["rateB"]));
        }
        return perSwapArbFactor;
    };
    ApproxCPMM.prototype.computeDelta = function (volume) {
        var numer = this.rateAn_1n * (this.rateBn_1n) * (this.apn1) * (volume);
        var denom = this.ap1n + (this.rateA12 * (volume));
        return (numer / (denom)) - (volume);
    };
    ApproxCPMM.prototype.computeMaxVolume = function () {
        var volume = (this.rateAn_1n * (this.rateBn_1n) * (this.apn1) - (this.ap1n)) / (this.rateA12);
        return volume;
    };
    ApproxCPMM.prototype.computeOptimalVolume = function () {
        // Taking +ve root of derivative of ((ax / b + cx) - x)
        var a = this.rateAn_1n * (this.rateBn_1n) * (this.apn1);
        var b = this.ap1n;
        var c = this.rateA12;
        var vol = (Math.sqrt(a * b) - (b)) / (c);
        return vol;
    };
    ApproxCPMM.prototype.computeVolume = function (outputVol) {
        return this.ap1n * (outputVol) / ((this.rateAn_1n * (this.rateBn_1n) * (this.apn1)) - (this.rateA12 * (outputVol)));
    };
    ApproxCPMM.prototype.computeLiquidity = function () {
        var liquidity = this.apn1 * (this.ap1n);
        return liquidity;
    };
    ApproxCPMM.prototype.computeSwapPrice = function () {
        var swap_price = (this.rateAn_1n * (this.rateBn_1n) * (this.apn1)) / (this.ap1n);
        return swap_price;
    };
    ApproxCPMM.prototype.swap = function (volume) {
        var newPath = this.updatePathState(this.parsedPath, volume);
        return this.parsedPath.slice(-1)[0]["reserveOut"] - (newPath.slice(-1)[0]["reserveOut"]);
    };
    ApproxCPMM.prototype.swapPath = function (volume) {
        var newPath = this.updatePathState(this.parsedPath, volume);
        var swapOut = [];
        for (var i = 0; i < newPath.length; i++) {
            swapOut.push(this.parsedPath[i]["reserveOut"] - (newPath[i]["reserveOut"]));
        }
        return swapOut;
    };
    return ApproxCPMM;
}());
exports.ApproxCPMM = ApproxCPMM;
;
var CPMM = /** @class */ (function () {
    function CPMM(tokenPath) {
        this.parsedPath = this.parsePath(tokenPath);
        var newState = this.computeVariables(this.parsedPath);
        this.apn1 = newState.apn1;
        this.ap1n = newState.ap1n;
        this.rateAn_1n = newState.rateAn_1n;
        this.rateBn_1n = newState.rateBn_1n;
        this.rateA12 = newState.rateA12;
    }
    CPMM.prototype.parsePath = function (tokenPath) {
        var parsedPath = [];
        for (var i = 1; i < tokenPath.length; i++) {
            var pathNode = tokenPath[i];
            var tokenInfo = pathNode["node"];
            var pairInfo = pathNode["edge"];
            var reserve1 = new bignumber_js_1.BigNumber(pairInfo.token1Reserve);
            var reserve2 = new bignumber_js_1.BigNumber(pairInfo.token2Reserve);
            var rateA = new bignumber_js_1.BigNumber(pairInfo.rateA);
            var rateB = new bignumber_js_1.BigNumber(pairInfo.rateB);
            var decimalIn = pairInfo.token1.decimals;
            var decimalOut = pairInfo.token2.decimals;
            if (tokenInfo.name === pairInfo.token1.name) {
                // Swap order
                var tmpReserve = reserve1;
                reserve1 = reserve2;
                reserve2 = tmpReserve;
                decimalIn = pairInfo.token2.decimals;
                decimalOut = pairInfo.token1.decimals;
            }
            parsedPath.push({
                reserveIn: reserve1,
                reserveOut: reserve2,
                rateA: rateA,
                rateB: rateB,
                decimalIn: decimalIn,
                decimalOut: decimalOut
            });
        }
        return parsedPath;
    };
    CPMM.prototype.computeVariables = function (parsedPath) {
        var reserve1 = parsedPath[0].reserveIn;
        var reserve2 = parsedPath[0].reserveOut;
        var rateA = parsedPath[0].rateA;
        var rateB = parsedPath[0].rateB;
        // See formula in paper
        var ann_1 = reserve2;
        var an_1n = reserve1;
        var newState = {
            apn1: ann_1,
            ap1n: an_1n,
            rateAn_1n: rateA,
            rateBn_1n: rateB,
            rateA12: rateA
        };
        var rateAn_2n_1, rateBn_2n_1;
        for (var i = 1; i < parsedPath.length; i++) {
            reserve1 = parsedPath[i].reserveIn;
            reserve2 = parsedPath[i].reserveOut;
            rateA = parsedPath[i].rateA;
            rateB = parsedPath[i].rateB;
            ann_1 = reserve2;
            an_1n = reserve1;
            rateAn_2n_1 = newState.rateAn_1n;
            rateBn_2n_1 = newState.rateBn_1n;
            newState.rateAn_1n = rateA;
            newState.rateBn_1n = rateB;
            var ap_denom = an_1n.plus(newState.rateAn_1n.multipliedBy(rateAn_2n_1.div(newState.rateA12)).multipliedBy(rateBn_2n_1).multipliedBy(newState.apn1));
            var apn1_numer = newState.apn1.multipliedBy(ann_1).multipliedBy(rateBn_2n_1).multipliedBy(rateAn_2n_1);
            newState.apn1 = apn1_numer.dividedBy(ap_denom);
            var ap1n_numer = newState.ap1n.multipliedBy(an_1n);
            newState.ap1n = ap1n_numer.dividedBy(ap_denom);
        }
        return newState;
    };
    CPMM.prototype.updatePathState = function (path, volume, roundDecimals) {
        if (roundDecimals === void 0) { roundDecimals = false; }
        var newPath = [];
        var volOut;
        var volIn = roundDecimals ? (new bignumber_js_1.BigNumber(volume)).decimalPlaces(path[0]["decimalIn"]) : volume;
        for (var i = 0; i < path.length; i++) {
            var reserve1 = path[i]["reserveIn"];
            var reserve2 = path[i]["reserveOut"];
            var rateA = path[i]["rateA"];
            var rateB = path[i]["rateB"];
            volOut = (rateA.multipliedBy(rateB).multipliedBy(reserve2).multipliedBy(volIn)).dividedBy(reserve1.plus(rateA.multipliedBy(volIn)));
            volOut = roundDecimals && path[i]["decimalOut"] ? volOut.decimalPlaces(path[i]["decimalOut"]) : volOut;
            newPath.push({
                reserveIn: reserve1.plus(volIn),
                reserveOut: reserve2.minus(volOut),
                rateA: rateA,
                rateB: rateB,
                decimalIn: path[i]["decimalIn"],
                decimalOut: path[i]["decimalOut"]
            });
            //console.log(`volIn: ${volIn.toFixed()}, volOut: ${volOut.toFixed()}`);
            volIn = volOut;
        }
        return newPath;
    };
    ;
    CPMM.prototype.swap = function (volume, roundDecimals) {
        if (roundDecimals === void 0) { roundDecimals = false; }
        var newPath = this.updatePathState(this.parsedPath, volume, roundDecimals);
        return this.parsedPath.slice(-1)[0]["reserveOut"].minus(newPath.slice(-1)[0]["reserveOut"]);
    };
    CPMM.prototype.swapPath = function (volume, roundDecimals) {
        if (roundDecimals === void 0) { roundDecimals = false; }
        var newPath = this.updatePathState(this.parsedPath, volume, roundDecimals);
        var swapOut = [];
        for (var i = 0; i < newPath.length; i++) {
            swapOut.push(this.parsedPath[i]["reserveOut"].minus(newPath[i]["reserveOut"]));
        }
        return swapOut;
    };
    CPMM.prototype.computeMaxNoArbitrageVolume = function (startMaxVolume, maxNumIters, minThreshold) {
        if (maxNumIters === void 0) { maxNumIters = 7; }
        if (minThreshold === void 0) { minThreshold = 0.9997; }
        var vol = new bignumber_js_1.BigNumber(startMaxVolume);
        var maxVol = vol;
        var minVol = new bignumber_js_1.BigNumber(0);
        var bestSoFar = null;
        var numIters = 0;
        while (true) {
            var factor = this.computeArbitrageFactor(vol);
            // Binary search the solution
            if (factor.isLessThan(1.0)) {
                bestSoFar = vol;
                if (factor.isGreaterThanOrEqualTo(minThreshold) || bestSoFar.isEqualTo(startMaxVolume)) {
                    return [bestSoFar, factor];
                }
                else {
                    minVol = vol;
                    vol = maxVol.plus(minVol).multipliedBy(0.5);
                }
            }
            else {
                maxVol = vol;
                vol = maxVol.plus(minVol).multipliedBy(0.5);
            }
            if (numIters >= maxNumIters) {
                return [bestSoFar, factor];
            }
            numIters += 1;
        }
    };
    CPMM.prototype.computeArbitrageFactor = function (volume, roundDecimals) {
        // Assuming that we already swapped some assets at the original (virtual) swap price for this trade path,
        // and assuming that there's a new trade after us with the same path with `volume` inputs, we compute
        // a profitability factor if we choose to immediately swap back our assets. IE, sandwich attack.
        // A profitability factor > 1 describes a profit under that scenario, while < 1 describes a loss
        if (roundDecimals === void 0) { roundDecimals = false; }
        // This is mitigation for front running. Note that we assume a pessimistic case here since we
        // imagine that the front runner is able to swap X assets without slippage.
        var newPath = this.updatePathState(this.parsedPath, volume, roundDecimals);
        var newState = this.computeVariables(newPath);
        var aNew_bNew = newState.ap1n.dividedBy(newState.apn1);
        var b_a = this.apn1.dividedBy(this.ap1n);
        return aNew_bNew.multipliedBy(b_a).multipliedBy(newState.rateAn_1n)
            .multipliedBy(newState.rateBn_1n).multipliedBy(this.rateAn_1n).multipliedBy(this.rateBn_1n);
    };
    CPMM.prototype.computeArbitrageFactorPerSwap = function (volume, roundDecimals) {
        if (roundDecimals === void 0) { roundDecimals = false; }
        var newPath = this.updatePathState(this.parsedPath, volume, roundDecimals);
        var perSwapArbFactor = [];
        for (var i = 0; i < this.parsedPath.length; i++) {
            var bef = this.parsedPath[i];
            var aft = newPath[i];
            var aNew_bNew = aft["reserveIn"].dividedBy(aft["reserveOut"]);
            var b_a = bef["reserveOut"].dividedBy(bef["reserveIn"]);
            perSwapArbFactor.push(aNew_bNew.multipliedBy(b_a).multipliedBy(aft["rateA"])
                .multipliedBy(aft["rateB"]).multipliedBy(bef["rateA"]).multipliedBy(bef["rateB"]));
        }
        return perSwapArbFactor;
    };
    CPMM.prototype.computeDelta = function (volume) {
        var numer = this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).multipliedBy(volume);
        var denom = this.ap1n.plus(this.rateA12.multipliedBy(volume));
        return (numer.dividedBy(denom)).minus(volume);
    };
    CPMM.prototype.computeMaxVolume = function () {
        var volume = (this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).minus(this.ap1n)).dividedBy(this.rateA12);
        return volume;
    };
    CPMM.prototype.computeOptimalVolume = function () {
        // Taking +ve root of derivative of ((ax / b + cx) - x)
        var a = this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1);
        var b = this.ap1n;
        var c = this.rateA12;
        var vol = ((a.multipliedBy(b)).sqrt().minus(b)).dividedBy(c);
        return vol;
    };
    CPMM.prototype.computeVolume = function (outputVol) {
        return this.ap1n.multipliedBy(outputVol).dividedBy(this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).minus(this.rateA12.multipliedBy(outputVol)));
    };
    CPMM.prototype.computeLiquidity = function () {
        var liquidity = this.apn1.multipliedBy(this.ap1n);
        return liquidity;
    };
    CPMM.prototype.computeSwapPrice = function () {
        var swap_price = (this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1)).dividedBy(this.ap1n);
        return swap_price;
    };
    return CPMM;
}());
exports.CPMM = CPMM;
