// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title SupplyChainTracker
 * @dev Educational smart contract for tracking supplies on-chain
 * @notice Advanced supply chain tracking with user roles and moderation system
 */
contract SupplyChainTracker {
    // State variables
    address public owner;
    uint256 public totalSupplies;
    uint256 public totalUsers;
    
    // User status enumeration
    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }
    
    // User structure
    struct User {
        uint256 id;
        address userAddress;
        string role;
        UserStatus status;
    }
    
    // Supply item structure
    struct SupplyItem {
        uint256 id;
        string name;
        string location;
        uint256 timestamp;
        address registeredBy;
        bool isActive;
    }
    
    // Mappings
    mapping(address => User) public users;
    mapping(uint256 => SupplyItem) public supplies;
    mapping(string => bool) public validRoles;
    
    // Arrays
    address[] public userAddresses;
    uint256[] public supplyIds;
    
    // Events
    event UserRegistered(uint256 indexed id, address indexed userAddress, string role, UserStatus status);
    event UserStatusUpdated(uint256 indexed id, address indexed userAddress, UserStatus newStatus);
    event SupplyRegistered(uint256 indexed id, string name, address indexed registeredBy);
    event SupplyUpdated(uint256 indexed id, string newLocation);
    event SupplyDeactivated(uint256 indexed id);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyApprovedUser() {
        require(users[msg.sender].status == UserStatus.Approved, "User not approved");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        totalSupplies = 0;
        totalUsers = 0;
        
        // Initialize valid roles
        validRoles["Producer"] = true;
        validRoles["Factory"] = true;
        validRoles["Retailer"] = true;
        validRoles["Consumer"] = true;
        validRoles["Admin"] = true;
    }
    
    /**
     * @dev Register admin user (Owner only)
     * @param _adminAddress Address to register as admin
     * @return userId The ID of the newly registered admin
     */
    function registerAdmin(address _adminAddress) public onlyOwner returns (uint256) {
        require(users[_adminAddress].id == 0, "User already registered");
        
        totalUsers++;
        uint256 userId = totalUsers;
        
        users[_adminAddress] = User({
            id: userId,
            userAddress: _adminAddress,
            role: "Admin",
            status: UserStatus.Approved
        });
        
        userAddresses.push(_adminAddress);
        
        emit UserRegistered(userId, _adminAddress, "Admin", UserStatus.Approved);
        
        return userId;
    }
    
    /**
     * @dev Register a new user
     * @param _role User role (Producer, Factory, Retailer, Consumer)
     * @return userId The ID of the newly registered user
     */
    function registerUser(string memory _role) public returns (uint256) {
        require(users[msg.sender].id == 0, "User already registered");
        require(validRoles[_role], "Invalid role");
        require(keccak256(bytes(_role)) != keccak256(bytes("Admin")), "Cannot register as Admin");
        
        totalUsers++;
        uint256 userId = totalUsers;
        
        users[msg.sender] = User({
            id: userId,
            userAddress: msg.sender,
            role: _role,
            status: UserStatus.Pending
        });
        
        userAddresses.push(msg.sender);
        
        emit UserRegistered(userId, msg.sender, _role, UserStatus.Pending);
        
        return userId;
    }
    
    /**
     * @dev Update user status (Admin only)
     * @param _userAddress Address of the user to update
     * @param _newStatus New status for the user
     */
    function updateUserStatus(address _userAddress, UserStatus _newStatus) public onlyOwner {
        require(users[_userAddress].id != 0, "User does not exist");
        require(users[_userAddress].status != _newStatus, "Status unchanged");
        
        users[_userAddress].status = _newStatus;
        
        emit UserStatusUpdated(users[_userAddress].id, _userAddress, _newStatus);
    }
    
    /**
     * @dev Get user details
     * @param _userAddress Address of the user
     * @return User struct with all details
     */
    function getUser(address _userAddress) public view returns (User memory) {
        require(users[_userAddress].id != 0, "User does not exist");
        return users[_userAddress];
    }
    
    /**
     * @dev Get user status
     * @param _userAddress Address of the user
     * @return Current user status
     */
    function getUserStatus(address _userAddress) public view returns (UserStatus) {
        require(users[_userAddress].id != 0, "User does not exist");
        return users[_userAddress].status;
    }
    
    /**
     * @dev Check if user is approved
     * @param _userAddress Address of the user
     * @return True if user is approved, false otherwise
     */
    function isUserApproved(address _userAddress) public view returns (bool) {
        if (users[_userAddress].id == 0) return false;
        return users[_userAddress].status == UserStatus.Approved;
    }
    
    /**
     * @dev Get all user addresses (Admin only)
     * @return Array of all user addresses
     */
    function getAllUsers() public view onlyOwner returns (address[] memory) {
        return userAddresses;
    }
    
    /**
     * @dev Get total number of registered users
     * @return Total count of users
     */
    function getTotalUsers() public view returns (uint256) {
        return totalUsers;
    }
    
    /**
     * @dev Register a new supply item (Approved users only)
     * @param _name Name of the supply item
     * @param _location Current location of the supply
     * @return supplyId The ID of the newly registered supply
     */
    function registerSupply(string memory _name, string memory _location) 
        public 
        onlyApprovedUser
        returns (uint256) 
    {
        totalSupplies++;
        uint256 supplyId = totalSupplies;
        
        supplies[supplyId] = SupplyItem({
            id: supplyId,
            name: _name,
            location: _location,
            timestamp: block.timestamp,
            registeredBy: msg.sender,
            isActive: true
        });
        
        supplyIds.push(supplyId);
        
        emit SupplyRegistered(supplyId, _name, msg.sender);
        
        return supplyId;
    }
    
    /**
     * @dev Update the location of an existing supply (Approved users only)
     * @param _id Supply ID to update
     * @param _newLocation New location of the supply
     */
    function updateSupplyLocation(uint256 _id, string memory _newLocation) 
        public 
        onlyApprovedUser 
    {
        require(supplies[_id].id != 0, "Supply does not exist");
        require(supplies[_id].isActive, "Supply is not active");
        
        supplies[_id].location = _newLocation;
        
        emit SupplyUpdated(_id, _newLocation);
    }
    
    /**
     * @dev Deactivate a supply item (Approved users only)
     * @param _id Supply ID to deactivate
     */
    function deactivateSupply(uint256 _id) public onlyApprovedUser {
        require(supplies[_id].id != 0, "Supply does not exist");
        require(supplies[_id].isActive, "Supply is already inactive");
        
        supplies[_id].isActive = false;
        
        emit SupplyDeactivated(_id);
    }
    
    /**
     * @dev Get supply item details
     * @param _id Supply ID
     * @return SupplyItem struct with all details
     */
    function getSupply(uint256 _id) public view returns (SupplyItem memory) {
        require(supplies[_id].id != 0, "Supply does not exist");
        return supplies[_id];
    }
    
    /**
     * @dev Get total number of registered supplies
     * @return Total count of supplies
     */
    function getTotalSupplies() public view returns (uint256) {
        return totalSupplies;
    }
    
    /**
     * @dev Get all supply IDs
     * @return Array of all supply IDs
     */
    function getAllSupplyIds() public view returns (uint256[] memory) {
        return supplyIds;
    }
}
