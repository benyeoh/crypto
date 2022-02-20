"use strict";
exports.__esModule = true;
exports.CPMM = void 0;
var bignumber_js_1 = require("bignumber.js");
var CPMM = /** @class */ (function () {
    function CPMM(tokenPath) {
        this.computeVariables(tokenPath);
    }
    CPMM.prototype.computeVariables = function (tokenPath) {
        var tokenInfo = tokenPath[1]["node"];
        var pairInfo = tokenPath[1]["edge"];
        var reserve1 = new bignumber_js_1.BigNumber(pairInfo.token1Reserve);
        var reserve2 = new bignumber_js_1.BigNumber(pairInfo.token2Reserve);
        var rateA = new bignumber_js_1.BigNumber(pairInfo.rateA);
        var rateB = new bignumber_js_1.BigNumber(pairInfo.rateB);
        if (tokenInfo.name === pairInfo.token1.name) {
            // Swap order
            var tmpReserve = reserve1;
            reserve1 = reserve2;
            reserve2 = tmpReserve;
        }
        // See formula in paper
        var ann_1 = reserve2;
        var an_1n = reserve1;
        this.apn1 = ann_1;
        this.ap1n = an_1n;
        this.rateAn_1n = rateA;
        this.rateBn_1n = rateB;
        var rateAn_2n_1, rateBn_2n_1;
        this.rateA12 = rateA;
        var slicedPath = tokenPath.slice(2);
        for (var i = 0; i < slicedPath.length; i++) {
            var pathNode = slicedPath[i];
            tokenInfo = pathNode["node"];
            pairInfo = pathNode["edge"];
            reserve1 = new bignumber_js_1.BigNumber(pairInfo.token1Reserve);
            reserve2 = new bignumber_js_1.BigNumber(pairInfo.token2Reserve);
            rateA = new bignumber_js_1.BigNumber(pairInfo.rateA);
            rateB = new bignumber_js_1.BigNumber(pairInfo.rateB);
            if (tokenInfo.name === pairInfo.token1.name) {
                // Swap order
                var tmpReserve = reserve1;
                reserve1 = reserve2;
                reserve2 = tmpReserve;
            }
            ann_1 = reserve2;
            an_1n = reserve1;
            rateAn_2n_1 = this.rateAn_1n;
            rateBn_2n_1 = this.rateBn_1n;
            this.rateAn_1n = rateA;
            this.rateBn_1n = rateB;
            var ap_denom = an_1n.plus(this.rateAn_1n.multipliedBy(rateAn_2n_1.div(this.rateA12)).multipliedBy(rateBn_2n_1).multipliedBy(this.apn1));
            var apn1_numer = this.apn1.multipliedBy(ann_1).multipliedBy(rateBn_2n_1).multipliedBy(rateAn_2n_1);
            this.apn1 = apn1_numer.dividedBy(ap_denom);
            var ap1n_numer = this.ap1n.multipliedBy(an_1n);
            this.ap1n = ap1n_numer.dividedBy(ap_denom);
        }
    };
    CPMM.prototype.computeDelta = function (volume) {
        var numer = this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).multipliedBy(volume);
        var denom = this.ap1n.plus(this.rateA12.multipliedBy(volume));
        return (numer.dividedBy(denom)).minus(volume).toNumber();
    };
    CPMM.prototype.computeMaxVolume = function () {
        var volume = (this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1).minus(this.ap1n)).dividedBy(this.rateA12);
        return volume.toNumber();
    };
    CPMM.prototype.computeOptimalVolume = function () {
        // Taking +ve root of derivative of ((ax / b + cx) - x)
        var a = this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1);
        var b = this.ap1n;
        var c = this.rateA12;
        var vol = ((a.multipliedBy(b)).sqrt().minus(b)).dividedBy(c);
        return vol.toNumber();
    };
    CPMM.prototype.computeLiquidity = function () {
        var liquidity = this.apn1.multipliedBy(this.ap1n);
        return liquidity.toNumber();
    };
    CPMM.prototype.computeSwapPrice = function () {
        var swap_price = (this.rateAn_1n.multipliedBy(this.rateBn_1n).multipliedBy(this.apn1)).dividedBy(this.ap1n);
        return swap_price.toNumber();
    };
    return CPMM;
}());
exports.CPMM = CPMM;
