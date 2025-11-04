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
        // Start broadcasting transactions
        vm.startBroadcast();
        
        // Deploy the SupplyChainTracker contract
        SupplyChainTracker tracker = new SupplyChainTracker();
        
        // Register the deployer (user0 from Anvil) as admin
        // User0 is the first test account provided by Anvil
        // Using tx.origin to get the actual deployer address
        address deployer = tx.origin;
        tracker.registerAdmin(deployer);
        
        vm.stopBroadcast();
        
        return tracker;
    }
}

