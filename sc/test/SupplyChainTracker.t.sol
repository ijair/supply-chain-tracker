// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {SupplyChainTracker} from "../src/SupplyChainTracker.sol";

contract SupplyChainTrackerTest is Test {
    SupplyChainTracker public tracker;
    
    address public user = address(1);
    
    function setUp() public {
        tracker = new SupplyChainTracker();
    }
    
    function test_OwnerIsSet() public view {
        assertEq(tracker.owner(), address(this));
    }
    
    function test_InitialSupplyCount() public view {
        assertEq(tracker.totalSupplies(), 0);
    }
    
    function test_RegisterSupply() public {
        uint256 supplyId = tracker.registerSupply("Test Item", "Warehouse A");
        
        assertEq(supplyId, 1);
        assertEq(tracker.totalSupplies(), 1);
        
        SupplyChainTracker.SupplyItem memory item = tracker.getSupply(supplyId);
        
        assertEq(item.id, 1);
        assertEq(item.name, "Test Item");
        assertEq(item.location, "Warehouse A");
        assertEq(item.registeredBy, address(this));
        assertTrue(item.isActive);
    }
    
    function test_UpdateSupplyLocation() public {
        uint256 supplyId = tracker.registerSupply("Test Item", "Warehouse A");
        tracker.updateSupplyLocation(supplyId, "Warehouse B");
        
        SupplyChainTracker.SupplyItem memory item = tracker.getSupply(supplyId);
        assertEq(item.location, "Warehouse B");
        assertTrue(item.isActive);
    }
    
    function test_DeactivateSupply() public {
        uint256 supplyId = tracker.registerSupply("Test Item", "Warehouse A");
        tracker.deactivateSupply(supplyId);
        
        SupplyChainTracker.SupplyItem memory item = tracker.getSupply(supplyId);
        assertFalse(item.isActive);
    }
    
    function test_UpdateLocationFailsForNonexistentSupply() public {
        vm.expectRevert("Supply does not exist");
        tracker.updateSupplyLocation(999, "New Location");
    }
    
    function test_UpdateLocationFailsForInactiveSupply() public {
        uint256 supplyId = tracker.registerSupply("Test Item", "Warehouse A");
        tracker.deactivateSupply(supplyId);
        
        vm.expectRevert("Supply is not active");
        tracker.updateSupplyLocation(supplyId, "New Location");
    }
    
    function test_DeactivateFailsForNonexistentSupply() public {
        vm.expectRevert("Supply does not exist");
        tracker.deactivateSupply(999);
    }
    
    function test_DeactivateFailsForAlreadyInactiveSupply() public {
        uint256 supplyId = tracker.registerSupply("Test Item", "Warehouse A");
        tracker.deactivateSupply(supplyId);
        
        vm.expectRevert("Supply is already inactive");
        tracker.deactivateSupply(supplyId);
    }
    
    function test_MultipleSupplies() public {
        tracker.registerSupply("Item 1", "Location 1");
        tracker.registerSupply("Item 2", "Location 2");
        tracker.registerSupply("Item 3", "Location 3");
        
        assertEq(tracker.totalSupplies(), 3);
        
        uint256[] memory ids = tracker.getAllSupplyIds();
        assertEq(ids.length, 3);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
        assertEq(ids[2], 3);
    }
    
    function test_GetNonexistentSupply() public {
        vm.expectRevert("Supply does not exist");
        tracker.getSupply(999);
    }
}

