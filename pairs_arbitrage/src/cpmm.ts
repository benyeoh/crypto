import { BigNumber } from "bignumber.js"

export class ApproxCPMM {
    private apn1: number;
    private ap1n: number;
    private rateAn_1n: number;
    private rateBn_1n: number;
    private rateA12: number;
    private parsedPath: Array<Object>;

    constructor(tokenPath) {
        this.parsedPath = this.parsePath(tokenPath);
        let newState = this.computeVariables(this.parsedPath);
        this.apn1 = newState.apn1;
        this.ap1n = newState.ap1n;
        this.rateAn_1n = newState.rateAn_1n;
        this.rateBn_1n = newState.rateBn_1n;
        this.rateA12 = newState.rateA12;
    }

    private parsePath(tokenPath) {
        let parsedPath = [];

        for (let i = 1; i < tokenPath.length; i++) {
            let pathNode = tokenPath[i];
            let tokenInfo = pathNode["node"];
            let pairInfo = pathNode["edge"];
            let reserve1 = Number(pairInfo.token1Reserve);
            let reserve2 = Number(pairInfo.token2Reserve);
            let rateA = Number(pairInfo.rateA);
            let rateB = Number(pairInfo.rateB);
            let decimalIn = pairInfo.token1.decimals;
            let decimalOut = pairInfo.token2.decimals;

            if (tokenInfo.name === pairInfo.token1.name) {
                // Swap order
                let tmpReserve = reserve1;
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
    }

    private computeVariables(parsedPath) {
        let reserve1 = parsedPath[0].reserveIn;
        let reserve2 = parsedPath[0].reserveOut;
        let rateA = parsedPath[0].rateA;
        let rateB = parsedPath[0].rateB;

        // See formula in paper
        let ann_1 = reserve2;
        let an_1n = reserve1;
        let newState = {
            apn1: ann_1,
            ap1n: an_1n,
            rateAn_1n: rateA,
            rateBn_1n: rateB,
            rateA12: rateA
        };

        let rateAn_2n_1, rateBn_2n_1;
        for (let i = 1; i < parsedPath.length; i++) {
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
            let ap_denom = an_1n + (newState.rateAn_1n * (rateAn_2n_1 / (newState.rateA12)) * (rateBn_2n_1) * (newState.apn1));

            //let apn1_numer = newState.apn1.multipliedBy(ann_1).multipliedBy(rateBn_2n_1).multipliedBy(rateAn_2n_1);
            let apn1_numer = newState.apn1 * (ann_1) * (rateBn_2n_1) * (rateAn_2n_1);
            newState.apn1 = apn1_numer / (ap_denom);

            let ap1n_numer = newState.ap1n * (an_1n);
            newState.ap1n = ap1n_numer / (ap_denom);
        }

        //console.log(newState);
        return newState;
    }

    private updatePathState(path: Array<Object>, volume: number): Array<Object> {
        let newPath = [];

        let volOut;
        let volIn = volume;
        for (let i = 0; i < path.length; i++) {
            let reserve1 = path[i]["reserveIn"];
            let reserve2 = path[i]["reserveOut"];
            let rateA = path[i]["rateA"];
            let rateB = path[i]["rateB"];

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

    computeArbitrageFactor(volume: number): number {
        // Assuming that we already swapped some assets at the original (virtual) swap price for this trade path,
        // and assuming that there's a new trade after us with the same path with `volume` inputs, we compute
        // a profitability factor if we choose to immediately swap back our assets. IE, sandwich attack.
        // A profitability factor > 1 describes a profit under that scenario, while < 1 describes a loss

        // This is mitigation for front running. Note that we assume a pessimistic case here since we
        // imagine that the front runner is able to swap X assets without slippage.
        let newPath = this.updatePathState(this.parsedPath, volume);
        let newState = this.computeVariables(newPath);

        let aNew_bNew = newState.ap1n / newState.apn1;
        let b_a = this.apn1 / this.ap1n;
        return aNew_bNew * (b_a) * (newState.rateAn_1n) * (newState.rateBn_1n) * (this.rateAn_1n) * (this.rateBn_1n);
    }


    computeMaxNoArbitrageVolume(startMaxVolume: number, maxNumIters = 7, minThreshold = 0.9997): [number, number] {

        let vol = startMaxVolume;
        let maxVol = vol;
        let minVol = 0;
        let bestSoFar = null;

        let numIters = 0;
        while (true) {
            let factor = this.computeArbitrageFactor(vol);

            // Binary search the solution
            if (factor < 1.0) {
                bestSoFar = vol;
                if (factor >= (minThreshold) || bestSoFar == (startMaxVolume)) {
                    return [bestSoFar, factor];
                } else {
                    minVol = vol;
                    vol = (maxVol + (minVol)) * (0.5);
                }
            } else {
                maxVol = vol;
                vol = (maxVol + (minVol)) * (0.5);
            }

            if (numIters >= maxNumIters) {
                return [bestSoFar, factor];
            }

            numIters += 1;
        }

    }

    computeArbitrageFactorPerSwap(volume: number): number[] {
        let newPath = this.updatePathState(this.parsedPath, volume);
        let perSwapArbFactor = []
        for (let i = 0; i < this.parsedPath.length; i++) {
            let bef = this.parsedPath[i];
            let aft = newPath[i]
            let aNew_bNew = aft["reserveIn"] / (aft["reserveOut"]);
            let b_a = bef["reserveOut"] / (bef["reserveIn"]);
            perSwapArbFactor.push(aNew_bNew * (b_a) * (aft["rateA"]) * (aft["rateB"]) * (bef["rateA"]) * (bef["rateB"]));
        }
        return perSwapArbFactor;
    }

    computeDelta(volume: number): number {
        let numer = this.rateAn_1n * (this.rateBn_1n) * (this.apn1) * (volume);
        let denom = this.ap1n + (this.rateA12 * (volume));
        return (numer / (denom)) - (volume);
    }

    computeMaxVolume(): number {
        let volume = (this.rateAn_1n * (this.rateBn_1n) * (this.apn1) - (this.ap1n)) / (this.rateA12);
        return volume;
    }

    computeOptimalVolume(): number {
        // Taking +ve root of derivative of ((ax / b + cx) - x)
        let a = this.rateAn_1n * (this.rateBn_1n) * (this.apn1);
        let b = this.ap1n;
        let c = this.rateA12;
        let vol = (Math.sqrt(a * b) - (b)) / (c);
        return vol;
    }

    computeVolume(outputVol: number): number {
        return this.ap1n * (outputVol) / (
            (this.rateAn_1n * (this.rateBn_1n) * (this.apn1)) - (this.rateA12 * (outputVol)));
    }

    computeLiquidity(): number {
        let liquidity = this.apn1 * (this.ap1n);
        return liquidity;
    }

    computeSwapPrice(): number {
        let swap_price = (this.rateAn_1n * (this.rateBn_1n) * (this.apn1)) / (this.ap1n);
        return swap_price;
    }

    swap(volume: number): number {
        let newPath = this.updatePathState(this.parsedPath, volume);
        return this.parsedPath.slice(-1)[0]["reserveOut"] - (newPath.slice(-1)[0]["reserveOut"]);
    }

    swapPath(volume: number): number[] {
        let newPath = this.updatePathState(this.parsedPath, volume);
        let swapOut = [];
        for (let i = 0; i < newPath.length; i++) {
            swapOut.push(this.parsedPath[i]["reserveOut"] - (newPath[i]["reserveOut"]));
        }
        return swapOut;
    }

};

export class CPMM {
    private apn1: BigNumber;
    private ap1n: BigNumber;
    private rateAn_1n: BigNumber;
    private rateBn_1n: BigNumber;
    private rateA12: BigNumber;
    private parsedPath: Array<Object>;

    constructor(tokenPath) {
        this.parsedPath = this.parsePath(tokenPath);
        let newState = this.computeVariables(this.parsedPath);
        this.apn1 = newState.apn1;
        this.ap1n = newState.ap1n;
        this.rateAn_1n = newState.rateAn_1n;
        this.rateBn_1n = newState.rateBn_1n;
        this.rateA12 = newState.rateA12;
    }

    private parsePath(tokenPath) {
        let parsedPath = [];

        for (let i = 1; i < tokenPath.length; i++) {
            let pathNode = tokenPath[i];
            let tokenInfo = pathNode["node"];
            let pairInfo = pathNode["edge"];
            let reserve1 = new BigNumber(pairInfo.token1Reserve);
            let reserve2 = new BigNumber(pairInfo.token2Reserve);
            let rateA = new BigNumber(pairInfo.rateA);
            let rateB = new BigNumber(pairInfo.rateB);
            let decimalIn = pairInfo.token1.decimals;
            let decimalOut = pairInfo.token2.decimals;

            if (tokenInfo.name === pairInfo.token1.name) {
                // Swap order
                let tmpReserve = reserve1;
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
    }

    private computeVariables(parsedPath) {
        let reserve1 = parsedPath[0].reserveIn;
        let reserve2 = parsedPath[0].reserveOut;
        let rateA = parsedPath[0].rateA;
        let rateB = parsedPath[0].rateB;

        // See formula in paper
        let ann_1 = reserve2;
        let an_1n = reserve1;
        let newState = {
            apn1: ann_1,
            ap1n: an_1n,
            rateAn_1n: rateA,
            rateBn_1n: rateB,
            rateA12: rateA
        };

        let rateAn_2n_1, rateBn_2n_1;
        for (let i = 1; i < parsedPath.length; i++) {
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

            let ap_denom = an_1n.plus(newState.rateAn_1n.multipliedBy(rateAn_2n_1.div(newState.rateA12)).multipliedBy(rateBn_2n_1).multipliedBy(newState.apn1));

            let apn1_numer = newState.apn1.multipliedBy(ann_1).multipliedBy(rateBn_2n_1).multipliedBy(rateAn_2n_1);
            newState.apn1 = apn1_numer.dividedBy(ap_denom);

            let ap1n_numer = newState.ap1n.multipliedBy(an_1n);
            newState.ap1n = ap1n_numer.dividedBy(ap_denom);
        }

        return newState;
    }

    private updatePathState(path: Array<Object>, volume: BigNumber | number, roundDecimals = false): Array<Object> {
        let newPath = [];

        let volOut;
        let volIn = roundDecimals ? (new BigNumber(volume)).decimalPlaces(path[0]["decimalIn"]) : volume;
        for (let i = 0; i < path.length; i++) {
            let reserve1 = path[i]["reserveIn"];
            let reserve2 = path[i]["reserveOut"];
            let rateA = path[i]["rateA"];
            let rateB = path[i]["rateB"];

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

    swap(volume: BigNumber | number, roundDecimals = false): BigNumber {
        let newPath = this.updatePathState(this.parsedPath, volume, roundDecimals);
        return this.parsedPath.slice(-1)[0]["reserveOut"].minus(newPath.slice(-1)[0]["reserveOut"]);
    }

    swapPath(volume: BigNumber | number, roundDecimals = false): BigNumber[] {
        let newPath = this.updatePathState(this.parsedPath, volume, roundDecimals);
        let swapOut = [];
        for (let i = 0; i < newPath.length; i++) {
            swapOut.push(this.parsedPath[i]["reserveOut"].minus(newPath[i]["reserveOut"]));
        }
        return swapOut;
    }

    computeMaxNoArbitrageVolume(startMaxVolume: BigNumber | number, maxNumIters = 7, minThreshold = 0.9997): [BigNumber, BigNumber] {

        let vol = new BigNumber(startMaxVolume);
        let maxVol = vol;
        let minVol = new BigNumber(0);
        let bestSoFar = null;

        let numIters = 0;
        while (true) {
            let factor = this.computeArbitrageFactor(vol);

            // Binary search the solution
            if (factor.isLessThan(1.0)) {
                bestSoFar = vol;
                if (factor.isGreaterThanOrEqualTo(minThreshold) || bestSoFar.isEqualTo(startMaxVolume)) {
                    return [bestSoFar, factor];
                } else {
                    minVol = vol;
                    vol = maxVol.plus(minVol).multipliedBy(0.5);
                }
            } else {
                maxVol = vol;
                vol = maxVol.plus(minVol).multipliedBy(0.5);
            }

            if (numIters >= maxNumIters) {
                return [bestSoFar, factor];
            }

            numIters += 1;
        }

    }

    computeArbitrageFactor(volume: BigNumber | number, roundDecimals = false): BigNumber {
        // Assuming that we already swapped some assets at the original (virtual) swap price for this trade path,
        // and assuming that there's a new trade after us with the same path with `volume` inputs, we compute
        // a profitability factor if we choose to immediately swap back our assets. IE, sandwich attack.
        // A profitability factor > 1 describes a profit under that scenario, while < 1 describes a loss

        // This is mitigation for front running. Note that we assume a pessimistic case here since we
        // imagine that the front runner is able to swap X assets without slippage.
        let newPath = this.updatePathState(this.parsedPath, volume, roundDecimals);
        let newState = this.computeVariables(newPath);

        let aNew_bNew = newState.ap1n.dividedBy(newState.apn1);
        let b_a = this.apn1.dividedBy(this.ap1n);
        return aNew_bNew.multipliedBy(b_a).multipliedBy(newState.rateAn_1n)
            .multipliedBy(newState.rateBn_1n).multipliedBy(this.rateAn_1n).multipliedBy(this.rateBn_1n);
    }

    computeArbitrageFactorPerSwap(volume: BigNumber | number, roundDecimals = false): BigNumber[] {
        let newPath = this.updatePathState(this.parsedPath, volume, roundDecimals);
        let perSwapArbFactor = []
        for (let i = 0; i < this.parsedPath.length; i++) {
            let bef = this.parsedPath[i];
            let aft = newPath[i]
            let aNew_bNew = aft["reserveIn"].dividedBy(aft["reserveOut"]);
            let b_a = bef["reserveOut"].dividedBy(bef["reserveIn"]);
            perSwapArbFactor.push(aNew_bNew.multipliedBy(b_a).multipliedBy(aft["rateA"])
                .multipliedBy(aft["rateB"]).multipliedBy(bef["rateA"]).multipliedBy(bef["rateB"]));
        }
        return perSwapArbFactor;
    }

    computeDelta(volume: BigNumber | number): BigNumber {
        let numer = this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).multipliedBy(volume);
        let denom = this.ap1n.plus(this.rateA12.multipliedBy(volume));
        return (numer.dividedBy(denom)).minus(volume);
    }

    computeMaxVolume(): BigNumber {
        let volume = (this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).minus(this.ap1n)).dividedBy(this.rateA12);
        return volume;
    }

    computeOptimalVolume(): BigNumber {
        // Taking +ve root of derivative of ((ax / b + cx) - x)
        let a = this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1);
        let b = this.ap1n;
        let c = this.rateA12;
        let vol = ((a.multipliedBy(b)).sqrt().minus(b)).dividedBy(c);
        return vol;
    }

    computeVolume(outputVol: BigNumber | number): BigNumber {
        return this.ap1n.multipliedBy(outputVol).dividedBy(
            this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).minus(
                this.rateA12.multipliedBy(outputVol)));
    }

    computeLiquidity(): BigNumber {
        let liquidity = this.apn1.multipliedBy(this.ap1n);
        return liquidity;
    }

    computeSwapPrice(): BigNumber {
        let swap_price = (this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1)).dividedBy(this.ap1n);
        return swap_price;
    }
}