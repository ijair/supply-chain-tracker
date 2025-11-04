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
        assertEq(tracker.getTotalProductTokens(), 0);
        assertEq(tracker.totalUsers(), 0);
        assertEq(tracker.getTotalTransfers(), 0);
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
    
    // ProductToken tests
    function test_CreateProductTokenRequiresApprovedUser() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(producer);
        vm.expectRevert("User not approved");
        tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
    }
    
    function test_CreateProductTokenWithApprovedUser() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 tokenId = tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
        
        assertEq(tokenId, 1);
        assertEq(tracker.getTotalProductTokens(), 1);
        assertEq(tracker.getTokenBalance(tokenId, producer), 100);
        assertEq(tracker.getTokenTotalSupply(tokenId), 100);
        
        SupplyChainTracker.ProductToken memory token = tracker.getProductToken(tokenId);
        assertEq(token.id, 1);
        assertEq(token.creator, producer);
        assertEq(token.metadata, "{\"name\":\"Test Product\"}");
        assertEq(token.parentId, 0);
        assertTrue(token.isActive);
    }
    
    function test_CreateProductTokenWithParentId() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        // Producer creates initial product
        vm.prank(producer);
        uint256 parentTokenId = tracker.createProductToken("{\"name\":\"Raw Material\"}", 0, 50);
        
        // Transfer some tokens to factory
        vm.prank(producer);
        uint256 transferId = tracker.createTransferRequest(parentTokenId, factory, 25);
        
        vm.prank(factory);
        tracker.acceptTransfer(transferId);
        
        // Factory creates new product using parent tokens
        vm.prank(factory);
        uint256 childTokenId = tracker.createProductToken("{\"name\":\"Processed Product\"}", parentTokenId, 20);
        
        assertEq(childTokenId, 2);
        assertEq(tracker.getTokenBalance(parentTokenId, factory), 5); // 25 - 20 = 5 remaining
        assertEq(tracker.getTokenBalance(childTokenId, factory), 20);
    }
    
    function test_CreateProductTokenWithParentIdFailsInsufficientBalance() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 parentTokenId = tracker.createProductToken("{\"name\":\"Raw Material\"}", 0, 50);
        
        vm.prank(producer);
        vm.expectRevert("Insufficient parent token balance");
        tracker.createProductToken("{\"name\":\"Processed Product\"}", parentTokenId, 100);
    }
    
    function test_CreateProductTokenWithInvalidParentId() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        vm.expectRevert("Parent token does not exist");
        tracker.createProductToken("{\"name\":\"Test Product\"}", 999, 100);
    }
    
    function test_CreateProductTokenWithZeroAmountFails() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        vm.expectRevert("Amount must be greater than 0");
        tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 0);
    }
    
    function test_GetNonexistentProductToken() public {
        vm.expectRevert("Product token does not exist");
        tracker.getProductToken(999);
    }
    
    // Transfer tests
    function test_CreateTransferRequest() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 tokenId = tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
        
        vm.prank(producer);
        uint256 transferId = tracker.createTransferRequest(tokenId, factory, 50);
        
        assertEq(transferId, 1);
        assertEq(tracker.getTokenBalance(tokenId, producer), 50); // Locked 50 tokens
        assertEq(tracker.getTokenBalance(tokenId, factory), 0);
        
        SupplyChainTracker.Transfer memory transfer = tracker.getTransfer(transferId);
        assertEq(transfer.id, 1);
        assertEq(transfer.tokenId, tokenId);
        assertEq(transfer.from, producer);
        assertEq(transfer.to, factory);
        assertEq(transfer.amount, 50);
        assertEq(uint256(transfer.status), uint256(SupplyChainTracker.TransferStatus.Pending));
    }
    
    function test_AcceptTransfer() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 tokenId = tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
        
        vm.prank(producer);
        uint256 transferId = tracker.createTransferRequest(tokenId, factory, 50);
        
        vm.prank(factory);
        tracker.acceptTransfer(transferId);
        
        assertEq(tracker.getTokenBalance(tokenId, producer), 50);
        assertEq(tracker.getTokenBalance(tokenId, factory), 50);
        
        SupplyChainTracker.Transfer memory transfer = tracker.getTransfer(transferId);
        assertEq(uint256(transfer.status), uint256(SupplyChainTracker.TransferStatus.Accepted));
        assertGt(transfer.responseTimestamp, 0);
    }
    
    function test_RejectTransfer() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 tokenId = tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
        
        vm.prank(producer);
        uint256 transferId = tracker.createTransferRequest(tokenId, factory, 50);
        
        vm.prank(factory);
        tracker.rejectTransfer(transferId);
        
        assertEq(tracker.getTokenBalance(tokenId, producer), 100); // Tokens returned
        assertEq(tracker.getTokenBalance(tokenId, factory), 0);
        
        SupplyChainTracker.Transfer memory transfer = tracker.getTransfer(transferId);
        assertEq(uint256(transfer.status), uint256(SupplyChainTracker.TransferStatus.Rejected));
    }
    
    function test_OnlyDestinationCanAcceptTransfer() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 tokenId = tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
        
        vm.prank(producer);
        uint256 transferId = tracker.createTransferRequest(tokenId, factory, 50);
        
        vm.prank(producer);
        vm.expectRevert("Only destination can accept");
        tracker.acceptTransfer(transferId);
    }
    
    function test_OnlyDestinationCanRejectTransfer() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 tokenId = tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
        
        vm.prank(producer);
        uint256 transferId = tracker.createTransferRequest(tokenId, factory, 50);
        
        vm.prank(producer);
        vm.expectRevert("Only destination can reject");
        tracker.rejectTransfer(transferId);
    }
    
    function test_CreateTransferRequestFailsInsufficientBalance() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 tokenId = tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
        
        vm.prank(producer);
        vm.expectRevert("Insufficient balance");
        tracker.createTransferRequest(tokenId, factory, 150);
    }
    
    function test_GetPendingTransfers() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 tokenId = tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
        
        vm.prank(producer);
        uint256 transferId1 = tracker.createTransferRequest(tokenId, factory, 50);
        
        vm.prank(producer);
        uint256 transferId2 = tracker.createTransferRequest(tokenId, factory, 30);
        
        uint256[] memory pending = tracker.getPendingTransfers(factory);
        assertEq(pending.length, 2);
        assertEq(pending[0], transferId1);
        assertEq(pending[1], transferId2);
    }
    
    function test_GetTokenTransactionHistory() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        uint256 tokenId = tracker.createProductToken("{\"name\":\"Test Product\"}", 0, 100);
        
        vm.prank(producer);
        uint256 transferId = tracker.createTransferRequest(tokenId, factory, 50);
        
        vm.prank(factory);
        tracker.acceptTransfer(transferId);
        
        uint256[] memory history = tracker.getTokenTransactionHistory(tokenId);
        assertEq(history.length, 1);
        assertEq(history[0], transferId);
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
    
    // getApprovedUsersByRole tests
    function test_GetApprovedUsersByRoleRequiresApprovedUser() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(producer);
        vm.expectRevert("User not approved");
        tracker.getApprovedUsersByRole("Factory");
    }
    
    function test_GetApprovedUsersByRole() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        address factory2 = address(0x10);
        vm.prank(factory2);
        tracker.registerUser("Factory");
        
        // Approve users
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory2, SupplyChainTracker.UserStatus.Approved);
        
        // Get approved Factory users
        vm.prank(producer);
        address[] memory factoryUsers = tracker.getApprovedUsersByRole("Factory");
        
        assertEq(factoryUsers.length, 2);
        assertTrue(factoryUsers[0] == factory || factoryUsers[0] == factory2);
        assertTrue(factoryUsers[1] == factory || factoryUsers[1] == factory2);
    }
    
    function test_GetApprovedUsersByRoleOnlyReturnsApproved() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        vm.prank(factory);
        tracker.registerUser("Factory");
        
        address factory2 = address(0x10);
        vm.prank(factory2);
        tracker.registerUser("Factory");
        
        // Approve only producer and one factory
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(factory, SupplyChainTracker.UserStatus.Approved);
        // factory2 remains pending
        
        // Get approved Factory users
        vm.prank(producer);
        address[] memory factoryUsers = tracker.getApprovedUsersByRole("Factory");
        
        assertEq(factoryUsers.length, 1);
        assertEq(factoryUsers[0], factory);
    }
    
    function test_GetApprovedUsersByRoleEmptyResult() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        // Get Factory users (none exist)
        vm.prank(producer);
        address[] memory factoryUsers = tracker.getApprovedUsersByRole("Factory");
        
        assertEq(factoryUsers.length, 0);
    }
    
    function test_GetApprovedUsersByRoleInvalidRole() public {
        vm.prank(producer);
        tracker.registerUser("Producer");
        
        tracker.updateUserStatus(producer, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(producer);
        vm.expectRevert("Invalid role");
        tracker.getApprovedUsersByRole("InvalidRole");
    }
    
    function test_GetApprovedUsersByRoleConsumer() public {
        vm.prank(retailer);
        tracker.registerUser("Retailer");
        
        vm.prank(consumer);
        tracker.registerUser("Consumer");
        
        address consumer2 = address(0x20);
        vm.prank(consumer2);
        tracker.registerUser("Consumer");
        
        tracker.updateUserStatus(retailer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(consumer, SupplyChainTracker.UserStatus.Approved);
        tracker.updateUserStatus(consumer2, SupplyChainTracker.UserStatus.Approved);
        
        vm.prank(retailer);
        address[] memory consumers = tracker.getApprovedUsersByRole("Consumer");
        
        assertEq(consumers.length, 2);
    }
}
