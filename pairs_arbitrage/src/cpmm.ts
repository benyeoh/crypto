import { BigNumber } from "bignumber.js"

export class CPMM {
    private apn1: BigNumber;
    private ap1n: BigNumber;
    private rateAn_1n: BigNumber;
    private rateBn_1n: BigNumber;
    private rateA12: BigNumber;

    constructor(tokenPath) {
        this.computeVariables(tokenPath);
    }

    private computeVariables(tokenPath): void {
        let tokenInfo = tokenPath[1]["node"]
        let pairInfo = tokenPath[1]["edge"]
        let reserve1 = new BigNumber(pairInfo.token1Reserve);
        let reserve2 = new BigNumber(pairInfo.token2Reserve);
        let rateA = new BigNumber(pairInfo.rateA);
        let rateB = new BigNumber(pairInfo.rateB);

        if (tokenInfo.name === pairInfo.token1.name) {
            // Swap order
            let tmpReserve = reserve1;
            reserve1 = reserve2;
            reserve2 = tmpReserve;
        }

        // See formula in paper
        let ann_1 = reserve2;
        let an_1n = reserve1;
        this.apn1 = ann_1;
        this.ap1n = an_1n;

        this.rateAn_1n = rateA;
        this.rateBn_1n = rateB;

        let rateAn_2n_1, rateBn_2n_1;
        this.rateA12 = rateA;

        let slicedPath = tokenPath.slice(2);

        for (let i = 0; i < slicedPath.length; i++) {
            let pathNode = slicedPath[i];
            tokenInfo = pathNode["node"];
            pairInfo = pathNode["edge"];
            reserve1 = new BigNumber(pairInfo.token1Reserve);
            reserve2 = new BigNumber(pairInfo.token2Reserve);
            rateA = new BigNumber(pairInfo.rateA);
            rateB = new BigNumber(pairInfo.rateB);
            if (tokenInfo.name === pairInfo.token1.name) {
                // Swap order
                let tmpReserve = reserve1;
                reserve1 = reserve2;
                reserve2 = tmpReserve;
            }

            ann_1 = reserve2;
            an_1n = reserve1;
            rateAn_2n_1 = this.rateAn_1n;
            rateBn_2n_1 = this.rateBn_1n;
            this.rateAn_1n = rateA;
            this.rateBn_1n = rateB;

            let ap_denom = an_1n.plus(this.rateAn_1n.multipliedBy(rateAn_2n_1.div(this.rateA12)).multipliedBy(rateBn_2n_1).multipliedBy(this.apn1));

            let apn1_numer = this.apn1.multipliedBy(ann_1).multipliedBy(rateBn_2n_1).multipliedBy(rateAn_2n_1);
            this.apn1 = apn1_numer.dividedBy(ap_denom);

            let ap1n_numer = this.ap1n.multipliedBy(an_1n);
            this.ap1n = ap1n_numer.dividedBy(ap_denom);
        }
    }

    computeDelta(volume: number): number {
        let numer = this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).multipliedBy(volume);
        let denom = this.ap1n.plus(this.rateA12.multipliedBy(volume));
        return (numer.dividedBy(denom)).minus(volume).toNumber();
    }

    computeMaxVolume(): number {
        let volume = (this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).minus(this.ap1n)).dividedBy(this.rateA12);
        return volume.toNumber();
    }

    computeOptimalVolume(): number {
        // Taking +ve root of derivative of ((ax / b + cx) - x)
        let a = this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1);
        let b = this.ap1n;
        let c = this.rateA12;
        let vol = ((a.multipliedBy(b)).sqrt().minus(b)).dividedBy(c);
        return vol.toNumber();
    }

    computeLiquidity(): number {
        let liquidity = this.apn1.multipliedBy(this.ap1n);
        return liquidity.toNumber();
    }

    computeSwapPrice(): number {
        let swap_price = (this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1)).dividedBy(this.ap1n);
        return swap_price.toNumber();
    }
}