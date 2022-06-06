"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
exports.BFSCycleTraverser = void 0;
var FastPriorityQueue = require("fastpriorityqueue");
var PathNode = /** @class */ (function () {
    function PathNode() {
    }
    return PathNode;
}());
var Traverser = /** @class */ (function () {
    function Traverser() {
    }
    Traverser.prototype.onStartTraverse = function (graph, startNodeID) {
    };
    Traverser.prototype.onEndTraverse = function (graph, startNodeID) {
    };
    Traverser.prototype.traverse = function (graph, startNodeID) {
        if (!graph.nodes.has(startNodeID)) {
            throw Error("Node ".concat(startNodeID, " does not exist!"));
        }
        this.onStartTraverse(graph, startNodeID);
        var queue = new FastPriorityQueue(function (a, b) { return a.costsSoFar < b.costsSoFar; });
        var newPath = {
            prev: null,
            edge: null,
            node: graph.nodes.get(startNodeID),
            costsSoFar: 0,
            userData: null,
            depth: 0
        };
        // For now we force the 1st node to always be the same startNodeID
        // although we can probably just use the pegged nodes as well
        var curPath = newPath;
        for (var i = 0; i < curPath.node.edges.length; i++) {
            var edge = curPath.node.edges[i];
            var nextNode = edge.nodeA;
            if (curPath.node === edge.nodeA) {
                nextNode = edge.nodeB;
            }
            var _a = this.onTraverse(curPath, nextNode, edge), cost = _a.cost, userData = _a.userData;
            if (cost !== null) {
                newPath = {
                    prev: curPath,
                    edge: edge,
                    node: nextNode,
                    costsSoFar: curPath.costsSoFar + cost,
                    userData: userData,
                    depth: curPath.depth + 1
                };
                queue.add(newPath);
            }
        }
        // queue.add(newPath);
        while (!queue.isEmpty()) {
            curPath = queue.poll();
            var curNodeInclPegs = void 0;
            if (curPath.node.data.peg) {
                // This includes all pegged nodes, incl the original
                curNodeInclPegs = graph.peggedNodes.get(curPath.node.data.peg);
            }
            else {
                curNodeInclPegs = [curPath.node];
            }
            for (var n = 0; n < curNodeInclPegs.length; n++) {
                var curNode = curNodeInclPegs[n];
                for (var i = 0; i < curNode.edges.length; i++) {
                    var edge = curNode.edges[i];
                    var nextNode = edge.nodeA;
                    if (curNode === edge.nodeA) {
                        nextNode = edge.nodeB;
                    }
                    var _b = this.onTraverse(curPath, nextNode, edge), cost = _b.cost, userData = _b.userData;
                    if (cost !== null) {
                        newPath = {
                            prev: curPath,
                            edge: edge,
                            node: nextNode,
                            costsSoFar: curPath.costsSoFar + cost,
                            userData: userData,
                            depth: curPath.depth + 1
                        };
                        queue.add(newPath);
                    }
                }
            }
        }
        this.onEndTraverse(graph, startNodeID);
    };
    return Traverser;
}());
var BFSCycleTraverser = /** @class */ (function (_super) {
    __extends(BFSCycleTraverser, _super);
    function BFSCycleTraverser(maxDepth) {
        if (maxDepth === void 0) { maxDepth = 3; }
        var _this = _super.call(this) || this;
        if (isNaN(maxDepth)) {
            throw Error("Invalid maxDepth: ".concat(maxDepth));
        }
        _this.maxDepth = maxDepth;
        return _this;
    }
    BFSCycleTraverser.prototype.onStartTraverse = function (graph, startNodeID) {
        this.paths = [];
    };
    BFSCycleTraverser.prototype.onTraverse = function (curPath, toNode, edge) {
        var startPath = curPath;
        while (startPath.prev !== null) {
            if (startPath.node === toNode || edge === startPath.edge) {
                // Illegal cycle detected
                return { cost: null, userData: null };
            }
            startPath = startPath.prev;
        }
        if ((startPath.node === toNode) ||
            (startPath.node.data.peg !== null && toNode.data.peg !== null && startPath.node.data.peg === toNode.data.peg)) {
            if (curPath.depth !== 0) {
                // Store valid path
                var flattenedPath = [];
                flattenedPath[curPath.depth + 1] = { node: toNode.data, edge: edge.data };
                var path = curPath;
                while (path.prev !== null) {
                    flattenedPath[path.depth] = { node: path.node.data, edge: path.edge.data };
                    path = path.prev;
                }
                flattenedPath[0] = { node: path.node.data, edge: null };
                this.paths.push(flattenedPath);
            }
            // End path
            return { cost: null, userData: null };
        }
        // Don't expand further after maxDepth
        if (curPath.depth >= this.maxDepth - 1) {
            return { cost: null, userData: null };
        }
        return { cost: curPath.depth + 1, userData: null };
    };
    return BFSCycleTraverser;
}(Traverser));
exports.BFSCycleTraverser = BFSCycleTraverser;
