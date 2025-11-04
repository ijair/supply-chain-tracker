// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {SupplyChainTracker} from "../src/SupplyChainTracker.sol";

contract SupplyChainTrackerTest is Test {
    SupplyChainTracker public tracker;
    
    address public owner;
    address public producer;
    address public factory;
    address public retailer;
    address public consumer;
    
    function setUp() public {
        owner = address(this);
        producer = address(1);
        factory = address(2);
        retailer = address(3);
        consumer = address(4);
        
        tracker = new SupplyChainTracker();
    }
    
    // Owner tests
    function test_OwnerIsSet() public view {
        assertEq(tracker.owner(), owner);
    }
    
    // Initial state tests
    function test_InitialCounts() public view {
        assertEq(tracker.totalSupplies(), 0);
        assertEq(tracker.totalUsers(), 0);
    }
    
    // User registration tests
    function test_RegisterProducer() public {
        vm.prank(producer);
        uint256 userId = tracker.registerUser("Producer");
        
        assertEq(userId, 1);
        assertEq(tracker.totalUsers(), 1);
        
        SupplyChainTracker.User memory user = tracker.getUser(producer);
        assertEq(user.id, 1);
        assertEq(user.userAddress, producer);
        assertEq(user.role, "Producer");
        assertEq(uint256(user.status), uint256(SupplyChainTracker.UserStatus.Pending));
    }
    
    function test_RegisterMultipleUsers() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        vm.prank(retailer);
        tracker.registerUser("Retailer");
        
        vm.prank(consumer);
        tracker.registerUser("Consumer");
        
        assertEq(tracker.totalUsers(), 4);
    }
    
    function test_RegisterDuplicateUserFails() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(producer);
        vm.expectRevert("User already registered");
        tracker.registerUser("Producer");
    }
    
    function test_RegisterInvalidRoleFails() public {
        vm.prank(producer);
        vm.expectRevert("Invalid role");
        tracker.registerUser("InvalidRole");
    }
    
    function test_RegisterAdminRoleFails() public {
        vm.prank(producer);
        vm.expectRevert("Cannot register as Admin");
        tracker.registerUser("Admin");
    }
    
    function test_RegisterAdmin() public {
        address admin = address(0x123);
        uint256 userId = tracker.registerAdmin(admin);
        
        assertEq(userId, 1);
        assertEq(tracker.totalUsers(), 1);
        
        SupplyChainTracker.User memory user = tracker.getUser(admin);
        assertEq(user.id, 1);
        assertEq(user.userAddress, admin);
        assertEq(user.role, "Admin");
        assertEq(uint256(user.status), uint256(SupplyChainTracker.UserStatus.Approved));
        assertTrue(tracker.isUserApproved(admin));
    }
    
    function test_OnlyOwnerCanRegisterAdmin() public {
        vm.prank(producer);
        vm.expectRevert("Not authorized");
        tracker.registerAdmin(producer);
    }
    
    function test_IsUserApprovedReturnsFalseForPending() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        assertFalse(tracker.isUserApproved(producer));
    }
    
    // User approval tests
    function test_ApproveUser() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        SupplyChainTracker.User memory user = tracker.getUser(producer);
        assertEq(uint256(user.status), uint256(SupplyChainTracker.UserStatus.Approved));
        assertTrue(tracker.isUserApproved(producer));
    }
    
    function test_RejectUser() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Rejected);
        
        SupplyChainTracker.User memory user = tracker.getUser(producer);
        assertEq(uint256(user.status), uint256(SupplyChainTracker.UserStatus.Rejected));
        assertFalse(tracker.isUserApproved(producer));
    }
    
    function test_OnlyOwnerCanUpdateUserStatus() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        vm.expectRevert("Not authorized");
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
    }
    
    function test_UpdateNonexistentUserFails() public {
        vm.expectRevert("User does not exist");
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
    }
    
    function test_GetAllUsers() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        address[] memory allUsers = tracker.getAllUsers();
        assertEq(allUsers.length, 2);
        assertEq(allUsers[0], producer);
        assertEq(allUsers[1], factory);
    }
    
    function test_OnlyOwnerCanGetAllUsers() public {
        vm.prank(producer);
        vm.expectRevert("Not authorized");
        tracker.getAllUsers();
    }
    
    // Supply tests with approved user
    function test_RegisterSupplyRequiresApprovedUser() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(producer);
        vm.expectRevert("User not approved");
        tracker.registerSupply("Test Item", "Warehouse A");
    }
    
    function test_RegisterSupplyWithApprovedUser() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 supplyId = tracker.registerSupply("Test Item", "Warehouse A");
        
        assertEq(supplyId, 1);
        assertEq(tracker.totalSupplies(), 1);
        
        SupplyChainTracker.SupplyItem memory item = tracker.getSupply(supplyId);
        
        assertEq(item.id, 1);
        assertEq(item.name, "Test Item");
        assertEq(item.location, "Warehouse A");
        assertEq(item.registeredBy, producer);
        assertTrue(item.isActive);
    }
    
    function test_UpdateSupplyLocationWithApprovedUser() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 supplyId = tracker.registerSupply("Test Item", "Warehouse A");
        
        vm.prank(producer);
        tracker.updateSupplyLocation(supplyId, "Warehouse B");
        
        SupplyChainTracker.SupplyItem memory item = tracker.getSupply(supplyId);
        assertEq(item.location, "Warehouse B");
        assertTrue(item.isActive);
    }
    
    function test_DeactivateSupplyWithApprovedUser() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 supplyId = tracker.registerSupply("Test Item", "Warehouse A");
        
        vm.prank(producer);
        tracker.deactivateSupply(supplyId);
        
        SupplyChainTracker.SupplyItem memory item = tracker.getSupply(supplyId);
        assertFalse(item.isActive);
    }
    
    function test_UpdateLocationFailsForNonexistentSupply() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        vm.expectRevert("Supply does not exist");
        tracker.updateSupplyLocation(999, "New Location");
    }
    
    function test_UpdateLocationFailsForInactiveSupply() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 supplyId = tracker.registerSupply("Test Item", "Warehouse A");
        
        vm.prank(producer);
        tracker.deactivateSupply(supplyId);
        
        vm.prank(producer);
        vm.expectRevert("Supply is not active");
        tracker.updateSupplyLocation(supplyId, "New Location");
    }
    
    function test_MultipleSuppliesFromMultipleUsers() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        tracker.registerSupply("Item 1", "Location 1");
        
        vm.prank(factory);
        tracker.registerSupply("Item 2", "Location 2");
        
        assertEq(tracker.totalSupplies(), 2);
    }
    
    function test_GetNonexistentSupply() public {
        vm.expectRevert("Supply does not exist");
        tracker.getSupply(999);
    }
    
    function test_GetNonexistentUser() public {
        vm.expectRevert("User does not exist");
        tracker.getUser(producer);
    }
    
    function test_GetUserStatusNonexistentUser() public {
        vm.expectRevert("User does not exist");
        tracker.getUserStatus(producer);
    }
    
    function test_IsUserApprovedNonexistentUser() public view {
        assertFalse(tracker.isUserApproved(producer));
    }
}
