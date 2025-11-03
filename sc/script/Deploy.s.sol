// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {SupplyChainTracker} from "../src/SupplyChainTracker.sol";

/**
 * @title Deploy
 * @dev Deployment script for SupplyChainTracker contract
 */
contract Deploy is Script {
    function setUp() public {}
    
    function run() public returns (SupplyChainTracker) {
        vm.startBroadcast();
        
        // Deploy the SupplyChainTracker contract
        SupplyChainTracker tracker = new SupplyChainTracker();
        
        vm.stopBroadcast();
        
        return tracker;
    }
}

