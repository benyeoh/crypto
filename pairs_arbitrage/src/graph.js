"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.updateGraphFromPairs = exports.Graph = exports.Node = exports.Edge = void 0;
var Edge = /** @class */ (function () {
    function Edge() {
    }
    return Edge;
}());
exports.Edge = Edge;
var Node = /** @class */ (function () {
    function Node() {
    }
    return Node;
}());
exports.Node = Node;
var Graph = /** @class */ (function () {
    function Graph() {
        this.nodes = new Map();
        this.edges = new Map();
        this.peggedNodes = new Map();
    }
    return Graph;
}());
exports.Graph = Graph;
function updateGraphFromPairs(pairsInfo, graph) {
    var nodes = graph.nodes;
    var edges = graph.edges;
    var peggedNodes = graph.peggedNodes;
    var networkID = pairsInfo.name + " (" + pairsInfo.network + ")";
    for (var i = 0; i < pairsInfo.pairs.length; i++) {
        var pair = pairsInfo.pairs[i];
        var edgeID = pair["token1"].name + "/" + pair["token2"].name + " @ " + networkID;
        var edge = edges.get(edgeID);
        if (!edge) {
            var nodeA = nodes.get(pair["token1"].name);
            var nodeB = nodes.get(pair["token2"].name);
            if (!nodeA) {
                nodeA = {
                    data: { name: pair["token1"].name, peg: pair["token1"].peg },
                    edges: new Array()
                };
                nodes.set(pair["token1"].name, nodeA);
                if (nodeA.data.peg !== null) {
                    var peggedNodeArray = peggedNodes.get(nodeA.data.peg);
                    if (!peggedNodeArray) {
                        peggedNodeArray = [];
                        peggedNodes.set(nodeA.data.peg, peggedNodeArray);
                    }
                    peggedNodeArray.push(nodeA);
                }
            }
            if (!nodeB) {
                nodeB = {
                    data: { name: pair["token2"].name, peg: pair["token2"].peg },
                    edges: new Array()
                };
                nodes.set(pair["token2"].name, nodeB);
                if (nodeB.data.peg !== null) {
                    var peggedNodeArray = peggedNodes.get(nodeB.data.peg);
                    if (!peggedNodeArray) {
                        peggedNodeArray = [];
                        peggedNodes.set(nodeB.data.peg, peggedNodeArray);
                    }
                    peggedNodeArray.push(nodeB);
                }
            }
            var edgePair = __assign({}, pairsInfo.pairs[i]);
            edgePair["exchangeID"] = networkID;
            edge = {
                nodeA: nodeA,
                nodeB: nodeB,
                data: edgePair
            };
            edges.set(edgeID, edge);
            nodeA.edges.push(edge);
            nodeB.edges.push(edge);
        }
    }
}
exports.updateGraphFromPairs = updateGraphFromPairs;
