# Continue with backend product token functionality
_Exported on 11/4/2025 at 01:38:48 EST from Cursor (2.0.54)_

---

**User**

Ok now that the point 3 looks good (for now), we can continue with the next point (4) on the @project-plan.md 

Backend Product Token Functionality, also i need you to create a git ignore file and add all the directories that we dont want to push to the repository.

---

**Cursor**


Reviewing the smart contract and project structure. Then implementing the Backend Product Token Functionality (point 4) and creating a .gitignore file.


Checking existing .gitignore files and OpenZeppelin ERC20 contracts:


Reading the ERC20 contract and checking the project structure:


Implementing point 4 (Backend Product Token Functionality) and creating a root .gitignore. Creating the initial task list:


Creating the root .gitignore, then implementing ProductToken functionality:


```ignore
# Dependencies
node_modules/
**/node_modules/

# Build outputs
**/out/
**/build/
**/dist/
**/.next/

# Cache directories
**/cache/
**/.cache/

# Logs
*.log
**/*.log
anvil.log
anvil.pid

# Environment files
.env
.env.local
.env.*.local
**/.env
**/.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Testing
coverage/
**/coverage/

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Vercel
.vercel/

# Backups
**/backups/

# Broadcast and deployment artifacts (keep structure but ignore content)
**/broadcast/*/run-*.json
!**/broadcast/*/run-latest.json

# Foundry specific
**/lib/.git
**/lib/.github

# Screenshots (optional - uncomment if you don't want to track screenshots)
# screenshots/

```

Updating the contract to implement ProductToken functionality:


```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title SupplyChainTracker
 * @dev Educational smart contract for tracking supplies on-chain
 * @notice Advanced supply chain tracking with user roles, product tokens, and transfer system
 */
contract SupplyChainTracker {
    // State variables
    address public owner;
    uint256 public totalProductTokens;
    uint256 public totalUsers;
    uint256 public totalTransfers;
    
    // User status enumeration
    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }
    
    // Transfer status enumeration
    enum TransferStatus {
        Pending,
        Accepted,
        Rejected
    }
    
    // User structure
    struct User {
        uint256 id;
        address userAddress;
        string role;
        UserStatus status;
    }
    
    // ProductToken structure - replaces SupplyItem
    struct ProductToken {
        uint256 id;
        address creator;
        string metadata; // JSON string for product features
        uint256 parentId; // 0 if no parent, otherwise parent product ID
        uint256 timestamp;
        bool isActive;
    }
    
    // Transfer structure
    struct Transfer {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        uint256 amount;
        TransferStatus status;
        uint256 requestTimestamp;
        uint256 responseTimestamp;
    }
    
    // Mappings
    mapping(address => User) public users;
    mapping(uint256 => ProductToken) public productTokens;
    mapping(string => bool) public validRoles;
    
    // Token balances: mapping(tokenId => mapping(address => balance))
    mapping(uint256 => mapping(address => uint256)) public balances;
    
    // Token total supply: mapping(tokenId => totalSupply)
    mapping(uint256 => uint256) public tokenTotalSupply;
    
    // Transfers: mapping(transferId => Transfer)
    mapping(uint256 => Transfer) public transfers;
    
    // Pending transfers by address: mapping(address => transferId[])
    mapping(address => uint256[]) public pendingTransfersByAddress;
    
    // Transaction history by token: mapping(tokenId => transferId[])
    mapping(uint256 => uint256[]) public tokenTransactionHistory;
    
    // Arrays
    address[] public userAddresses;
    uint256[] public productTokenIds;
    uint256[] public transferIds;
    
    // Events
    event UserRegistered(uint256 indexed id, address indexed userAddress, string role, UserStatus status);
    event UserStatusUpdated(uint256 indexed id, address indexed userAddress, UserStatus newStatus);
    event ProductTokenCreated(uint256 indexed tokenId, address indexed creator, string metadata, uint256 parentId);
    event TransferRequestCreated(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    event TransferAccepted(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    event TransferRejected(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    
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

```

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title SupplyChainTracker
 * @dev Educational smart contract for tracking supplies on-chain
 * @notice Advanced supply chain tracking with user roles, product tokens, and transfer system
 */
contract SupplyChainTracker {
    // State variables
    address public owner;
    uint256 public totalProductTokens;
    uint256 public totalUsers;
    uint256 public totalTransfers;
    
    // User status enumeration
    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }
    
    // Transfer status enumeration
    enum TransferStatus {
        Pending,
        Accepted,
        Rejected
    }
    
    // User structure
    struct User {
        uint256 id;
        address userAddress;
        string role;
        UserStatus status;
    }
    
    // ProductToken structure - replaces SupplyItem
    struct ProductToken {
        uint256 id;
        address creator;
        string metadata; // JSON string for product features
        uint256 parentId; // 0 if no parent, otherwise parent product ID
        uint256 timestamp;
        bool isActive;
    }
    
    // Transfer structure
    struct Transfer {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        uint256 amount;
        TransferStatus status;
        uint256 requestTimestamp;
        uint256 responseTimestamp;
    }
    
    // Mappings
    mapping(address => User) public users;
    mapping(uint256 => ProductToken) public productTokens;
    mapping(string => bool) public validRoles;
    
    // Token balances: mapping(tokenId => mapping(address => balance))
    mapping(uint256 => mapping(address => uint256)) public balances;
    
    // Token total supply: mapping(tokenId => totalSupply)
    mapping(uint256 => uint256) public tokenTotalSupply;
    
    // Transfers: mapping(transferId => Transfer)
    mapping(uint256 => Transfer) public transfers;
    
    // Pending transfers by address: mapping(address => transferId[])
    mapping(address => uint256[]) public pendingTransfersByAddress;
    
    // Transaction history by token: mapping(tokenId => transferId[])
    mapping(uint256 => uint256[]) public tokenTransactionHistory;
    
    // Arrays
    address[] public userAddresses;
    uint256[] public productTokenIds;
    uint256[] public transferIds;
    
    // Events
    event UserRegistered(uint256 indexed id, address indexed userAddress, string role, UserStatus status);
    event UserStatusUpdated(uint256 indexed id, address indexed userAddress, UserStatus newStatus);
    event ProductTokenCreated(uint256 indexed tokenId, address indexed creator, string metadata, uint256 parentId);
    event TransferRequestCreated(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    event TransferAccepted(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    event TransferRejected(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    
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
        totalProductTokens = 0;
        totalUsers = 0;
        totalTransfers = 0;
        
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

```

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title SupplyChainTracker
 * @dev Educational smart contract for tracking supplies on-chain
 * @notice Advanced supply chain tracking with user roles, product tokens, and transfer system
 */
contract SupplyChainTracker {
    // State variables
    address public owner;
    uint256 public totalProductTokens;
    uint256 public totalUsers;
    uint256 public totalTransfers;
    
    // User status enumeration
    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }
    
    // Transfer status enumeration
    enum TransferStatus {
        Pending,
        Accepted,
        Rejected
    }
    
    // User structure
    struct User {
        uint256 id;
        address userAddress;
        string role;
        UserStatus status;
    }
    
    // ProductToken structure - replaces SupplyItem
    struct ProductToken {
        uint256 id;
        address creator;
        string metadata; // JSON string for product features
        uint256 parentId; // 0 if no parent, otherwise parent product ID
        uint256 timestamp;
        bool isActive;
    }
    
    // Transfer structure
    struct Transfer {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        uint256 amount;
        TransferStatus status;
        uint256 requestTimestamp;
        uint256 responseTimestamp;
    }
    
    // Mappings
    mapping(address => User) public users;
    mapping(uint256 => ProductToken) public productTokens;
    mapping(string => bool) public validRoles;
    
    // Token balances: mapping(tokenId => mapping(address => balance))
    mapping(uint256 => mapping(address => uint256)) public balances;
    
    // Token total supply: mapping(tokenId => totalSupply)
    mapping(uint256 => uint256) public tokenTotalSupply;
    
    // Transfers: mapping(transferId => Transfer)
    mapping(uint256 => Transfer) public transfers;
    
    // Pending transfers by address: mapping(address => transferId[])
    mapping(address => uint256[]) public pendingTransfersByAddress;
    
    // Transaction history by token: mapping(tokenId => transferId[])
    mapping(uint256 => uint256[]) public tokenTransactionHistory;
    
    // Arrays
    address[] public userAddresses;
    uint256[] public productTokenIds;
    uint256[] public transferIds;
    
    // Events
    event UserRegistered(uint256 indexed id, address indexed userAddress, string role, UserStatus status);
    event UserStatusUpdated(uint256 indexed id, address indexed userAddress, UserStatus newStatus);
    event ProductTokenCreated(uint256 indexed tokenId, address indexed creator, string metadata, uint256 parentId);
    event TransferRequestCreated(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    event TransferAccepted(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    event TransferRejected(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount);
    
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
        totalProductTokens = 0;
        totalUsers = 0;
        totalTransfers = 0;
        
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
    
    // ==================== ProductToken Functions ====================
    
    /**
     * @dev Create a new product token (Approved users only)
     * @param _metadata JSON string containing product features
     * @param _parentId Parent product ID (0 if no parent)
     * @param _amount Initial amount of tokens to mint
     * @return tokenId The ID of the newly created product token
     */
    function createProductToken(
        string memory _metadata,
        uint256 _parentId,
        uint256 _amount
    ) 
        public 
        onlyApprovedUser
        returns (uint256) 
    {
        require(_amount > 0, "Amount must be greater than 0");
        
        // If parentId is provided, validate it exists and user has balance
        if (_parentId > 0) {
            require(productTokens[_parentId].id != 0, "Parent token does not exist");
            require(productTokens[_parentId].isActive, "Parent token is not active");
            require(balances[_parentId][msg.sender] >= _amount, "Insufficient parent token balance");
            
            // Update parent token balance (deduct from inventory)
            balances[_parentId][msg.sender] -= _amount;
        }
        
        // Calculate next sequential token ID
        totalProductTokens++;
        uint256 tokenId = totalProductTokens;
        
        // Create product token
        productTokens[tokenId] = ProductToken({
            id: tokenId,
            creator: msg.sender,
            metadata: _metadata,
            parentId: _parentId,
            timestamp: block.timestamp,
            isActive: true
        });
        
        // Mint tokens to creator
        balances[tokenId][msg.sender] += _amount;
        tokenTotalSupply[tokenId] += _amount;
        
        productTokenIds.push(tokenId);
        
        emit ProductTokenCreated(tokenId, msg.sender, _metadata, _parentId);
        
        return tokenId;
    }
    
    /**
     * @dev Get product token details
     * @param _tokenId Token ID
     * @return ProductToken struct with all details
     */
    function getProductToken(uint256 _tokenId) public view returns (ProductToken memory) {
        require(productTokens[_tokenId].id != 0, "Product token does not exist");
        return productTokens[_tokenId];
    }
    
    /**
     * @dev Get token balance for an address
     * @param _tokenId Token ID
     * @param _address Address to check balance
     * @return Balance amount
     */
    function getTokenBalance(uint256 _tokenId, address _address) public view returns (uint256) {
        return balances[_tokenId][_address];
    }
    
    /**
     * @dev Get total supply of a token
     * @param _tokenId Token ID
     * @return Total supply amount
     */
    function getTokenTotalSupply(uint256 _tokenId) public view returns (uint256) {
        return tokenTotalSupply[_tokenId];
    }
    
    /**
     * @dev Get total number of product tokens
     * @return Total count of product tokens
     */
    function getTotalProductTokens() public view returns (uint256) {
        return totalProductTokens;
    }
    
    /**
     * @dev Get all product token IDs
     * @return Array of all product token IDs
     */
    function getAllProductTokenIds() public view returns (uint256[] memory) {
        return productTokenIds;
    }
    
    // ==================== Transfer Functions ====================
    
    /**
     * @dev Create a transfer request (Approved users only)
     * @param _tokenId Token ID to transfer
     * @param _to Destination address
     * @param _amount Amount of tokens to transfer
     * @return transferId The ID of the newly created transfer request
     */
    function createTransferRequest(
        uint256 _tokenId,
        address _to,
        uint256 _amount
    )
        public
        onlyApprovedUser
        returns (uint256)
    {
        require(productTokens[_tokenId].id != 0, "Product token does not exist");
        require(productTokens[_tokenId].isActive, "Product token is not active");
        require(_to != address(0), "Invalid destination address");
        require(_to != msg.sender, "Cannot transfer to yourself");
        require(_amount > 0, "Amount must be greater than 0");
        require(balances[_tokenId][msg.sender] >= _amount, "Insufficient balance");
        require(users[_to].id != 0, "Destination user does not exist");
        require(users[_to].status == UserStatus.Approved, "Destination user not approved");
        
        // Calculate next sequential transfer ID
        totalTransfers++;
        uint256 transferId = totalTransfers;
        
        // Create transfer request
        transfers[transferId] = Transfer({
            id: transferId,
            tokenId: _tokenId,
            from: msg.sender,
            to: _to,
            amount: _amount,
            status: TransferStatus.Pending,
            requestTimestamp: block.timestamp,
            responseTimestamp: 0
        });
        
        // Lock tokens (subtract from sender's balance temporarily)
        balances[_tokenId][msg.sender] -= _amount;
        
        // Add to pending transfers lists
        pendingTransfersByAddress[_to].push(transferId);
        transferIds.push(transferId);
        
        emit TransferRequestCreated(transferId, _tokenId, msg.sender, _to, _amount);
        
        return transferId;
    }
    
    /**
     * @dev Accept a transfer request (Only destination address)
     * @param _transferId Transfer ID to accept
     */
    function acceptTransfer(uint256 _transferId) public {
        Transfer storage transfer = transfers[_transferId];
        require(transfer.id != 0, "Transfer does not exist");
        require(transfer.to == msg.sender, "Only destination can accept");
        require(transfer.status == TransferStatus.Pending, "Transfer not pending");
        
        // Update transfer status
        transfer.status = TransferStatus.Accepted;
        transfer.responseTimestamp = block.timestamp;
        
        // Transfer tokens to destination
        balances[transfer.tokenId][transfer.to] += transfer.amount;
        
        // Add to transaction history
        tokenTransactionHistory[transfer.tokenId].push(_transferId);
        
        emit TransferAccepted(
            _transferId,
            transfer.tokenId,
            transfer.from,
            transfer.to,
            transfer.amount
        );
    }
    
    /**
     * @dev Reject a transfer request (Only destination address)
     * @param _transferId Transfer ID to reject
     */
    function rejectTransfer(uint256 _transferId) public {
        Transfer storage transfer = transfers[_transferId];
        require(transfer.id != 0, "Transfer does not exist");
        require(transfer.to == msg.sender, "Only destination can reject");
        require(transfer.status == TransferStatus.Pending, "Transfer not pending");
        
        // Update transfer status
        transfer.status = TransferStatus.Rejected;
        transfer.responseTimestamp = block.timestamp;
        
        // Return tokens to sender
        balances[transfer.tokenId][transfer.from] += transfer.amount;
        
        emit TransferRejected(
            _transferId,
            transfer.tokenId,
            transfer.from,
            transfer.to,
            transfer.amount
        );
    }
    
    /**
     * @dev Get transfer details
     * @param _transferId Transfer ID
     * @return Transfer struct with all details
     */
    function getTransfer(uint256 _transferId) public view returns (Transfer memory) {
        require(transfers[_transferId].id != 0, "Transfer does not exist");
        return transfers[_transferId];
    }
    
    /**
     * @dev Get all pending transfers for an address
     * @param _address Address to get pending transfers for
     * @return Array of transfer IDs
     */
    function getPendingTransfers(address _address) public view returns (uint256[] memory) {
        return pendingTransfersByAddress[_address];
    }
    
    /**
     * @dev Get transaction chain history for a product token
     * @param _tokenId Token ID
     * @return Array of transfer IDs representing the transaction history
     */
    function getTokenTransactionHistory(uint256 _tokenId) public view returns (uint256[] memory) {
        return tokenTransactionHistory[_tokenId];
    }
    
    /**
     * @dev Get total number of transfers
     * @return Total count of transfers
     */
    function getTotalTransfers() public view returns (uint256) {
        return totalTransfers;
    }
}

```

Checking for compilation issues and updating tests:


Updating the tests to cover the new ProductToken functionality:


Updating the tests to cover the new ProductToken functionality:


```solidity
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

```

```solidity
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
}

```

Running tests to verify the implementation:


Fixing event definitions: removing extra indexed parameters (Solidity allows up to 3 indexed per event).


```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title SupplyChainTracker
 * @dev Educational smart contract for tracking supplies on-chain
 * @notice Advanced supply chain tracking with user roles, product tokens, and transfer system
 */
contract SupplyChainTracker {
    // State variables
    address public owner;
    uint256 public totalProductTokens;
    uint256 public totalUsers;
    uint256 public totalTransfers;
    
    // User status enumeration
    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }
    
    // Transfer status enumeration
    enum TransferStatus {
        Pending,
        Accepted,
        Rejected
    }
    
    // User structure
    struct User {
        uint256 id;
        address userAddress;
        string role;
        UserStatus status;
    }
    
    // ProductToken structure - replaces SupplyItem
    struct ProductToken {
        uint256 id;
        address creator;
        string metadata; // JSON string for product features
        uint256 parentId; // 0 if no parent, otherwise parent product ID
        uint256 timestamp;
        bool isActive;
    }
    
    // Transfer structure
    struct Transfer {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        uint256 amount;
        TransferStatus status;
        uint256 requestTimestamp;
        uint256 responseTimestamp;
    }
    
    // Mappings
    mapping(address => User) public users;
    mapping(uint256 => ProductToken) public productTokens;
    mapping(string => bool) public validRoles;
    
    // Token balances: mapping(tokenId => mapping(address => balance))
    mapping(uint256 => mapping(address => uint256)) public balances;
    
    // Token total supply: mapping(tokenId => totalSupply)
    mapping(uint256 => uint256) public tokenTotalSupply;
    
    // Transfers: mapping(transferId => Transfer)
    mapping(uint256 => Transfer) public transfers;
    
    // Pending transfers by address: mapping(address => transferId[])
    mapping(address => uint256[]) public pendingTransfersByAddress;
    
    // Transaction history by token: mapping(tokenId => transferId[])
    mapping(uint256 => uint256[]) public tokenTransactionHistory;
    
    // Arrays
    address[] public userAddresses;
    uint256[] public productTokenIds;
    uint256[] public transferIds;
    
    // Events
    event UserRegistered(uint256 indexed id, address indexed userAddress, string role, UserStatus status);
    event UserStatusUpdated(uint256 indexed id, address indexed userAddress, UserStatus newStatus);
    event ProductTokenCreated(uint256 indexed tokenId, address indexed creator, string metadata, uint256 parentId);
    event TransferRequestCreated(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address to, uint256 amount);
    event TransferAccepted(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address to, uint256 amount);
    event TransferRejected(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address to, uint256 amount);
    
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
        totalProductTokens = 0;
        totalUsers = 0;
        totalTransfers = 0;
        
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
    
    // ==================== ProductToken Functions ====================
    
    /**
     * @dev Create a new product token (Approved users only)
     * @param _metadata JSON string containing product features
     * @param _parentId Parent product ID (0 if no parent)
     * @param _amount Initial amount of tokens to mint
     * @return tokenId The ID of the newly created product token
     */
    function createProductToken(
        string memory _metadata,
        uint256 _parentId,
        uint256 _amount
    ) 
        public 
        onlyApprovedUser
        returns (uint256) 
    {
        require(_amount > 0, "Amount must be greater than 0");
        
        // If parentId is provided, validate it exists and user has balance
        if (_parentId > 0) {
            require(productTokens[_parentId].id != 0, "Parent token does not exist");
            require(productTokens[_parentId].isActive, "Parent token is not active");
            require(balances[_parentId][msg.sender] >= _amount, "Insufficient parent token balance");
            
            // Update parent token balance (deduct from inventory)
            balances[_parentId][msg.sender] -= _amount;
        }
        
        // Calculate next sequential token ID
        totalProductTokens++;
        uint256 tokenId = totalProductTokens;
        
        // Create product token
        productTokens[tokenId] = ProductToken({
            id: tokenId,
            creator: msg.sender,
            metadata: _metadata,
            parentId: _parentId,
            timestamp: block.timestamp,
            isActive: true
        });
        
        // Mint tokens to creator
        balances[tokenId][msg.sender] += _amount;
        tokenTotalSupply[tokenId] += _amount;
        
        productTokenIds.push(tokenId);
        
        emit ProductTokenCreated(tokenId, msg.sender, _metadata, _parentId);
        
        return tokenId;
    }
    
    /**
     * @dev Get product token details
     * @param _tokenId Token ID
     * @return ProductToken struct with all details
     */
    function getProductToken(uint256 _tokenId) public view returns (ProductToken memory) {
        require(productTokens[_tokenId].id != 0, "Product token does not exist");
        return productTokens[_tokenId];
    }
    
    /**
     * @dev Get token balance for an address
     * @param _tokenId Token ID
     * @param _address Address to check balance
     * @return Balance amount
     */
    function getTokenBalance(uint256 _tokenId, address _address) public view returns (uint256) {
        return balances[_tokenId][_address];
    }
    
    /**
     * @dev Get total supply of a token
     * @param _tokenId Token ID
     * @return Total supply amount
     */
    function getTokenTotalSupply(uint256 _tokenId) public view returns (uint256) {
        return tokenTotalSupply[_tokenId];
    }
    
    /**
     * @dev Get total number of product tokens
     * @return Total count of product tokens
     */
    function getTotalProductTokens() public view returns (uint256) {
        return totalProductTokens;
    }
    
    /**
     * @dev Get all product token IDs
     * @return Array of all product token IDs
     */
    function getAllProductTokenIds() public view returns (uint256[] memory) {
        return productTokenIds;
    }
    
    // ==================== Transfer Functions ====================
    
    /**
     * @dev Create a transfer request (Approved users only)
     * @param _tokenId Token ID to transfer
     * @param _to Destination address
     * @param _amount Amount of tokens to transfer
     * @return transferId The ID of the newly created transfer request
     */
    function createTransferRequest(
        uint256 _tokenId,
        address _to,
        uint256 _amount
    )
        public
        onlyApprovedUser
        returns (uint256)
    {
        require(productTokens[_tokenId].id != 0, "Product token does not exist");
        require(productTokens[_tokenId].isActive, "Product token is not active");
        require(_to != address(0), "Invalid destination address");
        require(_to != msg.sender, "Cannot transfer to yourself");
        require(_amount > 0, "Amount must be greater than 0");
        require(balances[_tokenId][msg.sender] >= _amount, "Insufficient balance");
        require(users[_to].id != 0, "Destination user does not exist");
        require(users[_to].status == UserStatus.Approved, "Destination user not approved");
        
        // Calculate next sequential transfer ID
        totalTransfers++;
        uint256 transferId = totalTransfers;
        
        // Create transfer request
        transfers[transferId] = Transfer({
            id: transferId,
            tokenId: _tokenId,
            from: msg.sender,
            to: _to,
            amount: _amount,
            status: TransferStatus.Pending,
            requestTimestamp: block.timestamp,
            responseTimestamp: 0
        });
        
        // Lock tokens (subtract from sender's balance temporarily)
        balances[_tokenId][msg.sender] -= _amount;
        
        // Add to pending transfers lists
        pendingTransfersByAddress[_to].push(transferId);
        transferIds.push(transferId);
        
        emit TransferRequestCreated(transferId, _tokenId, msg.sender, _to, _amount);
        
        return transferId;
    }
    
    /**
     * @dev Accept a transfer request (Only destination address)
     * @param _transferId Transfer ID to accept
     */
    function acceptTransfer(uint256 _transferId) public {
        Transfer storage transfer = transfers[_transferId];
        require(transfer.id != 0, "Transfer does not exist");
        require(transfer.to == msg.sender, "Only destination can accept");
        require(transfer.status == TransferStatus.Pending, "Transfer not pending");
        
        // Update transfer status
        transfer.status = TransferStatus.Accepted;
        transfer.responseTimestamp = block.timestamp;
        
        // Transfer tokens to destination
        balances[transfer.tokenId][transfer.to] += transfer.amount;
        
        // Add to transaction history
        tokenTransactionHistory[transfer.tokenId].push(_transferId);
        
        emit TransferAccepted(
            _transferId,
            transfer.tokenId,
            transfer.from,
            transfer.to,
            transfer.amount
        );
    }
    
    /**
     * @dev Reject a transfer request (Only destination address)
     * @param _transferId Transfer ID to reject
     */
    function rejectTransfer(uint256 _transferId) public {
        Transfer storage transfer = transfers[_transferId];
        require(transfer.id != 0, "Transfer does not exist");
        require(transfer.to == msg.sender, "Only destination can reject");
        require(transfer.status == TransferStatus.Pending, "Transfer not pending");
        
        // Update transfer status
        transfer.status = TransferStatus.Rejected;
        transfer.responseTimestamp = block.timestamp;
        
        // Return tokens to sender
        balances[transfer.tokenId][transfer.from] += transfer.amount;
        
        emit TransferRejected(
            _transferId,
            transfer.tokenId,
            transfer.from,
            transfer.to,
            transfer.amount
        );
    }
    
    /**
     * @dev Get transfer details
     * @param _transferId Transfer ID
     * @return Transfer struct with all details
     */
    function getTransfer(uint256 _transferId) public view returns (Transfer memory) {
        require(transfers[_transferId].id != 0, "Transfer does not exist");
        return transfers[_transferId];
    }
    
    /**
     * @dev Get all pending transfers for an address
     * @param _address Address to get pending transfers for
     * @return Array of transfer IDs
     */
    function getPendingTransfers(address _address) public view returns (uint256[] memory) {
        return pendingTransfersByAddress[_address];
    }
    
    /**
     * @dev Get transaction chain history for a product token
     * @param _tokenId Token ID
     * @return Array of transfer IDs representing the transaction history
     */
    function getTokenTransactionHistory(uint256 _tokenId) public view returns (uint256[] memory) {
        return tokenTransactionHistory[_tokenId];
    }
    
    /**
     * @dev Get total number of transfers
     * @return Total count of transfers
     */
    function getTotalTransfers() public view returns (uint256) {
        return totalTransfers;
    }
}

```

All tests passed. Finalizing the todos:


## Completed tasks

### 1. Created root .gitignore
Added a root `.gitignore` that excludes:
- `node_modules/`, build outputs, cache directories
- Log files, environment files, IDE files
- OS-specific files
- Foundry-specific artifacts

### 2. Implemented ProductToken functionality
- Replaced `SupplyItem` with `ProductToken`
- Added `ProductToken` struct with:
  - Sequential IDs
  - Metadata JSON string for product features
  - Parent ID support (for products created from other products)
  - Creator address and timestamps
- Implemented ERC20-like balance tracking per token ID per address
- Added inventory management: when a product is created using a parent product, the parent balance is deducted

### 3. Transfer request system
- Created `Transfer` struct with status tracking (Pending, Accepted, Rejected)
- Implemented `createTransferRequest()` — locks tokens when a request is created
- Implemented `acceptTransfer()` — only the destination can accept
- Implemented `rejectTransfer()` — only the destination can reject, returns tokens to sender
- Added validation for transfers (approved users, sufficient balance, etc.)

### 4. Transaction history tracking
- Added `getTokenTransactionHistory()` to get the full chain history for a product token
- Added `getPendingTransfers()` to list all pending transfers for an address
- All transfers are tracked and stored in the transaction history

### 5. Updated tests
- Replaced old supply tests with ProductToken tests
- Added tests for:
  - Token creation (with and without parent)
  - Transfer requests (create, accept, reject)
  - Balance tracking and inventory management
  - Transaction history
  - Edge cases and error handling
- All 34 tests passing

The contract now supports the full workflow described in point 4 of the project plan, including token creation, transfer requests, and transaction history tracking.

---

**User**

Una vez mas intento hacer el deployment del contrato utilizando @deploy.sh sin embargo como resultado me dice succesfuly completed  con el numero de contrato 0x5b73c5498c1e3b4dba84de0f1833c4a029d90519 el cual tambien es actualizado en la informacion del frontend en contracts, pero cuando hago cast code 0x5b73c5498c1e3b4dba84de0f1833c4a029d90519 la respuesta es 0X, soluciona el shellscript para que esto no vuelva a suceder  

---

**Cursor**


El contrato no se está desplegando realmente. Revisando el script de deployment y corrigiéndolo para que verifique el despliegue:


Corrigiendo el script de deployment para verificar que el contrato esté realmente desplegado usando `cast code` y mejorando la extracción de la dirección del contrato:


```shellscript
#!/bin/bash

# Deployment Script for Supply Chain Tracker
# This script deploys the SupplyChainTracker contract to Anvil

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ANVIL_HOST="${ANVIL_HOST:-127.0.0.1}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
RPC_URL="http://$ANVIL_HOST:$ANVIL_PORT"
CONTRACT_NAME="${CONTRACT_NAME:-SupplyChainTracker}"
ARTIFACTS_DIR="../web/src/contracts"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if Anvil is running
check_anvil_running() {
    if ! curl -s $RPC_URL > /dev/null 2>&1; then
        print_error "Anvil is not running on $RPC_URL"
        print_error "Please start Anvil first: ./scripts/anvil.sh start"
        exit 1
    fi
}

# Function to verify contract is deployed
verify_contract_deployed() {
    local address=$1
    if [ -z "$address" ] || [ "$address" == "null" ] || [ "$address" == "" ]; then
        return 1
    fi
    
    # Check if cast is available
    if ! command -v cast &> /dev/null; then
        print_warning "cast command not found, skipping bytecode verification"
        return 0
    fi
    
    # Get contract bytecode
    BYTECODE=$(cast code "$address" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
    
    # Check if bytecode is not empty (0x means no code)
    if [ -z "$BYTECODE" ] || [ "$BYTECODE" == "0x" ] || [ "$BYTECODE" == "" ]; then
        print_error "Contract verification failed: No bytecode found at address $address"
        return 1
    fi
    
    # Check if bytecode has reasonable length (at least 100 chars for constructor + contract)
    BYTECODE_LENGTH=${#BYTECODE}
    if [ "$BYTECODE_LENGTH" -lt 100 ]; then
        print_error "Contract verification failed: Bytecode too short (likely not a contract)"
        return 1
    fi
    
    print_status "Contract verified: Bytecode found (${BYTECODE_LENGTH} chars)"
    return 0
}

# Function to extract contract address from broadcast logs
extract_contract_address() {
    local broadcast_log=$1
    
    if [ ! -f "$broadcast_log" ]; then
        return 1
    fi
    
    # Try multiple methods to extract contract address
    local address=""
    
    # Method 1: Look for contractAddress in transactions
    if command -v jq &> /dev/null; then
        address=$(jq -r '.transactions[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        
        # Method 2: Look for contractAddress in receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.receipts[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
        
        # Method 3: Look for createdContractAddress in transaction receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.transactions[] | select(.transaction.type == "CREATE") | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
    fi
    
    if [ -n "$address" ] && [ "$address" != "null" ] && [ "$address" != "" ]; then
        echo "$address"
        return 0
    fi
    
    return 1
}

# Function to deploy contract
deploy_contract() {
    print_status "Deploying $CONTRACT_NAME to $RPC_URL..."
    
    cd "$(dirname "$0")/.."
    
    # Default user0 private key from Anvil
    USER0_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    DEPLOYER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    
    # Clean previous broadcast logs to avoid confusion
    if [ -d "broadcast/Deploy.s.sol" ]; then
        print_status "Cleaning previous broadcast logs..."
        rm -rf broadcast/Deploy.s.sol/*
    fi
    
    # Deploy using forge script
    print_status "Running forge script..."
    DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
        --rpc-url "$RPC_URL" \
        --broadcast \
        --private-key "$USER0_PRIVATE_KEY" \
        -vvv 2>&1)
    
    DEPLOY_EXIT_CODE=$?
    
    if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
        print_error "Forge script failed with exit code $DEPLOY_EXIT_CODE"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    # Wait a moment for the transaction to be mined
    sleep 2
    
    # Extract contract address from broadcast logs
    CONTRACT_ADDRESS=""
    BROADCAST_LOG=$(find broadcast/Deploy.s.sol -name "run-latest.json" -type f 2>/dev/null | head -1)
    
    if [ -n "$BROADCAST_LOG" ] && [ -f "$BROADCAST_LOG" ]; then
        print_status "Extracting contract address from broadcast log: $BROADCAST_LOG"
        CONTRACT_ADDRESS=$(extract_contract_address "$BROADCAST_LOG")
    fi
    
    # Fallback: Try to extract from deployment output
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ]; then
        print_warning "Could not extract address from broadcast log, trying output..."
        CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -i "deployed" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "$DEPLOY_OUTPUT" | grep -i "contract" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "")
    fi
    
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ] || [ "$CONTRACT_ADDRESS" == "" ]; then
        print_error "Failed to extract contract address from deployment"
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract address extracted: $CONTRACT_ADDRESS"
    
    # Verify contract is actually deployed
    print_status "Verifying contract deployment..."
    if ! verify_contract_deployed "$CONTRACT_ADDRESS"; then
        print_error "Contract deployment verification failed!"
        print_error "The address $CONTRACT_ADDRESS does not contain contract code."
        print_error "This usually means:"
        print_error "  1. The transaction failed but was not detected"
        print_error "  2. The wrong address was extracted"
        print_error "  3. Anvil is not running or responding correctly"
        echo ""
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract deployed and verified successfully!"
    echo ""
    print_status "Contract Name: $CONTRACT_NAME"
    print_status "Contract Address: $CONTRACT_ADDRESS"
    print_status "Network: Anvil (Chain ID: 31337)"
    echo ""
    
    
    print_status "Admin User (user0) registered: $DEPLOYER_ADDRESS"
    print_status "Role: Admin (Approved)"
    echo ""
    
    # Create contracts directory if it doesn't exist
    mkdir -p "$ARTIFACTS_DIR"
    
    # Copy ABI to frontend first
    if [ -f "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" ]; then
        cp "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" "$ARTIFACTS_DIR/"
        print_status "Contract ABI copied to $ARTIFACTS_DIR/"
        
        # Extract ABI from the JSON file for the config
        if command -v jq &> /dev/null; then
            ABI=$(cat "$ARTIFACTS_DIR/$CONTRACT_NAME.json" | jq -c '.abi' 2>/dev/null || echo "[]")
        else
            ABI="[]"
        fi
    else
        print_warning "ABI file not found: out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json"
        ABI="[]"
    fi
    
    # Extract ABI to separate file if possible
    if [ -f "$ARTIFACTS_DIR/$CONTRACT_NAME.json" ] && command -v python3 &> /dev/null; then
        python3 -c "import sys, json; data=json.load(open('$ARTIFACTS_DIR/$CONTRACT_NAME.json')); json.dump(data['abi'], open('$ARTIFACTS_DIR/abi.json', 'w'), indent=2)" 2>/dev/null
        if [ -f "$ARTIFACTS_DIR/abi.json" ]; then
            ABI_IMPORT="import abi from './abi.json';"
            ABI_REF="abi"
            print_status "ABI extracted to separate file: abi.json"
        fi
    fi
    
    # Fallback: inline ABI if extraction failed
    if [ -z "$ABI_IMPORT" ]; then
        ABI_IMPORT=""
        if [ -n "$ABI" ]; then
            ABI_REF="$ABI"
        else
            ABI_REF="[]"
        fi
    fi
    
    # Generate TypeScript contract configuration
    cat > "$ARTIFACTS_DIR/config.ts" <<EOF
// Auto-generated by deploy.sh
// DO NOT EDIT MANUALLY

$ABI_IMPORT

export const contractConfig = {
  address: "$CONTRACT_ADDRESS" as const,
  abi: ${ABI_REF},
  network: {
    name: "anvil" as const,
    chainId: 31337 as const,
  },
} as const;

// Contract artifacts location
export const CONTRACT_ABI_PATH = "./SupplyChainTracker.json";

// Export contract address for convenience
export const CONTRACT_ADDRESS = "$CONTRACT_ADDRESS" as const;

// Export ABI separately for convenience
export { abi };
EOF
    
    print_status "Contract configuration saved to $ARTIFACTS_DIR/config.ts"
    
    # Create network configuration for MetaMask
    cat > "$ARTIFACTS_DIR/network-config.json" <<EOF
{
  "chainId": "0x7A69",
  "chainName": "Anvil Local",
  "rpcUrls": ["$RPC_URL"],
  "nativeCurrency": {
    "name": "Ethereum",
    "symbol": "ETH",
    "decimals": 18
  },
  "blockExplorerUrls": []
}
EOF
    
    print_status "Network configuration saved to $ARTIFACTS_DIR/network-config.json"
    
    echo ""
    print_status "Deployment Summary:"
    echo "  Contract: $CONTRACT_ADDRESS"
    echo "  Network: Anvil Local"
    echo "  RPC: $RPC_URL"
    echo "  Admin (user0): $DEPLOYER_ADDRESS"
    echo ""
    print_warning "Add this network to MetaMask:"
    echo "  - Chain ID: 31337"
    echo "  - RPC URL: $RPC_URL"
    echo ""
    print_status "Admin credentials for testing:"
    echo "  Address: $DEPLOYER_ADDRESS"
    echo "  Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
}

# Function to verify deployment
verify_deployment() {
    if [ -z "$CONTRACT_ADDRESS" ]; then
        print_error "No contract address to verify"
        return
    fi
    
    print_status "Verifying contract deployment..."
    
    # Call owner() function to verify contract is working
    if forge script -c "owner()" \
       --rpc-url "$RPC_URL" \
       --broadcast \
       --target-contract "$CONTRACT_ADDRESS" > /dev/null 2>&1; then
        print_status "Contract verified and working!"
    else
        print_warning "Could not verify contract automatically"
    fi
}

# Main execution
main() {
    print_status "Supply Chain Tracker - Deployment Script"
    echo ""
    
    check_anvil_running
    deploy_contract
    verify_deployment
    
    echo ""
    print_status "Deployment completed successfully!"
}

main

exit 0


```

```shellscript
#!/bin/bash

# Deployment Script for Supply Chain Tracker
# This script deploys the SupplyChainTracker contract to Anvil

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ANVIL_HOST="${ANVIL_HOST:-127.0.0.1}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
RPC_URL="http://$ANVIL_HOST:$ANVIL_PORT"
CONTRACT_NAME="${CONTRACT_NAME:-SupplyChainTracker}"
ARTIFACTS_DIR="../web/src/contracts"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if Anvil is running
check_anvil_running() {
    if ! curl -s $RPC_URL > /dev/null 2>&1; then
        print_error "Anvil is not running on $RPC_URL"
        print_error "Please start Anvil first: ./scripts/anvil.sh start"
        exit 1
    fi
}

# Function to verify contract is deployed
verify_contract_deployed() {
    local address=$1
    if [ -z "$address" ] || [ "$address" == "null" ] || [ "$address" == "" ]; then
        return 1
    fi
    
    # Check if cast is available
    if ! command -v cast &> /dev/null; then
        print_warning "cast command not found, skipping bytecode verification"
        return 0
    fi
    
    # Get contract bytecode
    BYTECODE=$(cast code "$address" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
    
    # Check if bytecode is not empty (0x means no code)
    if [ -z "$BYTECODE" ] || [ "$BYTECODE" == "0x" ] || [ "$BYTECODE" == "" ]; then
        print_error "Contract verification failed: No bytecode found at address $address"
        return 1
    fi
    
    # Check if bytecode has reasonable length (at least 100 chars for constructor + contract)
    BYTECODE_LENGTH=${#BYTECODE}
    if [ "$BYTECODE_LENGTH" -lt 100 ]; then
        print_error "Contract verification failed: Bytecode too short (likely not a contract)"
        return 1
    fi
    
    print_status "Contract verified: Bytecode found (${BYTECODE_LENGTH} chars)"
    return 0
}

# Function to extract contract address from broadcast logs
extract_contract_address() {
    local broadcast_log=$1
    
    if [ ! -f "$broadcast_log" ]; then
        return 1
    fi
    
    # Try multiple methods to extract contract address
    local address=""
    
    # Method 1: Look for contractAddress in transactions
    if command -v jq &> /dev/null; then
        address=$(jq -r '.transactions[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        
        # Method 2: Look for contractAddress in receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.receipts[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
        
        # Method 3: Look for createdContractAddress in transaction receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.transactions[] | select(.transaction.type == "CREATE") | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
    fi
    
    if [ -n "$address" ] && [ "$address" != "null" ] && [ "$address" != "" ]; then
        echo "$address"
        return 0
    fi
    
    return 1
}

# Function to deploy contract
deploy_contract() {
    print_status "Deploying $CONTRACT_NAME to $RPC_URL..."
    
    cd "$(dirname "$0")/.."
    
    # Default user0 private key from Anvil
    USER0_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    DEPLOYER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    
    # Clean previous broadcast logs to avoid confusion
    if [ -d "broadcast/Deploy.s.sol" ]; then
        print_status "Cleaning previous broadcast logs..."
        rm -rf broadcast/Deploy.s.sol/*
    fi
    
    # Deploy using forge script
    print_status "Running forge script..."
    DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
        --rpc-url "$RPC_URL" \
        --broadcast \
        --private-key "$USER0_PRIVATE_KEY" \
        -vvv 2>&1)
    
    DEPLOY_EXIT_CODE=$?
    
    if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
        print_error "Forge script failed with exit code $DEPLOY_EXIT_CODE"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    # Wait a moment for the transaction to be mined
    sleep 2
    
    # Extract contract address from broadcast logs
    CONTRACT_ADDRESS=""
    BROADCAST_LOG=$(find broadcast/Deploy.s.sol -name "run-latest.json" -type f 2>/dev/null | head -1)
    
    if [ -n "$BROADCAST_LOG" ] && [ -f "$BROADCAST_LOG" ]; then
        print_status "Extracting contract address from broadcast log: $BROADCAST_LOG"
        CONTRACT_ADDRESS=$(extract_contract_address "$BROADCAST_LOG")
    fi
    
    # Fallback: Try to extract from deployment output
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ]; then
        print_warning "Could not extract address from broadcast log, trying output..."
        CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -i "deployed" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "$DEPLOY_OUTPUT" | grep -i "contract" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "")
    fi
    
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ] || [ "$CONTRACT_ADDRESS" == "" ]; then
        print_error "Failed to extract contract address from deployment"
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract address extracted: $CONTRACT_ADDRESS"
    
    # Verify contract is actually deployed
    print_status "Verifying contract deployment..."
    if ! verify_contract_deployed "$CONTRACT_ADDRESS"; then
        print_error "Contract deployment verification failed!"
        print_error "The address $CONTRACT_ADDRESS does not contain contract code."
        print_error "This usually means:"
        print_error "  1. The transaction failed but was not detected"
        print_error "  2. The wrong address was extracted"
        print_error "  3. Anvil is not running or responding correctly"
        echo ""
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract deployed and verified successfully!"
    echo ""
    print_status "Contract Name: $CONTRACT_NAME"
    print_status "Contract Address: $CONTRACT_ADDRESS"
    print_status "Network: Anvil (Chain ID: 31337)"
    echo ""
    
    
    print_status "Admin User (user0) registered: $DEPLOYER_ADDRESS"
    print_status "Role: Admin (Approved)"
    echo ""
    
    # Create contracts directory if it doesn't exist
    mkdir -p "$ARTIFACTS_DIR"
    
    # Copy ABI to frontend first
    if [ -f "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" ]; then
        cp "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" "$ARTIFACTS_DIR/"
        print_status "Contract ABI copied to $ARTIFACTS_DIR/"
        
        # Extract ABI from the JSON file for the config
        if command -v jq &> /dev/null; then
            ABI=$(cat "$ARTIFACTS_DIR/$CONTRACT_NAME.json" | jq -c '.abi' 2>/dev/null || echo "[]")
        else
            ABI="[]"
        fi
    else
        print_warning "ABI file not found: out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json"
        ABI="[]"
    fi
    
    # Extract ABI to separate file if possible
    if [ -f "$ARTIFACTS_DIR/$CONTRACT_NAME.json" ] && command -v python3 &> /dev/null; then
        python3 -c "import sys, json; data=json.load(open('$ARTIFACTS_DIR/$CONTRACT_NAME.json')); json.dump(data['abi'], open('$ARTIFACTS_DIR/abi.json', 'w'), indent=2)" 2>/dev/null
        if [ -f "$ARTIFACTS_DIR/abi.json" ]; then
            ABI_IMPORT="import abi from './abi.json';"
            ABI_REF="abi"
            print_status "ABI extracted to separate file: abi.json"
        fi
    fi
    
    # Fallback: inline ABI if extraction failed
    if [ -z "$ABI_IMPORT" ]; then
        ABI_IMPORT=""
        if [ -n "$ABI" ]; then
            ABI_REF="$ABI"
        else
            ABI_REF="[]"
        fi
    fi
    
    # Generate TypeScript contract configuration
    cat > "$ARTIFACTS_DIR/config.ts" <<EOF
// Auto-generated by deploy.sh
// DO NOT EDIT MANUALLY

$ABI_IMPORT

export const contractConfig = {
  address: "$CONTRACT_ADDRESS" as const,
  abi: ${ABI_REF},
  network: {
    name: "anvil" as const,
    chainId: 31337 as const,
  },
} as const;

// Contract artifacts location
export const CONTRACT_ABI_PATH = "./SupplyChainTracker.json";

// Export contract address for convenience
export const CONTRACT_ADDRESS = "$CONTRACT_ADDRESS" as const;

// Export ABI separately for convenience
export { abi };
EOF
    
    print_status "Contract configuration saved to $ARTIFACTS_DIR/config.ts"
    
    # Create network configuration for MetaMask
    cat > "$ARTIFACTS_DIR/network-config.json" <<EOF
{
  "chainId": "0x7A69",
  "chainName": "Anvil Local",
  "rpcUrls": ["$RPC_URL"],
  "nativeCurrency": {
    "name": "Ethereum",
    "symbol": "ETH",
    "decimals": 18
  },
  "blockExplorerUrls": []
}
EOF
    
    print_status "Network configuration saved to $ARTIFACTS_DIR/network-config.json"
    
    echo ""
    print_status "Deployment Summary:"
    echo "  Contract: $CONTRACT_ADDRESS"
    echo "  Network: Anvil Local"
    echo "  RPC: $RPC_URL"
    echo "  Admin (user0): $DEPLOYER_ADDRESS"
    echo ""
    print_warning "Add this network to MetaMask:"
    echo "  - Chain ID: 31337"
    echo "  - RPC URL: $RPC_URL"
    echo ""
    print_status "Admin credentials for testing:"
    echo "  Address: $DEPLOYER_ADDRESS"
    echo "  Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
}

# Function to verify deployment (contract functionality)
verify_deployment() {
    if [ -z "$CONTRACT_ADDRESS" ]; then
        print_error "No contract address to verify"
        return 1
    fi
    
    print_status "Verifying contract functionality..."
    
    # Verify contract owner using cast
    if command -v cast &> /dev/null; then
        # Try to call owner() function
        OWNER=$(cast call "$CONTRACT_ADDRESS" "owner()" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
        
        if [ -n "$OWNER" ] && [ "$OWNER" != "0x" ]; then
            print_status "Contract owner verified: $OWNER"
            return 0
        else
            print_warning "Could not verify contract owner (this may be normal if cast is not configured)"
        fi
    else
        print_warning "cast command not found, skipping functionality verification"
    fi
    
    return 0
}

# Main execution
main() {
    print_status "Supply Chain Tracker - Deployment Script"
    echo ""
    
    check_anvil_running
    deploy_contract
    verify_deployment
    
    echo ""
    print_status "Deployment completed successfully!"
}

main

exit 0


```

```shellscript
#!/bin/bash

# Deployment Script for Supply Chain Tracker
# This script deploys the SupplyChainTracker contract to Anvil

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ANVIL_HOST="${ANVIL_HOST:-127.0.0.1}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
RPC_URL="http://$ANVIL_HOST:$ANVIL_PORT"
CONTRACT_NAME="${CONTRACT_NAME:-SupplyChainTracker}"
ARTIFACTS_DIR="../web/src/contracts"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if Anvil is running
check_anvil_running() {
    if ! curl -s $RPC_URL > /dev/null 2>&1; then
        print_error "Anvil is not running on $RPC_URL"
        print_error "Please start Anvil first: ./scripts/anvil.sh start"
        exit 1
    fi
}

# Function to verify contract is deployed
verify_contract_deployed() {
    local address=$1
    if [ -z "$address" ] || [ "$address" == "null" ] || [ "$address" == "" ]; then
        return 1
    fi
    
    # Check if cast is available
    if ! command -v cast &> /dev/null; then
        print_warning "cast command not found, skipping bytecode verification"
        return 0
    fi
    
    # Get contract bytecode
    BYTECODE=$(cast code "$address" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
    
    # Check if bytecode is not empty (0x means no code)
    if [ -z "$BYTECODE" ] || [ "$BYTECODE" == "0x" ] || [ "$BYTECODE" == "" ]; then
        print_error "Contract verification failed: No bytecode found at address $address"
        return 1
    fi
    
    # Check if bytecode has reasonable length (at least 100 chars for constructor + contract)
    BYTECODE_LENGTH=${#BYTECODE}
    if [ "$BYTECODE_LENGTH" -lt 100 ]; then
        print_error "Contract verification failed: Bytecode too short (likely not a contract)"
        return 1
    fi
    
    print_status "Contract verified: Bytecode found (${BYTECODE_LENGTH} chars)"
    return 0
}

# Function to extract contract address from broadcast logs
extract_contract_address() {
    local broadcast_log=$1
    
    if [ ! -f "$broadcast_log" ]; then
        return 1
    fi
    
    # Try multiple methods to extract contract address
    local address=""
    
    # Method 1: Look for contractAddress in transactions
    if command -v jq &> /dev/null; then
        address=$(jq -r '.transactions[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        
        # Method 2: Look for contractAddress in receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.receipts[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
        
        # Method 3: Look for createdContractAddress in transaction receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.transactions[] | select(.transaction.type == "CREATE") | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
    fi
    
    if [ -n "$address" ] && [ "$address" != "null" ] && [ "$address" != "" ]; then
        echo "$address"
        return 0
    fi
    
    return 1
}

# Function to deploy contract
deploy_contract() {
    print_status "Deploying $CONTRACT_NAME to $RPC_URL..."
    
    cd "$(dirname "$0")/.."
    
    # Default user0 private key from Anvil
    USER0_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    DEPLOYER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    
    # Clean previous broadcast logs to avoid confusion
    if [ -d "broadcast/Deploy.s.sol" ]; then
        print_status "Cleaning previous broadcast logs..."
        rm -rf broadcast/Deploy.s.sol/*
    fi
    
    # Deploy using forge script
    print_status "Running forge script..."
    DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
        --rpc-url "$RPC_URL" \
        --broadcast \
        --private-key "$USER0_PRIVATE_KEY" \
        -vvv 2>&1)
    
    DEPLOY_EXIT_CODE=$?
    
    if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
        print_error "Forge script failed with exit code $DEPLOY_EXIT_CODE"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    # Wait a moment for the transaction to be mined
    sleep 2
    
    # Extract contract address from broadcast logs
    CONTRACT_ADDRESS=""
    BROADCAST_LOG=$(find broadcast/Deploy.s.sol -name "run-latest.json" -type f 2>/dev/null | head -1)
    
    if [ -n "$BROADCAST_LOG" ] && [ -f "$BROADCAST_LOG" ]; then
        print_status "Extracting contract address from broadcast log: $BROADCAST_LOG"
        CONTRACT_ADDRESS=$(extract_contract_address "$BROADCAST_LOG")
    fi
    
    # Fallback: Try to extract from deployment output
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ]; then
        print_warning "Could not extract address from broadcast log, trying output..."
        CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -i "deployed" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "$DEPLOY_OUTPUT" | grep -i "contract" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "")
    fi
    
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ] || [ "$CONTRACT_ADDRESS" == "" ]; then
        print_error "Failed to extract contract address from deployment"
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract address extracted: $CONTRACT_ADDRESS"
    
    # Verify contract is actually deployed
    print_status "Verifying contract deployment..."
    if ! verify_contract_deployed "$CONTRACT_ADDRESS"; then
        print_error "Contract deployment verification failed!"
        print_error "The address $CONTRACT_ADDRESS does not contain contract code."
        print_error "This usually means:"
        print_error "  1. The transaction failed but was not detected"
        print_error "  2. The wrong address was extracted"
        print_error "  3. Anvil is not running or responding correctly"
        echo ""
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract deployed and verified successfully!"
    echo ""
    print_status "Contract Name: $CONTRACT_NAME"
    print_status "Contract Address: $CONTRACT_ADDRESS"
    print_status "Network: Anvil (Chain ID: 31337)"
    echo ""
    
    
    print_status "Admin User (user0) registered: $DEPLOYER_ADDRESS"
    print_status "Role: Admin (Approved)"
    echo ""
    
    # Create contracts directory if it doesn't exist
    mkdir -p "$ARTIFACTS_DIR"
    
    # Copy ABI to frontend first
    if [ -f "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" ]; then
        cp "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" "$ARTIFACTS_DIR/"
        print_status "Contract ABI copied to $ARTIFACTS_DIR/"
        
        # Extract ABI from the JSON file for the config
        if command -v jq &> /dev/null; then
            ABI=$(cat "$ARTIFACTS_DIR/$CONTRACT_NAME.json" | jq -c '.abi' 2>/dev/null || echo "[]")
        else
            ABI="[]"
        fi
    else
        print_warning "ABI file not found: out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json"
        ABI="[]"
    fi
    
    # Extract ABI to separate file if possible
    if [ -f "$ARTIFACTS_DIR/$CONTRACT_NAME.json" ] && command -v python3 &> /dev/null; then
        python3 -c "import sys, json; data=json.load(open('$ARTIFACTS_DIR/$CONTRACT_NAME.json')); json.dump(data['abi'], open('$ARTIFACTS_DIR/abi.json', 'w'), indent=2)" 2>/dev/null
        if [ -f "$ARTIFACTS_DIR/abi.json" ]; then
            ABI_IMPORT="import abi from './abi.json';"
            ABI_REF="abi"
            print_status "ABI extracted to separate file: abi.json"
        fi
    fi
    
    # Fallback: inline ABI if extraction failed
    if [ -z "$ABI_IMPORT" ]; then
        ABI_IMPORT=""
        if [ -n "$ABI" ]; then
            ABI_REF="$ABI"
        else
            ABI_REF="[]"
        fi
    fi
    
    # Generate TypeScript contract configuration
    cat > "$ARTIFACTS_DIR/config.ts" <<EOF
// Auto-generated by deploy.sh
// DO NOT EDIT MANUALLY

$ABI_IMPORT

export const contractConfig = {
  address: "$CONTRACT_ADDRESS" as const,
  abi: ${ABI_REF},
  network: {
    name: "anvil" as const,
    chainId: 31337 as const,
  },
} as const;

// Contract artifacts location
export const CONTRACT_ABI_PATH = "./SupplyChainTracker.json";

// Export contract address for convenience
export const CONTRACT_ADDRESS = "$CONTRACT_ADDRESS" as const;

// Export ABI separately for convenience
export { abi };
EOF
    
    print_status "Contract configuration saved to $ARTIFACTS_DIR/config.ts"
    
    # Create network configuration for MetaMask
    cat > "$ARTIFACTS_DIR/network-config.json" <<EOF
{
  "chainId": "0x7A69",
  "chainName": "Anvil Local",
  "rpcUrls": ["$RPC_URL"],
  "nativeCurrency": {
    "name": "Ethereum",
    "symbol": "ETH",
    "decimals": 18
  },
  "blockExplorerUrls": []
}
EOF
    
    print_status "Network configuration saved to $ARTIFACTS_DIR/network-config.json"
    
    echo ""
    print_status "Deployment Summary:"
    echo "  Contract: $CONTRACT_ADDRESS"
    echo "  Network: Anvil Local"
    echo "  RPC: $RPC_URL"
    echo "  Admin (user0): $DEPLOYER_ADDRESS"
    echo ""
    print_warning "Add this network to MetaMask:"
    echo "  - Chain ID: 31337"
    echo "  - RPC URL: $RPC_URL"
    echo ""
    print_status "Admin credentials for testing:"
    echo "  Address: $DEPLOYER_ADDRESS"
    echo "  Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
}

# Function to verify deployment (contract functionality)
verify_deployment() {
    if [ -z "$CONTRACT_ADDRESS" ]; then
        print_error "No contract address to verify"
        return 1
    fi
    
    print_status "Verifying contract functionality..."
    
    # Verify contract owner using cast
    if command -v cast &> /dev/null; then
        # Try to call owner() function
        OWNER=$(cast call "$CONTRACT_ADDRESS" "owner()" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
        
        if [ -n "$OWNER" ] && [ "$OWNER" != "0x" ]; then
            print_status "Contract owner verified: $OWNER"
            return 0
        else
            print_warning "Could not verify contract owner (this may be normal if cast is not configured)"
        fi
    else
        print_warning "cast command not found, skipping functionality verification"
    fi
    
    return 0
}

# Main execution
main() {
    print_status "Supply Chain Tracker - Deployment Script"
    echo ""
    
    check_anvil_running
    deploy_contract
    
    # Verify deployment functionality
    if verify_deployment; then
        echo ""
        print_status "Deployment completed successfully!"
        print_status "Contract is deployed and verified at: $CONTRACT_ADDRESS"
    else
        print_warning "Deployment completed but functionality verification had issues"
    fi
}

main

exit 0


```

Asegurando que `CONTRACT_ADDRESS` sea global para que esté disponible en todas las funciones:


```shellscript
#!/bin/bash

# Deployment Script for Supply Chain Tracker
# This script deploys the SupplyChainTracker contract to Anvil

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ANVIL_HOST="${ANVIL_HOST:-127.0.0.1}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
RPC_URL="http://$ANVIL_HOST:$ANVIL_PORT"
CONTRACT_NAME="${CONTRACT_NAME:-SupplyChainTracker}"
ARTIFACTS_DIR="../web/src/contracts"

# Global variable for contract address
CONTRACT_ADDRESS=""

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if Anvil is running
check_anvil_running() {
    if ! curl -s $RPC_URL > /dev/null 2>&1; then
        print_error "Anvil is not running on $RPC_URL"
        print_error "Please start Anvil first: ./scripts/anvil.sh start"
        exit 1
    fi
}

# Function to verify contract is deployed
verify_contract_deployed() {
    local address=$1
    if [ -z "$address" ] || [ "$address" == "null" ] || [ "$address" == "" ]; then
        return 1
    fi
    
    # Check if cast is available
    if ! command -v cast &> /dev/null; then
        print_warning "cast command not found, skipping bytecode verification"
        return 0
    fi
    
    # Get contract bytecode
    BYTECODE=$(cast code "$address" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
    
    # Check if bytecode is not empty (0x means no code)
    if [ -z "$BYTECODE" ] || [ "$BYTECODE" == "0x" ] || [ "$BYTECODE" == "" ]; then
        print_error "Contract verification failed: No bytecode found at address $address"
        return 1
    fi
    
    # Check if bytecode has reasonable length (at least 100 chars for constructor + contract)
    BYTECODE_LENGTH=${#BYTECODE}
    if [ "$BYTECODE_LENGTH" -lt 100 ]; then
        print_error "Contract verification failed: Bytecode too short (likely not a contract)"
        return 1
    fi
    
    print_status "Contract verified: Bytecode found (${BYTECODE_LENGTH} chars)"
    return 0
}

# Function to extract contract address from broadcast logs
extract_contract_address() {
    local broadcast_log=$1
    
    if [ ! -f "$broadcast_log" ]; then
        return 1
    fi
    
    # Try multiple methods to extract contract address
    local address=""
    
    # Method 1: Look for contractAddress in transactions
    if command -v jq &> /dev/null; then
        address=$(jq -r '.transactions[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        
        # Method 2: Look for contractAddress in receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.receipts[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
        
        # Method 3: Look for createdContractAddress in transaction receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.transactions[] | select(.transaction.type == "CREATE") | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
    fi
    
    if [ -n "$address" ] && [ "$address" != "null" ] && [ "$address" != "" ]; then
        echo "$address"
        return 0
    fi
    
    return 1
}

# Function to deploy contract
deploy_contract() {
    print_status "Deploying $CONTRACT_NAME to $RPC_URL..."
    
    cd "$(dirname "$0")/.."
    
    # Default user0 private key from Anvil
    USER0_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    DEPLOYER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    
    # Clean previous broadcast logs to avoid confusion
    if [ -d "broadcast/Deploy.s.sol" ]; then
        print_status "Cleaning previous broadcast logs..."
        rm -rf broadcast/Deploy.s.sol/*
    fi
    
    # Deploy using forge script
    print_status "Running forge script..."
    DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
        --rpc-url "$RPC_URL" \
        --broadcast \
        --private-key "$USER0_PRIVATE_KEY" \
        -vvv 2>&1)
    
    DEPLOY_EXIT_CODE=$?
    
    if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
        print_error "Forge script failed with exit code $DEPLOY_EXIT_CODE"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    # Wait a moment for the transaction to be mined
    sleep 2
    
    # Extract contract address from broadcast logs
    CONTRACT_ADDRESS=""
    BROADCAST_LOG=$(find broadcast/Deploy.s.sol -name "run-latest.json" -type f 2>/dev/null | head -1)
    
    if [ -n "$BROADCAST_LOG" ] && [ -f "$BROADCAST_LOG" ]; then
        print_status "Extracting contract address from broadcast log: $BROADCAST_LOG"
        CONTRACT_ADDRESS=$(extract_contract_address "$BROADCAST_LOG")
    fi
    
    # Fallback: Try to extract from deployment output
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ]; then
        print_warning "Could not extract address from broadcast log, trying output..."
        CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -i "deployed" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "$DEPLOY_OUTPUT" | grep -i "contract" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "")
    fi
    
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ] || [ "$CONTRACT_ADDRESS" == "" ]; then
        print_error "Failed to extract contract address from deployment"
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract address extracted: $CONTRACT_ADDRESS"
    
    # Verify contract is actually deployed
    print_status "Verifying contract deployment..."
    if ! verify_contract_deployed "$CONTRACT_ADDRESS"; then
        print_error "Contract deployment verification failed!"
        print_error "The address $CONTRACT_ADDRESS does not contain contract code."
        print_error "This usually means:"
        print_error "  1. The transaction failed but was not detected"
        print_error "  2. The wrong address was extracted"
        print_error "  3. Anvil is not running or responding correctly"
        echo ""
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract deployed and verified successfully!"
    echo ""
    print_status "Contract Name: $CONTRACT_NAME"
    print_status "Contract Address: $CONTRACT_ADDRESS"
    print_status "Network: Anvil (Chain ID: 31337)"
    echo ""
    
    
    print_status "Admin User (user0) registered: $DEPLOYER_ADDRESS"
    print_status "Role: Admin (Approved)"
    echo ""
    
    # Create contracts directory if it doesn't exist
    mkdir -p "$ARTIFACTS_DIR"
    
    # Copy ABI to frontend first
    if [ -f "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" ]; then
        cp "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" "$ARTIFACTS_DIR/"
        print_status "Contract ABI copied to $ARTIFACTS_DIR/"
        
        # Extract ABI from the JSON file for the config
        if command -v jq &> /dev/null; then
            ABI=$(cat "$ARTIFACTS_DIR/$CONTRACT_NAME.json" | jq -c '.abi' 2>/dev/null || echo "[]")
        else
            ABI="[]"
        fi
    else
        print_warning "ABI file not found: out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json"
        ABI="[]"
    fi
    
    # Extract ABI to separate file if possible
    if [ -f "$ARTIFACTS_DIR/$CONTRACT_NAME.json" ] && command -v python3 &> /dev/null; then
        python3 -c "import sys, json; data=json.load(open('$ARTIFACTS_DIR/$CONTRACT_NAME.json')); json.dump(data['abi'], open('$ARTIFACTS_DIR/abi.json', 'w'), indent=2)" 2>/dev/null
        if [ -f "$ARTIFACTS_DIR/abi.json" ]; then
            ABI_IMPORT="import abi from './abi.json';"
            ABI_REF="abi"
            print_status "ABI extracted to separate file: abi.json"
        fi
    fi
    
    # Fallback: inline ABI if extraction failed
    if [ -z "$ABI_IMPORT" ]; then
        ABI_IMPORT=""
        if [ -n "$ABI" ]; then
            ABI_REF="$ABI"
        else
            ABI_REF="[]"
        fi
    fi
    
    # Generate TypeScript contract configuration
    cat > "$ARTIFACTS_DIR/config.ts" <<EOF
// Auto-generated by deploy.sh
// DO NOT EDIT MANUALLY

$ABI_IMPORT

export const contractConfig = {
  address: "$CONTRACT_ADDRESS" as const,
  abi: ${ABI_REF},
  network: {
    name: "anvil" as const,
    chainId: 31337 as const,
  },
} as const;

// Contract artifacts location
export const CONTRACT_ABI_PATH = "./SupplyChainTracker.json";

// Export contract address for convenience
export const CONTRACT_ADDRESS = "$CONTRACT_ADDRESS" as const;

// Export ABI separately for convenience
export { abi };
EOF
    
    print_status "Contract configuration saved to $ARTIFACTS_DIR/config.ts"
    
    # Create network configuration for MetaMask
    cat > "$ARTIFACTS_DIR/network-config.json" <<EOF
{
  "chainId": "0x7A69",
  "chainName": "Anvil Local",
  "rpcUrls": ["$RPC_URL"],
  "nativeCurrency": {
    "name": "Ethereum",
    "symbol": "ETH",
    "decimals": 18
  },
  "blockExplorerUrls": []
}
EOF
    
    print_status "Network configuration saved to $ARTIFACTS_DIR/network-config.json"
    
    echo ""
    print_status "Deployment Summary:"
    echo "  Contract: $CONTRACT_ADDRESS"
    echo "  Network: Anvil Local"
    echo "  RPC: $RPC_URL"
    echo "  Admin (user0): $DEPLOYER_ADDRESS"
    echo ""
    print_warning "Add this network to MetaMask:"
    echo "  - Chain ID: 31337"
    echo "  - RPC URL: $RPC_URL"
    echo ""
    print_status "Admin credentials for testing:"
    echo "  Address: $DEPLOYER_ADDRESS"
    echo "  Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
}

# Function to verify deployment (contract functionality)
verify_deployment() {
    if [ -z "$CONTRACT_ADDRESS" ]; then
        print_error "No contract address to verify"
        return 1
    fi
    
    print_status "Verifying contract functionality..."
    
    # Verify contract owner using cast
    if command -v cast &> /dev/null; then
        # Try to call owner() function
        OWNER=$(cast call "$CONTRACT_ADDRESS" "owner()" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
        
        if [ -n "$OWNER" ] && [ "$OWNER" != "0x" ]; then
            print_status "Contract owner verified: $OWNER"
            return 0
        else
            print_warning "Could not verify contract owner (this may be normal if cast is not configured)"
        fi
    else
        print_warning "cast command not found, skipping functionality verification"
    fi
    
    return 0
}

# Main execution
main() {
    print_status "Supply Chain Tracker - Deployment Script"
    echo ""
    
    check_anvil_running
    deploy_contract
    
    # Verify deployment functionality
    if verify_deployment; then
        echo ""
        print_status "Deployment completed successfully!"
        print_status "Contract is deployed and verified at: $CONTRACT_ADDRESS"
    else
        print_warning "Deployment completed but functionality verification had issues"
    fi
}

main

exit 0


```

Revisando el script de deployment Solidity para asegurar que se ejecute correctamente:


El script Solidity está bien. Ajustando el script de deployment para registrar el admin correctamente:


```solidity
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


```

## Cambios realizados

1. Verificación con `cast code`: antes de generar los archivos de configuración, el script verifica que el contrato tenga código en la dirección extraída. Si `cast code` devuelve `0x`, el script falla y muestra un error claro.

2. Extracción de dirección mejorada: función `extract_contract_address()` que intenta múltiples métodos para extraer la dirección del contrato desde los logs de broadcast.

3. Manejo de errores mejorado:
   - Verifica el código de salida del comando `forge script`
   - Espera 2 segundos después del deployment para que la transacción se mine
   - Limpia los logs de broadcast anteriores para evitar confusiones

4. Validación de bytecode: verifica que el bytecode tenga al menos 100 caracteres (para asegurar que es un contrato real, no solo una dirección vacía).

5. Limpieza de logs: limpia los logs de broadcast anteriores antes de cada deployment para evitar extraer direcciones incorrectas.

## Cómo funciona ahora

1. Ejecuta el deployment con `forge script`
2. Extrae la dirección del contrato desde los logs
3. Verifica con `cast code` que el contrato tenga código
4. Solo si la verificación pasa, genera los archivos de configuración
5. Si falla, muestra un error claro y no continúa

El script ahora falla si el contrato no está realmente desplegado, en lugar de generar archivos con una dirección incorrecta. Ejecuta el deployment nuevamente y debería funcionar correctamente.

---

**User**

4th point about token is done, now we can proceed with  the @project-plan.md point 5th.

when the 5th point is covered we can check the connection functionality again, If im logged as any user and I change the account using metamask, the page information remains and i have to do a page reload. this should happend automatically (the reload).

lets go!!

---

**Cursor**


Revisando la estructura actual antes de implementar el punto 5 (interfaces de tokens y transferencias) y luego corregir la actualización automática al cambiar de cuenta en MetaMask.


Revisando componentes existentes para entender la estructura:


Corrigiendo primero el Web3Context para que actualice automáticamente al cambiar de cuenta, luego creando las interfaces de tokens y transferencias.


```typescriptreact
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { contractConfig } from '@/contracts/config';

// Types
interface User {
  id: number;
  userAddress: string;
  role: string;
  status: UserStatus;
}

enum UserStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Canceled = 3
}

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  
  // User data
  user: User | null;
  isRegistered: boolean;
  isApproved: boolean;
  
  // Methods
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  checkConnection: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  ACCOUNT: 'wallet_account',
  CHAIN_ID: 'wallet_chain_id',
  CONNECTION_STATUS: 'wallet_connected'
};

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Load persisted connection state
  useEffect(() => {
    const loadPersistedState = async () => {
      if (typeof window === 'undefined') return;

      const storedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
      const storedChainId = localStorage.getItem(STORAGE_KEYS.CHAIN_ID);
      const isStoredConnected = localStorage.getItem(STORAGE_KEYS.CONNECTION_STATUS) === 'true';

      if (isStoredConnected && storedAccount && window.ethereum) {
        setAccount(storedAccount);
        if (storedChainId) setChainId(parseInt(storedChainId));
        await checkConnection();
      }
    };

    loadPersistedState();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        disconnectWallet();
      } else if (accounts[0] !== account) {
        // Account changed - refresh all data automatically
        const newAccount = accounts[0];
        setAccount(newAccount);
        localStorage.setItem(STORAGE_KEYS.ACCOUNT, newAccount);
        
        // Reset user data
        setUser(null);
        setIsRegistered(false);
        setIsApproved(false);
        
        // Reconnect with new account
        toast.info('Account changed. Refreshing data...');
        
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          const signer = await provider.getSigner();
          
          setChainId(Number(network.chainId));
          setProvider(provider);
          setSigner(signer);
          setIsConnected(true);
          
          localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
          localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');
          
          // Refresh user data for new account
          const contract = new ethers.Contract(
            contractConfig.address,
            contractConfig.abi,
            provider
          );
          try {
            const userData = await contract.getUser(newAccount);
            const userObject: User = {
              id: Number(userData.id),
              userAddress: userData.userAddress,
              role: userData.role,
              status: Number(userData.status) as UserStatus
            };
            setUser(userObject);
            setIsRegistered(true);
            setIsApproved(userObject.status === UserStatus.Approved);
          } catch (error: any) {
            if (!error.message || !error.message.includes("User does not exist")) {
              console.error('Error fetching user data:', error);
            }
            setUser(null);
            setIsRegistered(false);
            setIsApproved(false);
          }
        } catch (error) {
          console.error('Error reconnecting with new account:', error);
          disconnectWallet();
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      localStorage.setItem(STORAGE_KEYS.CHAIN_ID, newChainId.toString());
      toast.info('Network changed. Reloading page...');
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [account, disconnectWallet]);

  // Check MetaMask availability
  const checkMetaMask = useCallback(() => {
    if (typeof window === 'undefined') {
      toast.error('Please use a browser that supports Web3');
      return false;
    }

    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      return false;
    }

    return true;
  }, []);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!checkMetaMask()) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0].address;
        const network = await provider.getNetwork();
        const signer = await provider.getSigner();

        setAccount(account);
        setChainId(Number(network.chainId));
        setProvider(provider);
        setSigner(signer);
        setIsConnected(true);

        localStorage.setItem(STORAGE_KEYS.ACCOUNT, account);
        localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
        localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');

        // Refresh user data after state is set
        const contract = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        try {
          const userData = await contract.getUser(account);
          const userObject: User = {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
          setUser(userObject);
          setIsRegistered(true);
          setIsApproved(userObject.status === UserStatus.Approved);
        } catch (error: any) {
          if (!error.message || !error.message.includes("User does not exist")) {
            console.error('Error fetching user data:', error);
          }
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    }
  }, [checkMetaMask]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!checkMetaMask()) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        const account = accounts[0];
        const network = await provider.getNetwork();
        const signer = await provider.getSigner();

        setAccount(account);
        setChainId(Number(network.chainId));
        setProvider(provider);
        setSigner(signer);
        setIsConnected(true);

        localStorage.setItem(STORAGE_KEYS.ACCOUNT, account);
        localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
        localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');

        toast.success('Wallet connected successfully!');

        // Refresh user data after state is set
        const contract = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        try {
          const userData = await contract.getUser(account);
          const userObject: User = {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
          setUser(userObject);
          setIsRegistered(true);
          setIsApproved(userObject.status === UserStatus.Approved);
        } catch (error: any) {
          if (!error.message || !error.message.includes("User does not exist")) {
            console.error('Error fetching user data:', error);
          }
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        toast.error('Please connect your MetaMask wallet to continue');
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    }
  }, [checkMetaMask]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setUser(null);
    setIsRegistered(false);
    setIsApproved(false);

    localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.CHAIN_ID);
    localStorage.removeItem(STORAGE_KEYS.CONNECTION_STATUS);

    toast.info('Wallet disconnected');
  }, []);

  // Refresh user data from contract
  const refreshUserData = useCallback(async () => {
    if (!account || !provider) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      // Check if user exists by calling getUser
      // If the user doesn't exist, it will throw an error
      try {
        const userData = await contract.getUser(account);
        
        // Convert the user data from the contract
        const userObject: User = {
          id: Number(userData.id),
          userAddress: userData.userAddress,
          role: userData.role,
          status: Number(userData.status) as UserStatus
        };
        
        setUser(userObject);
        setIsRegistered(true);
        setIsApproved(userObject.status === UserStatus.Approved);
      } catch (error: any) {
        // User doesn't exist
        if (error.message && error.message.includes("User does not exist")) {
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [account, provider]);

  const value: Web3ContextType = {
    isConnected,
    account,
    chainId,
    provider,
    signer,
    user,
    isRegistered,
    isApproved,
    connectWallet,
    disconnectWallet,
    checkConnection,
    refreshUserData,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

// Hook to use Web3 context
export function useWeb3() {
  const context = useContext(Web3Context);
  
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  
  return context;
}

// Export UserStatus enum for use in components
export { UserStatus };


```

Creando las interfaces de tokens. Revisando el ABI para entender los métodos disponibles:


Creando las páginas de tokens. Empezando por la lista de tokens:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [tokens, setTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Filter tokens that have balance > 0 or were created by the user
      const userTokens = validTokens.filter(
        (token) => token.balance > 0 || token.creator.toLowerCase() === account.toLowerCase()
      );

      setTokens(userTokens);
      const balanceMap: Record<number, number> = {};
      userTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No tokens found</p>
                <Link href="/token/create">
                  <Button>Create Your First Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokens.map((token) => {
              const metadata = parseMetadata(token.metadata);
              const balance = balances[token.id] || 0;
              const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Balance
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Creator
                        </div>
                        <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                      </div>

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

interface CreateTokenForm {
  metadata: string;
  parentId: string;
  amount: string;
}

export default function CreateTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Array<{ id: number; name: string; balance: number }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      metadata: "",
      parentId: "0",
      amount: "",
    },
  });

  const parentId = watch("parentId");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadAvailableTokens();
  }, [account, isConnected, isApproved, router]);

  const loadAvailableTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoadingTokens(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(Number(tokenId));
          const balance = await contract.getTokenBalance(Number(tokenId), account);
          
          if (Number(balance) > 0) {
            let metadata;
            try {
              metadata = JSON.parse(tokenData.metadata);
            } catch {
              metadata = { name: `Token #${tokenId}` };
            }
            
            return {
              id: Number(tokenId),
              name: metadata.name || `Token #${tokenId}`,
              balance: Number(balance),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter((token): token is { id: number; name: string; balance: number } => token !== null);
      setAvailableTokens(validTokens);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const onSubmit = async (data: CreateTokenForm) => {
    if (!account || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate metadata JSON
    let metadata;
    try {
      metadata = JSON.parse(data.metadata);
      // Re-stringify to ensure it's valid JSON
      metadata = JSON.stringify(metadata);
    } catch (error) {
      toast.error("Invalid JSON format for metadata");
      return;
    }

    const parentIdNum = parseInt(data.parentId) || 0;
    const amount = parseInt(data.amount);

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // If parentId is provided, check balance
      if (parentIdNum > 0) {
        const balance = await contract.getTokenBalance(parentIdNum, account);
        if (Number(balance) < amount) {
          toast.error(`Insufficient balance. You have ${Number(balance)} tokens.`);
          setIsSubmitting(false);
          return;
        }
      }

      toast.info("Creating token... Please confirm the transaction in MetaMask.");

      const tx = await contract.createProductToken(metadata, parentIdNum, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Token created successfully!");
      
      router.push('/token');
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient parent token balance")) {
        toast.error("Insufficient balance of parent token");
      } else if (error.message?.includes("Parent token does not exist")) {
        toast.error("Parent token does not exist");
      } else {
        toast.error("Failed to create token. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const selectedParent = availableTokens.find(t => t.id === parseInt(parentId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create Product Token
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new product token in the supply chain
            </p>
          </div>
          <Link href="/token">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new product token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Metadata JSON */}
              <div className="space-y-2">
                <Label htmlFor="metadata">
                  Metadata (JSON) <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="metadata"
                  {...register("metadata", {
                    required: "Metadata is required",
                    validate: (value) => {
                      try {
                        JSON.parse(value);
                        return true;
                      } catch {
                        return "Invalid JSON format";
                      }
                    },
                  })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm min-h-[120px] font-mono"
                  placeholder='{"name": "Product Name", "description": "Product description", "category": "Category"}'
                />
                {errors.metadata && (
                  <p className="text-sm text-red-500">{errors.metadata.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter product information as JSON. Include fields like name, description, category, etc.
                </p>
              </div>

              {/* Parent Token */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Token (Optional)</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="0">No parent (new product)</option>
                  {loadingTokens ? (
                    <option disabled>Loading tokens...</option>
                  ) : availableTokens.length === 0 ? (
                    <option disabled>No tokens available</option>
                  ) : (
                    availableTokens.map((token) => (
                      <option key={token.id} value={token.id.toString()}>
                        {token.name} (ID: #{token.id}, Balance: {token.balance})
                      </option>
                    ))
                  )}
                </select>
                {selectedParent && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {selectedParent.balance} tokens
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select a parent token if this product is created from another product
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Initial Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      if (parentId !== "0" && selectedParent) {
                        if (num > selectedParent.balance) {
                          return `Amount exceeds available balance (${selectedParent.balance})`;
                        }
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Number of tokens to create initially
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/token" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Token"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

```

Creando la página de detalles del token y la de transferencia:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenDetailPage() {
  const { account, provider, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [parentToken, setParentToken] = useState<ProductToken | null>(null);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const tokenBalance = await contract.getTokenBalance(tokenId, account);
      const tokenTotalSupply = await contract.getTokenTotalSupply(tokenId);
      const history = await contract.getTokenTransactionHistory(tokenId);

      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      setToken(tokenObj);
      setBalance(Number(tokenBalance));
      setTotalSupply(Number(tokenTotalSupply));
      setTransactionHistory(history.map((h: bigint) => Number(h)));

      // Load parent token if exists
      if (tokenObj.parentId > 0) {
        try {
          const parentData = await contract.getProductToken(tokenObj.parentId);
          setParentToken({
            id: tokenObj.parentId,
            creator: parentData.creator,
            metadata: parentData.metadata,
            parentId: Number(parentData.parentId),
            timestamp: Number(parentData.timestamp),
            isActive: parentData.isActive,
          });
        } catch (error) {
          console.error("Error loading parent token:", error);
        }
      }
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push('/token');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading token details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);
  const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {metadata.name || `Token #${token.id}`}
            </h1>
            <p className="text-muted-foreground mt-2">
              Token ID: #{token.id}
            </p>
          </div>
          <div className="flex gap-2">
            {balance > 0 && (
              <Link href={`/token/${token.id}/transfer`}>
                <Button>Transfer Tokens</Button>
              </Link>
            )}
            <Link href="/token">
              <Button variant="outline">Back to Tokens</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </div>
                  <div className="text-lg font-semibold">
                    {metadata.name || `Token #${token.id}`}
                  </div>
                </div>

                {metadata.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div className="text-sm">{metadata.description}</div>
                  </div>
                )}

                {metadata.category && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </div>
                    <Badge>{metadata.category}</Badge>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created At
                  </div>
                  <div className="text-sm">{formatDate(token.timestamp)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Creator
                  </div>
                  <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                  {isOwner && <Badge variant="outline" className="mt-1">You are the creator</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge className={token.isActive ? "bg-green-500" : "bg-gray-500"}>
                    {token.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {Object.keys(metadata).filter(key => !['name', 'description', 'category'].includes(key)).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Additional Metadata
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Token */}
            {parentToken && (
              <Card>
                <CardHeader>
                  <CardTitle>Parent Token</CardTitle>
                  <CardDescription>
                    This token was created from another token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Token ID
                      </div>
                      <Link href={`/token/${token.parentId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          Token #{token.parentId}
                        </Button>
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Name
                      </div>
                      <div className="text-sm">
                        {parseMetadata(parentToken.metadata).name || `Token #${token.parentId}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    All transfers related to this token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transactionHistory.map((transferId) => (
                      <div key={transferId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Transfer #{transferId}</span>
                        <Link href={`/transfers/${transferId}`}>
                          <Button variant="link" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{balance}</div>
                  <div className="text-sm text-muted-foreground">
                    Your balance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Supply
                  </div>
                  <div className="text-lg font-semibold">{totalSupply}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-lg font-semibold">{balance}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Transactions
                  </div>
                  <div className="text-lg font-semibold">{transactionHistory.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<Array<{ address: string; role: string }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!provider) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all users (if admin) or get approved users
      // For now, we'll just allow manual address input
      // In a real app, you might want to fetch all approved users
      setAvailableUsers([]);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="to"
                  type="text"
                  {...register("to", {
                    required: "Recipient address is required",
                    validate: (value) => {
                      if (!ethers.isAddress(value.trim())) {
                        return "Invalid Ethereum address";
                      }
                      if (value.trim().toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  })}
                  placeholder="0x..."
                  className="font-mono"
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the Ethereum address of the recipient. They must be a registered and approved user.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

```

Creando las páginas de transferencias:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [account, isConnected, isApproved, router]);

  const loadTransfers = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get pending transfers for this user
      const pendingTransferIds: bigint[] = await contract.getPendingTransfers(account);
      
      // Load transfer details
      const transferPromises = pendingTransferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          console.error(`Error loading transfer ${transferId}:`, error);
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null && transfer.status === 0
      );

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading transfers:", error);
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Pending Transfers
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and manage incoming transfer requests
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No pending transfers</p>
                <Link href="/token">
                  <Button>View Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                You have {transfers.length} pending transfer request(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransferDetailPage() {
  const { account, provider, signer, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const transferId = params.id as string;
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (transferId) {
      loadTransferData();
    }
  }, [transferId, account, isConnected, isApproved, router]);

  const loadTransferData = async () => {
    if (!account || !provider || !transferId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const transferData = await contract.getTransfer(transferId);
      
      const transferObj: Transfer = {
        id: Number(transferId),
        tokenId: Number(transferData.tokenId),
        from: transferData.from,
        to: transferData.to,
        amount: Number(transferData.amount),
        status: Number(transferData.status),
        requestTimestamp: Number(transferData.requestTimestamp),
        responseTimestamp: Number(transferData.responseTimestamp),
      };

      setTransfer(transferObj);

      // Load token name
      try {
        const tokenData = await contract.getProductToken(transferObj.tokenId);
        let metadata;
        try {
          metadata = JSON.parse(tokenData.metadata);
        } catch {
          metadata = { name: `Token #${transferObj.tokenId}` };
        }
        setTokenName(metadata.name || `Token #${transferObj.tokenId}`);
      } catch (error) {
        console.error("Error loading token:", error);
      }
    } catch (error) {
      console.error("Error loading transfer:", error);
      toast.error("Failed to load transfer data");
      router.push('/transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Accepting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.acceptTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer accepted successfully!");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back
      setTimeout(() => {
        router.push('/transfers');
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can accept")) {
        toast.error("Only the recipient can accept this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to accept transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Rejecting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.rejectTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer rejected. Tokens returned to sender.");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back
      setTimeout(() => {
        router.push('/transfers');
      }, 1500);
    } catch (error: any) {
      console.error("Error rejecting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can reject")) {
        toast.error("Only the recipient can reject this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to reject transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfer details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Transfer not found</p>
                <Link href="/transfers">
                  <Button>Back to Transfers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRecipient = transfer.to.toLowerCase() === account?.toLowerCase();
  const isPending = transfer.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer #{transfer.id}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName || `Token ID: #${transfer.tokenId}`}
            </p>
          </div>
          <Link href="/transfers">
            <Button variant="outline">Back to Transfers</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <div>{getStatusBadge(transfer.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Token
                  </div>
                  <Link href={`/token/${transfer.tokenId}`}>
                    <Button variant="link" className="p-0 h-auto">
                      {tokenName || `Token #${transfer.tokenId}`}
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Amount
                  </div>
                  <div className="text-2xl font-bold">{transfer.amount} tokens</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    From
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.from)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    To
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.to)}</div>
                  {isRecipient && <Badge variant="outline" className="mt-1">You are the recipient</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Requested At
                  </div>
                  <div className="text-sm">{formatDate(transfer.requestTimestamp)}</div>
                </div>

                {transfer.responseTimestamp > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Response At
                    </div>
                    <div className="text-sm">{formatDate(transfer.responseTimestamp)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isPending && isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Accept or reject this transfer request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Accept Transfer"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject Transfer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This transfer has been {transfer.status === 1 ? "accepted" : "rejected"}.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && !isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for recipient approval...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

```

Actualizando el dashboard para incluir enlaces a las nuevas páginas y verificando errores:


```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet,
    connectWallet 
  } = useWeb3();
  
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Redirect to home if not approved
    if (!isApproved) {
      router.push('/');
    }
  }, [isConnected, isApproved, router]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const isAdmin = user.role === "Admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome to your Supply Chain Tracker dashboard
            </p>
          </div>
          <Button onClick={disconnectWallet} variant="outline">
            Disconnect
          </Button>
        </div>

        {/* User Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Profile</CardTitle>
              <Badge className={getRoleColor(user.role)}>
                {user.role}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  User ID
                </div>
                <div className="text-lg font-semibold">
                  #{user.id}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Wallet Address
                </div>
                <div className="text-lg font-mono">
                  {formatAddress(user.userAddress)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <Link href="/admin/users">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    👥 User Management
                  </CardTitle>
                  <CardDescription>
                    Review and moderate registration requests
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          )}
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/token">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🪙 My Tokens
                </CardTitle>
                <CardDescription>
                  View and manage your product tokens
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/token/create">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ➕ Create Token
                </CardTitle>
                <CardDescription>
                  Create a new product token
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/transfers">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📤 Transfers
                </CardTitle>
                <CardDescription>
                  View and manage transfer requests
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-500">Approved</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your account is active and ready to use.
                </p>
                {isAdmin && (
                  <p className="text-sm">
                    As an admin, you have access to user management features.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


```

Agregando el import faltante en la página de transferencias:


Revisando y corrigiendo un posible problema con el botón en la página de detalles de transferencia:


## Completado

### 1. Web3Context — actualización automática al cambiar cuenta
- Al cambiar de cuenta en MetaMask, el contexto:
  - Detecta el cambio
  - Actualiza la cuenta
  - Recarga los datos del usuario
  - Muestra un toast informativo
  - No requiere recarga manual de la página

### 2. Interfaz de tokens (`/token`)
- Lista de tokens (`/token`)
  - Muestra tokens creados por el usuario y tokens con balance > 0
  - Balance por token
  - Enlaces a detalles y transferencias
- Crear token (`/token/create`)
  - Formulario con validación
  - Campo de metadata JSON con validación
  - Selección de parent token opcional
  - Validación de balance al usar parent token
  - Validación de cantidad
- Detalles del token (`/token/[id]`)
  - Información completa del token
  - Balance y estadísticas
  - Historial de transacciones
  - Información del parent token si existe
  - Enlaces a transferencias
- Transferir token (`/token/[id]/transfer`)
  - Formulario de transferencia
  - Validación de dirección del destinatario
  - Validación de balance suficiente
  - Verificación de que el destinatario esté registrado y aprobado

### 3. Interfaz de transferencias (`/transfers`)
- Lista de transferencias (`/transfers`)
  - Muestra transferencias pendientes para el usuario
  - Tabla con información clave
  - Enlaces a detalles
- Detalles de transferencia (`/transfers/[id]`)
  - Información completa de la transferencia
  - Botones para aceptar/rechazar (solo para el destinatario)
  - Actualización automática después de aceptar/rechazar
  - Redirección a la lista después de la acción

### 4. Dashboard actualizado
- Agregados enlaces rápidos a:
  - Mis Tokens
  - Crear Token
  - Transfers

## Características implementadas

1. Validación en frontend antes de enviar transacciones
2. Manejo de errores con mensajes claros
3. Estados de carga durante transacciones
4. Actualización automática después de acciones
5. Diseño responsive con shadcn/ui
6. Navegación clara entre páginas

Todo está listo. Al cambiar de cuenta en MetaMask, la página se actualiza automáticamente sin recargar manualmente.

---

**User**

after trying to fix the account change and page reload we habe a new issue, fix this issue on @Web3Context.tsx  (163:16)

---

**Cursor**


Revisando el problema en la línea 163 del Web3Context. Probablemente es un problema de dependencias en el useEffect. Corrigiéndolo:


Corrigiendo el problema: `disconnectWallet` se usa antes de su declaración. Reestructurando el código para solucionarlo:


```typescriptreact
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { contractConfig } from '@/contracts/config';

// Types
interface User {
  id: number;
  userAddress: string;
  role: string;
  status: UserStatus;
}

enum UserStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Canceled = 3
}

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  
  // User data
  user: User | null;
  isRegistered: boolean;
  isApproved: boolean;
  
  // Methods
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  checkConnection: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  ACCOUNT: 'wallet_account',
  CHAIN_ID: 'wallet_chain_id',
  CONNECTION_STATUS: 'wallet_connected'
};

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Disconnect wallet helper function (defined early to avoid forward reference)
  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setUser(null);
    setIsRegistered(false);
    setIsApproved(false);

    localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.CHAIN_ID);
    localStorage.removeItem(STORAGE_KEYS.CONNECTION_STATUS);

    toast.info('Wallet disconnected');
  }, []);

  // Load persisted connection state
  useEffect(() => {
    const loadPersistedState = async () => {
      if (typeof window === 'undefined') return;

      const storedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
      const storedChainId = localStorage.getItem(STORAGE_KEYS.CHAIN_ID);
      const isStoredConnected = localStorage.getItem(STORAGE_KEYS.CONNECTION_STATUS) === 'true';

      if (isStoredConnected && storedAccount && window.ethereum) {
        setAccount(storedAccount);
        if (storedChainId) setChainId(parseInt(storedChainId));
        await checkConnection();
      }
    };

    loadPersistedState();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        disconnectWallet();
      } else if (accounts[0] !== account) {
        // Account changed - refresh all data automatically
        const newAccount = accounts[0];
        setAccount(newAccount);
        localStorage.setItem(STORAGE_KEYS.ACCOUNT, newAccount);
        
        // Reset user data
        setUser(null);
        setIsRegistered(false);
        setIsApproved(false);
        
        // Reconnect with new account
        toast.info('Account changed. Refreshing data...');
        
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          const signer = await provider.getSigner();
          
          setChainId(Number(network.chainId));
          setProvider(provider);
          setSigner(signer);
          setIsConnected(true);
          
          localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
          localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');
          
          // Refresh user data for new account
          const contract = new ethers.Contract(
            contractConfig.address,
            contractConfig.abi,
            provider
          );
          try {
            const userData = await contract.getUser(newAccount);
            const userObject: User = {
              id: Number(userData.id),
              userAddress: userData.userAddress,
              role: userData.role,
              status: Number(userData.status) as UserStatus
            };
            setUser(userObject);
            setIsRegistered(true);
            setIsApproved(userObject.status === UserStatus.Approved);
          } catch (error: any) {
            if (!error.message || !error.message.includes("User does not exist")) {
              console.error('Error fetching user data:', error);
            }
            setUser(null);
            setIsRegistered(false);
            setIsApproved(false);
          }
        } catch (error) {
          console.error('Error reconnecting with new account:', error);
          disconnectWallet();
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      localStorage.setItem(STORAGE_KEYS.CHAIN_ID, newChainId.toString());
      toast.info('Network changed. Reloading page...');
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [account, disconnectWallet]);

  // Check MetaMask availability
  const checkMetaMask = useCallback(() => {
    if (typeof window === 'undefined') {
      toast.error('Please use a browser that supports Web3');
      return false;
    }

    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      return false;
    }

    return true;
  }, []);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!checkMetaMask()) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0].address;
        const network = await provider.getNetwork();
        const signer = await provider.getSigner();

        setAccount(account);
        setChainId(Number(network.chainId));
        setProvider(provider);
        setSigner(signer);
        setIsConnected(true);

        localStorage.setItem(STORAGE_KEYS.ACCOUNT, account);
        localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
        localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');

        // Refresh user data after state is set
        const contract = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        try {
          const userData = await contract.getUser(account);
          const userObject: User = {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
          setUser(userObject);
          setIsRegistered(true);
          setIsApproved(userObject.status === UserStatus.Approved);
        } catch (error: any) {
          if (!error.message || !error.message.includes("User does not exist")) {
            console.error('Error fetching user data:', error);
          }
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    }
  }, [checkMetaMask]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!checkMetaMask()) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        const account = accounts[0];
        const network = await provider.getNetwork();
        const signer = await provider.getSigner();

        setAccount(account);
        setChainId(Number(network.chainId));
        setProvider(provider);
        setSigner(signer);
        setIsConnected(true);

        localStorage.setItem(STORAGE_KEYS.ACCOUNT, account);
        localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
        localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');

        toast.success('Wallet connected successfully!');

        // Refresh user data after state is set
        const contract = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        try {
          const userData = await contract.getUser(account);
          const userObject: User = {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
          setUser(userObject);
          setIsRegistered(true);
          setIsApproved(userObject.status === UserStatus.Approved);
        } catch (error: any) {
          if (!error.message || !error.message.includes("User does not exist")) {
            console.error('Error fetching user data:', error);
          }
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        toast.error('Please connect your MetaMask wallet to continue');
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    }
  }, [checkMetaMask]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setUser(null);
    setIsRegistered(false);
    setIsApproved(false);

    localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.CHAIN_ID);
    localStorage.removeItem(STORAGE_KEYS.CONNECTION_STATUS);

    toast.info('Wallet disconnected');
  }, []);

  // Refresh user data from contract
  const refreshUserData = useCallback(async () => {
    if (!account || !provider) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      // Check if user exists by calling getUser
      // If the user doesn't exist, it will throw an error
      try {
        const userData = await contract.getUser(account);
        
        // Convert the user data from the contract
        const userObject: User = {
          id: Number(userData.id),
          userAddress: userData.userAddress,
          role: userData.role,
          status: Number(userData.status) as UserStatus
        };
        
        setUser(userObject);
        setIsRegistered(true);
        setIsApproved(userObject.status === UserStatus.Approved);
      } catch (error: any) {
        // User doesn't exist
        if (error.message && error.message.includes("User does not exist")) {
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [account, provider]);

  const value: Web3ContextType = {
    isConnected,
    account,
    chainId,
    provider,
    signer,
    user,
    isRegistered,
    isApproved,
    connectWallet,
    disconnectWallet,
    checkConnection,
    refreshUserData,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

// Hook to use Web3 context
export function useWeb3() {
  const context = useContext(Web3Context);
  
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  
  return context;
}

// Export UserStatus enum for use in components
export { UserStatus };


```

```typescriptreact
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { contractConfig } from '@/contracts/config';

// Types
interface User {
  id: number;
  userAddress: string;
  role: string;
  status: UserStatus;
}

enum UserStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Canceled = 3
}

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  
  // User data
  user: User | null;
  isRegistered: boolean;
  isApproved: boolean;
  
  // Methods
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  checkConnection: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  ACCOUNT: 'wallet_account',
  CHAIN_ID: 'wallet_chain_id',
  CONNECTION_STATUS: 'wallet_connected'
};

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Disconnect wallet helper function (defined early to avoid forward reference)
  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setUser(null);
    setIsRegistered(false);
    setIsApproved(false);

    localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.CHAIN_ID);
    localStorage.removeItem(STORAGE_KEYS.CONNECTION_STATUS);

    toast.info('Wallet disconnected');
  }, []);

  // Load persisted connection state
  useEffect(() => {
    const loadPersistedState = async () => {
      if (typeof window === 'undefined') return;

      const storedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
      const storedChainId = localStorage.getItem(STORAGE_KEYS.CHAIN_ID);
      const isStoredConnected = localStorage.getItem(STORAGE_KEYS.CONNECTION_STATUS) === 'true';

      if (isStoredConnected && storedAccount && window.ethereum) {
        setAccount(storedAccount);
        if (storedChainId) setChainId(parseInt(storedChainId));
        await checkConnection();
      }
    };

    loadPersistedState();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        disconnectWallet();
      } else if (accounts[0] !== account) {
        // Account changed - refresh all data automatically
        const newAccount = accounts[0];
        setAccount(newAccount);
        localStorage.setItem(STORAGE_KEYS.ACCOUNT, newAccount);
        
        // Reset user data
        setUser(null);
        setIsRegistered(false);
        setIsApproved(false);
        
        // Reconnect with new account
        toast.info('Account changed. Refreshing data...');
        
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          const signer = await provider.getSigner();
          
          setChainId(Number(network.chainId));
          setProvider(provider);
          setSigner(signer);
          setIsConnected(true);
          
          localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
          localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');
          
          // Refresh user data for new account
          const contract = new ethers.Contract(
            contractConfig.address,
            contractConfig.abi,
            provider
          );
          try {
            const userData = await contract.getUser(newAccount);
            const userObject: User = {
              id: Number(userData.id),
              userAddress: userData.userAddress,
              role: userData.role,
              status: Number(userData.status) as UserStatus
            };
            setUser(userObject);
            setIsRegistered(true);
            setIsApproved(userObject.status === UserStatus.Approved);
          } catch (error: any) {
            if (!error.message || !error.message.includes("User does not exist")) {
              console.error('Error fetching user data:', error);
            }
            setUser(null);
            setIsRegistered(false);
            setIsApproved(false);
          }
        } catch (error) {
          console.error('Error reconnecting with new account:', error);
          disconnectWallet();
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      localStorage.setItem(STORAGE_KEYS.CHAIN_ID, newChainId.toString());
      toast.info('Network changed. Reloading page...');
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [account, disconnectWallet]);

  // Check MetaMask availability
  const checkMetaMask = useCallback(() => {
    if (typeof window === 'undefined') {
      toast.error('Please use a browser that supports Web3');
      return false;
    }

    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      return false;
    }

    return true;
  }, []);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!checkMetaMask()) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0].address;
        const network = await provider.getNetwork();
        const signer = await provider.getSigner();

        setAccount(account);
        setChainId(Number(network.chainId));
        setProvider(provider);
        setSigner(signer);
        setIsConnected(true);

        localStorage.setItem(STORAGE_KEYS.ACCOUNT, account);
        localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
        localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');

        // Refresh user data after state is set
        const contract = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        try {
          const userData = await contract.getUser(account);
          const userObject: User = {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
          setUser(userObject);
          setIsRegistered(true);
          setIsApproved(userObject.status === UserStatus.Approved);
        } catch (error: any) {
          if (!error.message || !error.message.includes("User does not exist")) {
            console.error('Error fetching user data:', error);
          }
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    }
  }, [checkMetaMask]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!checkMetaMask()) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        const account = accounts[0];
        const network = await provider.getNetwork();
        const signer = await provider.getSigner();

        setAccount(account);
        setChainId(Number(network.chainId));
        setProvider(provider);
        setSigner(signer);
        setIsConnected(true);

        localStorage.setItem(STORAGE_KEYS.ACCOUNT, account);
        localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
        localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');

        toast.success('Wallet connected successfully!');

        // Refresh user data after state is set
        const contract = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        try {
          const userData = await contract.getUser(account);
          const userObject: User = {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
          setUser(userObject);
          setIsRegistered(true);
          setIsApproved(userObject.status === UserStatus.Approved);
        } catch (error: any) {
          if (!error.message || !error.message.includes("User does not exist")) {
            console.error('Error fetching user data:', error);
          }
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        toast.error('Please connect your MetaMask wallet to continue');
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    }
  }, [checkMetaMask]);


  // Refresh user data from contract
  const refreshUserData = useCallback(async () => {
    if (!account || !provider) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      // Check if user exists by calling getUser
      // If the user doesn't exist, it will throw an error
      try {
        const userData = await contract.getUser(account);
        
        // Convert the user data from the contract
        const userObject: User = {
          id: Number(userData.id),
          userAddress: userData.userAddress,
          role: userData.role,
          status: Number(userData.status) as UserStatus
        };
        
        setUser(userObject);
        setIsRegistered(true);
        setIsApproved(userObject.status === UserStatus.Approved);
      } catch (error: any) {
        // User doesn't exist
        if (error.message && error.message.includes("User does not exist")) {
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [account, provider]);

  const value: Web3ContextType = {
    isConnected,
    account,
    chainId,
    provider,
    signer,
    user,
    isRegistered,
    isApproved,
    connectWallet,
    disconnectWallet,
    checkConnection,
    refreshUserData,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

// Hook to use Web3 context
export function useWeb3() {
  const context = useContext(Web3Context);
  
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  
  return context;
}

// Export UserStatus enum for use in components
export { UserStatus };


```

Problema resuelto. El error era que `disconnectWallet` se usaba antes de su declaración. Moví la definición de `disconnectWallet` antes de los `useEffect` que la usan.

Cambios realizados:
1. Moví `disconnectWallet` antes de los `useEffect` (línea 63) para evitar la referencia adelantada.
2. Eliminé la definición duplicada que estaba más abajo.

Ahora el código:
- Define `disconnectWallet` antes de usarlo
- Puede referenciarlo en el array de dependencias del `useEffect`
- No hay errores de linting

El contexto funciona correctamente y la actualización automática al cambiar de cuenta en MetaMask sigue funcionando.

---

**User**

now execute the new point 5.3 on the @project-plan.md 

---

**Cursor**


Revisando la página de creación de tokens para implementar el punto 5.3: campos dinámicos de metadata con transformación a JSON.


Implementando campos dinámicos de metadata con transformación a JSON:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";

interface MetadataField {
  id: string;
  label: string;
  value: string;
}

interface CreateTokenForm {
  parentId: string;
  amount: string;
}

export default function CreateTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Array<{ id: number; name: string; balance: number }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      metadata: "",
      parentId: "0",
      amount: "",
    },
  });

  const parentId = watch("parentId");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadAvailableTokens();
  }, [account, isConnected, isApproved, router]);

  const loadAvailableTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoadingTokens(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(Number(tokenId));
          const balance = await contract.getTokenBalance(Number(tokenId), account);
          
          if (Number(balance) > 0) {
            let metadata;
            try {
              metadata = JSON.parse(tokenData.metadata);
            } catch {
              metadata = { name: `Token #${tokenId}` };
            }
            
            return {
              id: Number(tokenId),
              name: metadata.name || `Token #${tokenId}`,
              balance: Number(balance),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter((token): token is { id: number; name: string; balance: number } => token !== null);
      setAvailableTokens(validTokens);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const onSubmit = async (data: CreateTokenForm) => {
    if (!account || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate metadata JSON
    let metadata;
    try {
      metadata = JSON.parse(data.metadata);
      // Re-stringify to ensure it's valid JSON
      metadata = JSON.stringify(metadata);
    } catch (error) {
      toast.error("Invalid JSON format for metadata");
      return;
    }

    const parentIdNum = parseInt(data.parentId) || 0;
    const amount = parseInt(data.amount);

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // If parentId is provided, check balance
      if (parentIdNum > 0) {
        const balance = await contract.getTokenBalance(parentIdNum, account);
        if (Number(balance) < amount) {
          toast.error(`Insufficient balance. You have ${Number(balance)} tokens.`);
          setIsSubmitting(false);
          return;
        }
      }

      toast.info("Creating token... Please confirm the transaction in MetaMask.");

      const tx = await contract.createProductToken(metadata, parentIdNum, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Token created successfully!");
      
      router.push('/token');
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient parent token balance")) {
        toast.error("Insufficient balance of parent token");
      } else if (error.message?.includes("Parent token does not exist")) {
        toast.error("Parent token does not exist");
      } else {
        toast.error("Failed to create token. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const selectedParent = availableTokens.find(t => t.id === parseInt(parentId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create Product Token
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new product token in the supply chain
            </p>
          </div>
          <Link href="/token">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new product token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Metadata JSON */}
              <div className="space-y-2">
                <Label htmlFor="metadata">
                  Metadata (JSON) <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="metadata"
                  {...register("metadata", {
                    required: "Metadata is required",
                    validate: (value) => {
                      try {
                        JSON.parse(value);
                        return true;
                      } catch {
                        return "Invalid JSON format";
                      }
                    },
                  })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm min-h-[120px] font-mono"
                  placeholder='{"name": "Product Name", "description": "Product description", "category": "Category"}'
                />
                {errors.metadata && (
                  <p className="text-sm text-red-500">{errors.metadata.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter product information as JSON. Include fields like name, description, category, etc.
                </p>
              </div>

              {/* Parent Token */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Token (Optional)</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="0">No parent (new product)</option>
                  {loadingTokens ? (
                    <option disabled>Loading tokens...</option>
                  ) : availableTokens.length === 0 ? (
                    <option disabled>No tokens available</option>
                  ) : (
                    availableTokens.map((token) => (
                      <option key={token.id} value={token.id.toString()}>
                        {token.name} (ID: #{token.id}, Balance: {token.balance})
                      </option>
                    ))
                  )}
                </select>
                {selectedParent && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {selectedParent.balance} tokens
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select a parent token if this product is created from another product
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Initial Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      if (parentId !== "0" && selectedParent) {
                        if (num > selectedParent.balance) {
                          return `Amount exceeds available balance (${selectedParent.balance})`;
                        }
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Number of tokens to create initially
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/token" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Token"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";

interface MetadataField {
  id: string;
  label: string;
  value: string;
}

interface CreateTokenForm {
  parentId: string;
  amount: string;
}

export default function CreateTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Array<{ id: number; name: string; balance: number }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([
    { id: "1", label: "name", value: "" },
    { id: "2", label: "description", value: "" },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      parentId: "0",
      amount: "",
    },
  });

  const parentId = watch("parentId");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadAvailableTokens();
  }, [account, isConnected, isApproved, router]);

  const loadAvailableTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoadingTokens(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(Number(tokenId));
          const balance = await contract.getTokenBalance(Number(tokenId), account);
          
          if (Number(balance) > 0) {
            let metadata;
            try {
              metadata = JSON.parse(tokenData.metadata);
            } catch {
              metadata = { name: `Token #${tokenId}` };
            }
            
            return {
              id: Number(tokenId),
              name: metadata.name || `Token #${tokenId}`,
              balance: Number(balance),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter((token): token is { id: number; name: string; balance: number } => token !== null);
      setAvailableTokens(validTokens);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const onSubmit = async (data: CreateTokenForm) => {
    if (!account || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate metadata JSON
    let metadata;
    try {
      metadata = JSON.parse(data.metadata);
      // Re-stringify to ensure it's valid JSON
      metadata = JSON.stringify(metadata);
    } catch (error) {
      toast.error("Invalid JSON format for metadata");
      return;
    }

    const parentIdNum = parseInt(data.parentId) || 0;
    const amount = parseInt(data.amount);

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // If parentId is provided, check balance
      if (parentIdNum > 0) {
        const balance = await contract.getTokenBalance(parentIdNum, account);
        if (Number(balance) < amount) {
          toast.error(`Insufficient balance. You have ${Number(balance)} tokens.`);
          setIsSubmitting(false);
          return;
        }
      }

      toast.info("Creating token... Please confirm the transaction in MetaMask.");

      const tx = await contract.createProductToken(metadata, parentIdNum, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Token created successfully!");
      
      router.push('/token');
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient parent token balance")) {
        toast.error("Insufficient balance of parent token");
      } else if (error.message?.includes("Parent token does not exist")) {
        toast.error("Parent token does not exist");
      } else {
        toast.error("Failed to create token. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const selectedParent = availableTokens.find(t => t.id === parseInt(parentId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create Product Token
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new product token in the supply chain
            </p>
          </div>
          <Link href="/token">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new product token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Metadata JSON */}
              <div className="space-y-2">
                <Label htmlFor="metadata">
                  Metadata (JSON) <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="metadata"
                  {...register("metadata", {
                    required: "Metadata is required",
                    validate: (value) => {
                      try {
                        JSON.parse(value);
                        return true;
                      } catch {
                        return "Invalid JSON format";
                      }
                    },
                  })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm min-h-[120px] font-mono"
                  placeholder='{"name": "Product Name", "description": "Product description", "category": "Category"}'
                />
                {errors.metadata && (
                  <p className="text-sm text-red-500">{errors.metadata.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter product information as JSON. Include fields like name, description, category, etc.
                </p>
              </div>

              {/* Parent Token */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Token (Optional)</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="0">No parent (new product)</option>
                  {loadingTokens ? (
                    <option disabled>Loading tokens...</option>
                  ) : availableTokens.length === 0 ? (
                    <option disabled>No tokens available</option>
                  ) : (
                    availableTokens.map((token) => (
                      <option key={token.id} value={token.id.toString()}>
                        {token.name} (ID: #{token.id}, Balance: {token.balance})
                      </option>
                    ))
                  )}
                </select>
                {selectedParent && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {selectedParent.balance} tokens
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select a parent token if this product is created from another product
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Initial Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      if (parentId !== "0" && selectedParent) {
                        if (num > selectedParent.balance) {
                          return `Amount exceeds available balance (${selectedParent.balance})`;
                        }
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Number of tokens to create initially
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/token" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Token"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";

interface MetadataField {
  id: string;
  label: string;
  value: string;
}

interface CreateTokenForm {
  parentId: string;
  amount: string;
}

export default function CreateTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Array<{ id: number; name: string; balance: number }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([
    { id: "1", label: "name", value: "" },
    { id: "2", label: "description", value: "" },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      parentId: "0",
      amount: "",
    },
  });

  const parentId = watch("parentId");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadAvailableTokens();
  }, [account, isConnected, isApproved, router]);

  const loadAvailableTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoadingTokens(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(Number(tokenId));
          const balance = await contract.getTokenBalance(Number(tokenId), account);
          
          if (Number(balance) > 0) {
            let metadata;
            try {
              metadata = JSON.parse(tokenData.metadata);
            } catch {
              metadata = { name: `Token #${tokenId}` };
            }
            
            return {
              id: Number(tokenId),
              name: metadata.name || `Token #${tokenId}`,
              balance: Number(balance),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter((token): token is { id: number; name: string; balance: number } => token !== null);
      setAvailableTokens(validTokens);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Add new metadata field
  const addMetadataField = () => {
    const newField: MetadataField = {
      id: Date.now().toString(),
      label: "",
      value: "",
    };
    setMetadataFields([...metadataFields, newField]);
  };

  // Remove metadata field
  const removeMetadataField = (id: string) => {
    if (metadataFields.length <= 1) {
      toast.error("At least one metadata field is required");
      return;
    }
    setMetadataFields(metadataFields.filter((field) => field.id !== id));
  };

  // Update metadata field
  const updateMetadataField = (id: string, field: "label" | "value", value: string) => {
    setMetadataFields(
      metadataFields.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  // Transform metadata fields to JSON
  const transformMetadataToJSON = (): string => {
    const metadataObject: Record<string, string> = {};

    metadataFields.forEach((field) => {
      // Trim and lowercase labels, trim values
      const processedLabel = field.label.trim().toLowerCase();
      const processedValue = field.value.trim();

      // Only add if both label and value are not empty
      if (processedLabel && processedValue) {
        metadataObject[processedLabel] = processedValue;
      }
    });

    // Validate that we have at least one field
    if (Object.keys(metadataObject).length === 0) {
      throw new Error("At least one metadata field with both label and value is required");
    }

    return JSON.stringify(metadataObject);
  };

  const onSubmit = async (data: CreateTokenForm) => {
    if (!account || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    // Transform metadata fields to JSON
    let metadata: string;
    try {
      metadata = transformMetadataToJSON();
    } catch (error: any) {
      toast.error(error.message || "Invalid metadata format");
      return;
    }

    const parentIdNum = parseInt(data.parentId) || 0;
    const amount = parseInt(data.amount);

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // If parentId is provided, check balance
      if (parentIdNum > 0) {
        const balance = await contract.getTokenBalance(parentIdNum, account);
        if (Number(balance) < amount) {
          toast.error(`Insufficient balance. You have ${Number(balance)} tokens.`);
          setIsSubmitting(false);
          return;
        }
      }

      toast.info("Creating token... Please confirm the transaction in MetaMask.");

      const tx = await contract.createProductToken(metadata, parentIdNum, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Token created successfully!");
      
      router.push('/token');
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient parent token balance")) {
        toast.error("Insufficient balance of parent token");
      } else if (error.message?.includes("Parent token does not exist")) {
        toast.error("Parent token does not exist");
      } else {
        toast.error("Failed to create token. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const selectedParent = availableTokens.find(t => t.id === parseInt(parentId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create Product Token
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new product token in the supply chain
            </p>
          </div>
          <Link href="/token">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new product token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Metadata JSON */}
              <div className="space-y-2">
                <Label htmlFor="metadata">
                  Metadata (JSON) <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="metadata"
                  {...register("metadata", {
                    required: "Metadata is required",
                    validate: (value) => {
                      try {
                        JSON.parse(value);
                        return true;
                      } catch {
                        return "Invalid JSON format";
                      }
                    },
                  })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm min-h-[120px] font-mono"
                  placeholder='{"name": "Product Name", "description": "Product description", "category": "Category"}'
                />
                {errors.metadata && (
                  <p className="text-sm text-red-500">{errors.metadata.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter product information as JSON. Include fields like name, description, category, etc.
                </p>
              </div>

              {/* Parent Token */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Token (Optional)</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="0">No parent (new product)</option>
                  {loadingTokens ? (
                    <option disabled>Loading tokens...</option>
                  ) : availableTokens.length === 0 ? (
                    <option disabled>No tokens available</option>
                  ) : (
                    availableTokens.map((token) => (
                      <option key={token.id} value={token.id.toString()}>
                        {token.name} (ID: #{token.id}, Balance: {token.balance})
                      </option>
                    ))
                  )}
                </select>
                {selectedParent && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {selectedParent.balance} tokens
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select a parent token if this product is created from another product
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Initial Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      if (parentId !== "0" && selectedParent) {
                        if (num > selectedParent.balance) {
                          return `Amount exceeds available balance (${selectedParent.balance})`;
                        }
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Number of tokens to create initially
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/token" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Token"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";

interface MetadataField {
  id: string;
  label: string;
  value: string;
}

interface CreateTokenForm {
  parentId: string;
  amount: string;
}

export default function CreateTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Array<{ id: number; name: string; balance: number }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([
    { id: "1", label: "name", value: "" },
    { id: "2", label: "description", value: "" },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      parentId: "0",
      amount: "",
    },
  });

  const parentId = watch("parentId");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadAvailableTokens();
  }, [account, isConnected, isApproved, router]);

  const loadAvailableTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoadingTokens(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(Number(tokenId));
          const balance = await contract.getTokenBalance(Number(tokenId), account);
          
          if (Number(balance) > 0) {
            let metadata;
            try {
              metadata = JSON.parse(tokenData.metadata);
            } catch {
              metadata = { name: `Token #${tokenId}` };
            }
            
            return {
              id: Number(tokenId),
              name: metadata.name || `Token #${tokenId}`,
              balance: Number(balance),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter((token): token is { id: number; name: string; balance: number } => token !== null);
      setAvailableTokens(validTokens);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Add new metadata field
  const addMetadataField = () => {
    const newField: MetadataField = {
      id: Date.now().toString(),
      label: "",
      value: "",
    };
    setMetadataFields([...metadataFields, newField]);
  };

  // Remove metadata field
  const removeMetadataField = (id: string) => {
    if (metadataFields.length <= 1) {
      toast.error("At least one metadata field is required");
      return;
    }
    setMetadataFields(metadataFields.filter((field) => field.id !== id));
  };

  // Update metadata field
  const updateMetadataField = (id: string, field: "label" | "value", value: string) => {
    setMetadataFields(
      metadataFields.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  // Transform metadata fields to JSON
  const transformMetadataToJSON = (): string => {
    const metadataObject: Record<string, string> = {};

    metadataFields.forEach((field) => {
      // Trim and lowercase labels, trim values
      const processedLabel = field.label.trim().toLowerCase();
      const processedValue = field.value.trim();

      // Only add if both label and value are not empty
      if (processedLabel && processedValue) {
        metadataObject[processedLabel] = processedValue;
      }
    });

    // Validate that we have at least one field
    if (Object.keys(metadataObject).length === 0) {
      throw new Error("At least one metadata field with both label and value is required");
    }

    return JSON.stringify(metadataObject);
  };

  const onSubmit = async (data: CreateTokenForm) => {
    if (!account || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    // Transform metadata fields to JSON
    let metadata: string;
    try {
      metadata = transformMetadataToJSON();
    } catch (error: any) {
      toast.error(error.message || "Invalid metadata format");
      return;
    }

    const parentIdNum = parseInt(data.parentId) || 0;
    const amount = parseInt(data.amount);

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // If parentId is provided, check balance
      if (parentIdNum > 0) {
        const balance = await contract.getTokenBalance(parentIdNum, account);
        if (Number(balance) < amount) {
          toast.error(`Insufficient balance. You have ${Number(balance)} tokens.`);
          setIsSubmitting(false);
          return;
        }
      }

      toast.info("Creating token... Please confirm the transaction in MetaMask.");

      const tx = await contract.createProductToken(metadata, parentIdNum, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Token created successfully!");
      
      router.push('/token');
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient parent token balance")) {
        toast.error("Insufficient balance of parent token");
      } else if (error.message?.includes("Parent token does not exist")) {
        toast.error("Parent token does not exist");
      } else {
        toast.error("Failed to create token. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const selectedParent = availableTokens.find(t => t.id === parseInt(parentId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create Product Token
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new product token in the supply chain
            </p>
          </div>
          <Link href="/token">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new product token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Dynamic Metadata Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Product Metadata <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMetadataField}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Field
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {metadataFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`label-${field.id}`} className="text-xs">
                            Label
                          </Label>
                          <Input
                            id={`label-${field.id}`}
                            type="text"
                            value={field.label}
                            onChange={(e) => updateMetadataField(field.id, "label", e.target.value)}
                            placeholder="e.g., name, category, brand"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`value-${field.id}`} className="text-xs">
                            Value
                          </Label>
                          <Input
                            id={`value-${field.id}`}
                            type="text"
                            value={field.value}
                            onChange={(e) => updateMetadataField(field.id, "value", e.target.value)}
                            placeholder="Enter value"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMetadataField(field.id)}
                        className="mt-6 h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={metadataFields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Note:</strong> Labels will be automatically converted to lowercase and trimmed. Values will be trimmed.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    At least one field with both label and value is required.
                  </p>
                </div>

                {/* Preview JSON */}
                {metadataFields.some((f) => f.label.trim() && f.value.trim()) && (
                  <div className="p-3 bg-muted rounded-md">
                    <Label className="text-xs mb-2 block">JSON Preview:</Label>
                    <pre className="text-xs font-mono overflow-auto max-h-32 bg-background p-2 rounded border">
                      {(() => {
                        try {
                          const preview = transformMetadataToJSON();
                          return JSON.stringify(JSON.parse(preview), null, 2);
                        } catch {
                          return "Invalid metadata";
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </div>

              {/* Parent Token */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Token (Optional)</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="0">No parent (new product)</option>
                  {loadingTokens ? (
                    <option disabled>Loading tokens...</option>
                  ) : availableTokens.length === 0 ? (
                    <option disabled>No tokens available</option>
                  ) : (
                    availableTokens.map((token) => (
                      <option key={token.id} value={token.id.toString()}>
                        {token.name} (ID: #{token.id}, Balance: {token.balance})
                      </option>
                    ))
                  )}
                </select>
                {selectedParent && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {selectedParent.balance} tokens
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select a parent token if this product is created from another product
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Initial Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      if (parentId !== "0" && selectedParent) {
                        if (num > selectedParent.balance) {
                          return `Amount exceeds available balance (${selectedParent.balance})`;
                        }
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Number of tokens to create initially
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/token" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Token"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

Verificando si `lucide-react` está instalado. Si no, usaremos otro método para los iconos:


`lucide-react` ya está instalado. Revisando el archivo completo para asegurar que todo esté correcto:


Implementación del punto 5.3 completada. Resumen de cambios:

## Implementación del punto 5.3 - Frontend token creation metadata JSON

### Características implementadas:

1. Campos dinámicos de metadata
   - Reemplazo del textarea JSON por campos dinámicos (label + value)
   - Botón "Add Field" para agregar campos
   - Botón de eliminar en cada campo (mínimo 1 campo requerido)
   - Campos iniciales: "name" y "description"

2. Transformación y validación
   - Función `transformMetadataToJSON()` que:
     - Convierte labels a minúsculas y los recorta
     - Recorta los valores
     - Filtra campos vacíos
     - Convierte todo a JSON válido
   - Validación: requiere al menos un campo con label y value

3. Vista previa del JSON
   - Muestra el JSON formateado en tiempo real mientras el usuario escribe
   - Solo aparece cuando hay al menos un campo con datos

4. Interfaz de usuario
   - Diseño con dos columnas (Label | Value)
   - Botones de agregar/eliminar
   - Notas informativas sobre el procesamiento automático
   - Vista previa del JSON formateado

### Funcionalidades:

- Agregar campos: botón "Add Field" para agregar campos ilimitados
- Eliminar campos: botón de eliminar por campo (mínimo 1)
- Validación en tiempo real: verifica que haya al menos un campo completo
- Procesamiento automático: labels a minúsculas y recorte de valores
- Vista previa: muestra el JSON resultante antes de enviar

El formulario ahora permite crear metadata de forma más intuitiva, sin escribir JSON manualmente, y el sistema procesa los datos antes de enviarlos al contrato.

---

**User**

point 5.3 of the @project-plan.md looks good, nice work!!, now continue with 5.4

---

**Cursor**


Implementando el punto 5.4: simplificar el formulario de transferencia con un select de destinatarios según el rol del usuario. Revisando la página actual de transferencia:


Actualizando el formulario de transferencia para usar un select con destinatarios filtrados según el rol del usuario:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<Array<{ address: string; role: string }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!provider) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all users (if admin) or get approved users
      // For now, we'll just allow manual address input
      // In a real app, you might want to fetch all approved users
      setAvailableUsers([]);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="to"
                  type="text"
                  {...register("to", {
                    required: "Recipient address is required",
                    validate: (value) => {
                      if (!ethers.isAddress(value.trim())) {
                        return "Invalid Ethereum address";
                      }
                      if (value.trim().toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  })}
                  placeholder="0x..."
                  className="font-mono"
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the Ethereum address of the recipient. They must be a registered and approved user.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!provider) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all users (if admin) or get approved users
      // For now, we'll just allow manual address input
      // In a real app, you might want to fetch all approved users
      setAvailableUsers([]);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="to"
                  type="text"
                  {...register("to", {
                    required: "Recipient address is required",
                    validate: (value) => {
                      if (!ethers.isAddress(value.trim())) {
                        return "Invalid Ethereum address";
                      }
                      if (value.trim().toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  })}
                  placeholder="0x..."
                  className="font-mono"
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the Ethereum address of the recipient. They must be a registered and approved user.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    if (!provider || !user) return;

    try {
      setLoadingUsers(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let allUserAddresses: string[] = [];

      // Try to get all users (works if user is admin/owner)
      try {
        if (user.role === "Admin") {
          allUserAddresses = await contract.getAllUsers();
        } else {
          // For non-admin users, we need to get users differently
          // Since we don't have a public method to get all users,
          // we'll try to get users from the contract's userAddresses array
          // This might not work if the contract doesn't expose it
          // For now, we'll show an empty list and let the user know
          console.warn("Cannot fetch all users as non-admin. Admin functionality needed.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
      } catch (error: any) {
        // If getAllUsers fails (not admin), we can't fetch the list
        console.error("Cannot fetch users list:", error);
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Filter users by role and status
      const userPromises = allUserAddresses.map(async (address: string) => {
        try {
          const userData = await contract.getUser(address);
          const userRole = userData.role;
          const userStatus = Number(userData.status);
          
          // Only include approved users with the next role in chain
          if (userRole === nextRole && userStatus === 1) { // 1 = Approved
            return {
              address,
              role: userRole,
              id: Number(userData.id),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const userResults = await Promise.all(userPromises);
      const validUsers = userResults.filter(
        (user): user is AvailableUser => user !== null
      );

      setAvailableUsers(validUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="to"
                  type="text"
                  {...register("to", {
                    required: "Recipient address is required",
                    validate: (value) => {
                      if (!ethers.isAddress(value.trim())) {
                        return "Invalid Ethereum address";
                      }
                      if (value.trim().toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  })}
                  placeholder="0x..."
                  className="font-mono"
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the Ethereum address of the recipient. They must be a registered and approved user.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    if (!provider || !user) return;

    try {
      setLoadingUsers(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let allUserAddresses: string[] = [];

      // Try to get all users (works if user is admin/owner)
      try {
        if (user.role === "Admin") {
          allUserAddresses = await contract.getAllUsers();
        } else {
          // For non-admin users, we need to get users differently
          // Since we don't have a public method to get all users,
          // we'll try to get users from the contract's userAddresses array
          // This might not work if the contract doesn't expose it
          // For now, we'll show an empty list and let the user know
          console.warn("Cannot fetch all users as non-admin. Admin functionality needed.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
      } catch (error: any) {
        // If getAllUsers fails (not admin), we can't fetch the list
        console.error("Cannot fetch users list:", error);
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Filter users by role and status
      const userPromises = allUserAddresses.map(async (address: string) => {
        try {
          const userData = await contract.getUser(address);
          const userRole = userData.role;
          const userStatus = Number(userData.status);
          
          // Only include approved users with the next role in chain
          if (userRole === nextRole && userStatus === 1) { // 1 = Approved
            return {
              address,
              role: userRole,
              id: Number(userData.id),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const userResults = await Promise.all(userPromises);
      const validUsers = userResults.filter(
        (user): user is AvailableUser => user !== null
      );

      setAvailableUsers(validUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="to"
                  type="text"
                  {...register("to", {
                    required: "Recipient address is required",
                    validate: (value) => {
                      if (!ethers.isAddress(value.trim())) {
                        return "Invalid Ethereum address";
                      }
                      if (value.trim().toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  })}
                  placeholder="0x..."
                  className="font-mono"
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter the Ethereum address of the recipient. They must be a registered and approved user.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    if (!provider || !user) return;

    try {
      setLoadingUsers(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let allUserAddresses: string[] = [];

      // Try to get all users (works if user is admin/owner)
      try {
        if (user.role === "Admin") {
          allUserAddresses = await contract.getAllUsers();
        } else {
          // For non-admin users, we need to get users differently
          // Since we don't have a public method to get all users,
          // we'll try to get users from the contract's userAddresses array
          // This might not work if the contract doesn't expose it
          // For now, we'll show an empty list and let the user know
          console.warn("Cannot fetch all users as non-admin. Admin functionality needed.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
      } catch (error: any) {
        // If getAllUsers fails (not admin), we can't fetch the list
        console.error("Cannot fetch users list:", error);
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Filter users by role and status
      const userPromises = allUserAddresses.map(async (address: string) => {
        try {
          const userData = await contract.getUser(address);
          const userRole = userData.role;
          const userStatus = Number(userData.status);
          
          // Only include approved users with the next role in chain
          if (userRole === nextRole && userStatus === 1) { // 1 = Approved
            return {
              address,
              role: userRole,
              id: Number(userData.id),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const userResults = await Promise.all(userPromises);
      const validUsers = userResults.filter(
        (user): user is AvailableUser => user !== null
      );

      setAvailableUsers(validUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <p className="text-xs text-yellow-600">
                    {user?.role === "Admin" 
                      ? "No approved users found for the next role in the supply chain."
                      : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found. Only ${getNextRoleInChain(user?.role || "") || "next role"} users can receive transfers from ${user?.role || "your role"}.`
                    }
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

Mejorando el manejo para usuarios no admin/owner, permitiendo intentar obtener la lista y mostrando un mensaje claro si falla:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    if (!provider || !user) return;

    try {
      setLoadingUsers(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let allUserAddresses: string[] = [];

      // Try to get all users (works if user is contract owner)
      // Note: getAllUsers() requires owner privileges, not just admin role
      try {
        allUserAddresses = await contract.getAllUsers();
      } catch (error: any) {
        // If getAllUsers fails (user is not contract owner), we can't fetch the list
        console.warn("Cannot fetch users list. User must be contract owner to view all users.");
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Filter users by role and status
      const userPromises = allUserAddresses.map(async (address: string) => {
        try {
          const userData = await contract.getUser(address);
          const userRole = userData.role;
          const userStatus = Number(userData.status);
          
          // Only include approved users with the next role in chain
          if (userRole === nextRole && userStatus === 1) { // 1 = Approved
            return {
              address,
              role: userRole,
              id: Number(userData.id),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const userResults = await Promise.all(userPromises);
      const validUsers = userResults.filter(
        (user): user is AvailableUser => user !== null
      );

      setAvailableUsers(validUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <p className="text-xs text-yellow-600">
                    {user?.role === "Admin" 
                      ? "No approved users found for the next role in the supply chain."
                      : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found. Only ${getNextRoleInChain(user?.role || "") || "next role"} users can receive transfers from ${user?.role || "your role"}.`
                    }
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

Mejorando el mensaje de error para aclarar la limitación:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    if (!provider || !user) return;

    try {
      setLoadingUsers(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let allUserAddresses: string[] = [];

      // Try to get all users (works if user is contract owner)
      // Note: getAllUsers() requires owner privileges, not just admin role
      try {
        allUserAddresses = await contract.getAllUsers();
      } catch (error: any) {
        // If getAllUsers fails (user is not contract owner), we can't fetch the list
        console.warn("Cannot fetch users list. User must be contract owner to view all users.");
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Filter users by role and status
      const userPromises = allUserAddresses.map(async (address: string) => {
        try {
          const userData = await contract.getUser(address);
          const userRole = userData.role;
          const userStatus = Number(userData.status);
          
          // Only include approved users with the next role in chain
          if (userRole === nextRole && userStatus === 1) { // 1 = Approved
            return {
              address,
              role: userRole,
              id: Number(userData.id),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const userResults = await Promise.all(userPromises);
      const validUsers = userResults.filter(
        (user): user is AvailableUser => user !== null
      );

      setAvailableUsers(validUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {!loadingUsers && availableUsers.length === 0 && " Note: User list requires contract owner privileges to load."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

Corrigiendo un pequeño error en la lógica del mensaje:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    if (!provider || !user) return;

    try {
      setLoadingUsers(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let allUserAddresses: string[] = [];

      // Try to get all users (works if user is contract owner)
      // Note: getAllUsers() requires owner privileges, not just admin role
      try {
        allUserAddresses = await contract.getAllUsers();
      } catch (error: any) {
        // If getAllUsers fails (user is not contract owner), we can't fetch the list
        console.warn("Cannot fetch users list. User must be contract owner to view all users.");
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Filter users by role and status
      const userPromises = allUserAddresses.map(async (address: string) => {
        try {
          const userData = await contract.getUser(address);
          const userRole = userData.role;
          const userStatus = Number(userData.status);
          
          // Only include approved users with the next role in chain
          if (userRole === nextRole && userStatus === 1) { // 1 = Approved
            return {
              address,
              role: userRole,
              id: Number(userData.id),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const userResults = await Promise.all(userPromises);
      const validUsers = userResults.filter(
        (user): user is AvailableUser => user !== null
      );

      setAvailableUsers(validUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {" Note: User list requires contract owner privileges to load."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

## Implementación del punto 5.4 - Frontend token transfer form

### Características implementadas

1. Campo select para destinatario
   - Reemplazado el input de texto por un `<Select>` con lista de destinatarios
   - Muestra rol y dirección abreviada de cada opción

2. Filtrado por cadena de suministro
   - Función `getNextRoleInChain()` que determina el siguiente rol:
     - Producer → Factory
     - Factory → Retailer
     - Retailer → Consumer
   - Solo muestra usuarios aprobados del siguiente rol en la cadena

3. Validación mejorada
   - Validación del destinatario seleccionado
   - Verificación de que el destinatario esté en la lista disponible
   - Validación de cantidad (mínimo 1, máximo balance disponible)
   - Mensajes de error claros

4. Carga de usuarios
   - Intenta obtener todos los usuarios del contrato (requiere privilegios de owner)
   - Filtra por rol siguiente y estado aprobado
   - Manejo de errores cuando no se puede obtener la lista

5. Interfaz de usuario
   - Select con placeholder dinámico
   - Muestra estado de carga mientras busca usuarios
   - Mensajes informativos sobre restricciones de rol
   - Deshabilitado cuando no hay usuarios disponibles

### Flujo de trabajo

1. Usuario abre el formulario de transferencia
2. Sistema carga automáticamente usuarios aprobados del siguiente rol
3. Usuario selecciona destinatario del select
4. Usuario ingresa cantidad
5. Validación antes de enviar
6. Creación de la solicitud de transferencia

### Nota sobre limitaciones

El sistema requiere privilegios de contract owner para obtener la lista completa de usuarios. Si no se tienen esos privilegios, se muestra un mensaje informativo. Para producción, considera agregar una función de vista en el contrato que permita obtener usuarios aprobados por rol sin requerir privilegios de owner.

El formulario de transferencia está simplificado y facilita la selección del destinatario correcto según la cadena de suministro.

---

**User**

Tenemos un problema en la page @page.tsx del transfer

ya he hecho la aprobacion de un usuario factory en este caso el address 0xa0ee7a142d267c1f36714e4a8f75612f20a79720 sin embargo el field sigue no detectando el usuario, probablemente debido a permisos en el smartcontract para listar los usuarios, en este punto debemos tomar una desicion y debe ser la mejor para no comprometer la seguridad, dejamos el field que se llene con el address manualmente, o modificamos el smart contract para a. puede ser remover el permiso que impide obtener el listado necesario para este form (creo que no es lo mejor) o b. crear una funcion alterna para obtener esta informacion pero que el response sea limitado. 

viendo que este es un proyecto de aprendizje y aplicando mis conocimientos adquiridos durante el curso creo que podriamos implemntar la opcion b en la modificacion del contrato, a menos que segun tu evaluacion y criterio no sea la solucion mas adecuada

---

**Cursor**


Implementando la opción b: agregando una función en el contrato para obtener usuarios aprobados por rol, accesible para usuarios aprobados y sin exponer información innecesaria. Actualizando el contrato y el frontend.


Agregando una función en el contrato para obtener usuarios aprobados por rol, accesible para usuarios aprobados y limitada en la información expuesta:


```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title SupplyChainTracker
 * @dev Educational smart contract for tracking supplies on-chain
 * @notice Advanced supply chain tracking with user roles, product tokens, and transfer system
 */
contract SupplyChainTracker {
    // State variables
    address public owner;
    uint256 public totalProductTokens;
    uint256 public totalUsers;
    uint256 public totalTransfers;
    
    // User status enumeration
    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }
    
    // Transfer status enumeration
    enum TransferStatus {
        Pending,
        Accepted,
        Rejected
    }
    
    // User structure
    struct User {
        uint256 id;
        address userAddress;
        string role;
        UserStatus status;
    }
    
    // ProductToken structure - replaces SupplyItem
    struct ProductToken {
        uint256 id;
        address creator;
        string metadata; // JSON string for product features
        uint256 parentId; // 0 if no parent, otherwise parent product ID
        uint256 timestamp;
        bool isActive;
    }
    
    // Transfer structure
    struct Transfer {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        uint256 amount;
        TransferStatus status;
        uint256 requestTimestamp;
        uint256 responseTimestamp;
    }
    
    // Mappings
    mapping(address => User) public users;
    mapping(uint256 => ProductToken) public productTokens;
    mapping(string => bool) public validRoles;
    
    // Token balances: mapping(tokenId => mapping(address => balance))
    mapping(uint256 => mapping(address => uint256)) public balances;
    
    // Token total supply: mapping(tokenId => totalSupply)
    mapping(uint256 => uint256) public tokenTotalSupply;
    
    // Transfers: mapping(transferId => Transfer)
    mapping(uint256 => Transfer) public transfers;
    
    // Pending transfers by address: mapping(address => transferId[])
    mapping(address => uint256[]) public pendingTransfersByAddress;
    
    // Transaction history by token: mapping(tokenId => transferId[])
    mapping(uint256 => uint256[]) public tokenTransactionHistory;
    
    // Arrays
    address[] public userAddresses;
    uint256[] public productTokenIds;
    uint256[] public transferIds;
    
    // Events
    event UserRegistered(uint256 indexed id, address indexed userAddress, string role, UserStatus status);
    event UserStatusUpdated(uint256 indexed id, address indexed userAddress, UserStatus newStatus);
    event ProductTokenCreated(uint256 indexed tokenId, address indexed creator, string metadata, uint256 parentId);
    event TransferRequestCreated(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address to, uint256 amount);
    event TransferAccepted(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address to, uint256 amount);
    event TransferRejected(uint256 indexed transferId, uint256 indexed tokenId, address indexed from, address to, uint256 amount);
    
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
        totalProductTokens = 0;
        totalUsers = 0;
        totalTransfers = 0;
        
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
     * @dev Get approved users by role (Approved users only)
     * @notice This function allows approved users to get a list of approved users
     *         for a specific role, useful for transfer operations
     * @param _role The role to filter by (e.g., "Factory", "Retailer", "Consumer")
     * @return addresses Array of addresses of approved users with the specified role
     */
    function getApprovedUsersByRole(string memory _role) 
        public 
        view 
        onlyApprovedUser 
        returns (address[] memory) 
    {
        require(validRoles[_role], "Invalid role");
        
        // Count approved users with the specified role
        uint256 count = 0;
        for (uint256 i = 0; i < userAddresses.length; i++) {
            address userAddr = userAddresses[i];
            if (
                users[userAddr].id != 0 &&
                users[userAddr].status == UserStatus.Approved &&
                keccak256(bytes(users[userAddr].role)) == keccak256(bytes(_role))
            ) {
                count++;
            }
        }
        
        // Create array with exact size
        address[] memory result = new address[](count);
        uint256 index = 0;
        
        // Populate array
        for (uint256 i = 0; i < userAddresses.length; i++) {
            address userAddr = userAddresses[i];
            if (
                users[userAddr].id != 0 &&
                users[userAddr].status == UserStatus.Approved &&
                keccak256(bytes(users[userAddr].role)) == keccak256(bytes(_role))
            ) {
                result[index] = userAddr;
                index++;
            }
        }
        
        return result;
    }
    
    // ==================== ProductToken Functions ====================
    
    /**
     * @dev Create a new product token (Approved users only)
     * @param _metadata JSON string containing product features
     * @param _parentId Parent product ID (0 if no parent)
     * @param _amount Initial amount of tokens to mint
     * @return tokenId The ID of the newly created product token
     */
    function createProductToken(
        string memory _metadata,
        uint256 _parentId,
        uint256 _amount
    ) 
        public 
        onlyApprovedUser
        returns (uint256) 
    {
        require(_amount > 0, "Amount must be greater than 0");
        
        // If parentId is provided, validate it exists and user has balance
        if (_parentId > 0) {
            require(productTokens[_parentId].id != 0, "Parent token does not exist");
            require(productTokens[_parentId].isActive, "Parent token is not active");
            require(balances[_parentId][msg.sender] >= _amount, "Insufficient parent token balance");
            
            // Update parent token balance (deduct from inventory)
            balances[_parentId][msg.sender] -= _amount;
        }
        
        // Calculate next sequential token ID
        totalProductTokens++;
        uint256 tokenId = totalProductTokens;
        
        // Create product token
        productTokens[tokenId] = ProductToken({
            id: tokenId,
            creator: msg.sender,
            metadata: _metadata,
            parentId: _parentId,
            timestamp: block.timestamp,
            isActive: true
        });
        
        // Mint tokens to creator
        balances[tokenId][msg.sender] += _amount;
        tokenTotalSupply[tokenId] += _amount;
        
        productTokenIds.push(tokenId);
        
        emit ProductTokenCreated(tokenId, msg.sender, _metadata, _parentId);
        
        return tokenId;
    }
    
    /**
     * @dev Get product token details
     * @param _tokenId Token ID
     * @return ProductToken struct with all details
     */
    function getProductToken(uint256 _tokenId) public view returns (ProductToken memory) {
        require(productTokens[_tokenId].id != 0, "Product token does not exist");
        return productTokens[_tokenId];
    }
    
    /**
     * @dev Get token balance for an address
     * @param _tokenId Token ID
     * @param _address Address to check balance
     * @return Balance amount
     */
    function getTokenBalance(uint256 _tokenId, address _address) public view returns (uint256) {
        return balances[_tokenId][_address];
    }
    
    /**
     * @dev Get total supply of a token
     * @param _tokenId Token ID
     * @return Total supply amount
     */
    function getTokenTotalSupply(uint256 _tokenId) public view returns (uint256) {
        return tokenTotalSupply[_tokenId];
    }
    
    /**
     * @dev Get total number of product tokens
     * @return Total count of product tokens
     */
    function getTotalProductTokens() public view returns (uint256) {
        return totalProductTokens;
    }
    
    /**
     * @dev Get all product token IDs
     * @return Array of all product token IDs
     */
    function getAllProductTokenIds() public view returns (uint256[] memory) {
        return productTokenIds;
    }
    
    // ==================== Transfer Functions ====================
    
    /**
     * @dev Create a transfer request (Approved users only)
     * @param _tokenId Token ID to transfer
     * @param _to Destination address
     * @param _amount Amount of tokens to transfer
     * @return transferId The ID of the newly created transfer request
     */
    function createTransferRequest(
        uint256 _tokenId,
        address _to,
        uint256 _amount
    )
        public
        onlyApprovedUser
        returns (uint256)
    {
        require(productTokens[_tokenId].id != 0, "Product token does not exist");
        require(productTokens[_tokenId].isActive, "Product token is not active");
        require(_to != address(0), "Invalid destination address");
        require(_to != msg.sender, "Cannot transfer to yourself");
        require(_amount > 0, "Amount must be greater than 0");
        require(balances[_tokenId][msg.sender] >= _amount, "Insufficient balance");
        require(users[_to].id != 0, "Destination user does not exist");
        require(users[_to].status == UserStatus.Approved, "Destination user not approved");
        
        // Calculate next sequential transfer ID
        totalTransfers++;
        uint256 transferId = totalTransfers;
        
        // Create transfer request
        transfers[transferId] = Transfer({
            id: transferId,
            tokenId: _tokenId,
            from: msg.sender,
            to: _to,
            amount: _amount,
            status: TransferStatus.Pending,
            requestTimestamp: block.timestamp,
            responseTimestamp: 0
        });
        
        // Lock tokens (subtract from sender's balance temporarily)
        balances[_tokenId][msg.sender] -= _amount;
        
        // Add to pending transfers lists
        pendingTransfersByAddress[_to].push(transferId);
        transferIds.push(transferId);
        
        emit TransferRequestCreated(transferId, _tokenId, msg.sender, _to, _amount);
        
        return transferId;
    }
    
    /**
     * @dev Accept a transfer request (Only destination address)
     * @param _transferId Transfer ID to accept
     */
    function acceptTransfer(uint256 _transferId) public {
        Transfer storage transfer = transfers[_transferId];
        require(transfer.id != 0, "Transfer does not exist");
        require(transfer.to == msg.sender, "Only destination can accept");
        require(transfer.status == TransferStatus.Pending, "Transfer not pending");
        
        // Update transfer status
        transfer.status = TransferStatus.Accepted;
        transfer.responseTimestamp = block.timestamp;
        
        // Transfer tokens to destination
        balances[transfer.tokenId][transfer.to] += transfer.amount;
        
        // Add to transaction history
        tokenTransactionHistory[transfer.tokenId].push(_transferId);
        
        emit TransferAccepted(
            _transferId,
            transfer.tokenId,
            transfer.from,
            transfer.to,
            transfer.amount
        );
    }
    
    /**
     * @dev Reject a transfer request (Only destination address)
     * @param _transferId Transfer ID to reject
     */
    function rejectTransfer(uint256 _transferId) public {
        Transfer storage transfer = transfers[_transferId];
        require(transfer.id != 0, "Transfer does not exist");
        require(transfer.to == msg.sender, "Only destination can reject");
        require(transfer.status == TransferStatus.Pending, "Transfer not pending");
        
        // Update transfer status
        transfer.status = TransferStatus.Rejected;
        transfer.responseTimestamp = block.timestamp;
        
        // Return tokens to sender
        balances[transfer.tokenId][transfer.from] += transfer.amount;
        
        emit TransferRejected(
            _transferId,
            transfer.tokenId,
            transfer.from,
            transfer.to,
            transfer.amount
        );
    }
    
    /**
     * @dev Get transfer details
     * @param _transferId Transfer ID
     * @return Transfer struct with all details
     */
    function getTransfer(uint256 _transferId) public view returns (Transfer memory) {
        require(transfers[_transferId].id != 0, "Transfer does not exist");
        return transfers[_transferId];
    }
    
    /**
     * @dev Get all pending transfers for an address
     * @param _address Address to get pending transfers for
     * @return Array of transfer IDs
     */
    function getPendingTransfers(address _address) public view returns (uint256[] memory) {
        return pendingTransfersByAddress[_address];
    }
    
    /**
     * @dev Get transaction chain history for a product token
     * @param _tokenId Token ID
     * @return Array of transfer IDs representing the transaction history
     */
    function getTokenTransactionHistory(uint256 _tokenId) public view returns (uint256[] memory) {
        return tokenTransactionHistory[_tokenId];
    }
    
    /**
     * @dev Get total number of transfers
     * @return Total count of transfers
     */
    function getTotalTransfers() public view returns (uint256) {
        return totalTransfers;
    }
}

```

Actualizando el frontend para usar la nueva función y agregando tests para la función del contrato:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    if (!provider || !user) return;

    try {
      setLoadingUsers(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Use the new function to get approved users by role
      // This function is accessible to all approved users
      try {
        const userAddresses: string[] = await contract.getApprovedUsersByRole(nextRole);
        
        // Get user details for each address
        const userPromises = userAddresses.map(async (address: string) => {
          try {
            const userData = await contract.getUser(address);
            return {
              address,
              role: userData.role,
              id: Number(userData.id),
            };
          } catch (error) {
            console.error(`Error fetching user ${address}:`, error);
            return null;
          }
        });

        const userResults = await Promise.all(userPromises);
        const validUsers = userResults.filter(
          (user): user is AvailableUser => user !== null
        );

        setAvailableUsers(validUsers);
      } catch (error: any) {
        console.error("Error loading users by role:", error);
        // If the function doesn't exist yet (old contract), show empty list
        if (error.message?.includes("getApprovedUsersByRole") || 
            error.message?.includes("function does not exist")) {
          console.warn("Contract does not have getApprovedUsersByRole function. Please update the contract.");
        }
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {" Note: User list requires contract owner privileges to load."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    if (!provider || !user) return;

    try {
      setLoadingUsers(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Use the new function to get approved users by role
      // This function is accessible to all approved users
      try {
        const userAddresses: string[] = await contract.getApprovedUsersByRole(nextRole);
        
        // Get user details for each address
        const userPromises = userAddresses.map(async (address: string) => {
          try {
            const userData = await contract.getUser(address);
            return {
              address,
              role: userData.role,
              id: Number(userData.id),
            };
          } catch (error) {
            console.error(`Error fetching user ${address}:`, error);
            return null;
          }
        });

        const userResults = await Promise.all(userPromises);
        const validUsers = userResults.filter(
          (user): user is AvailableUser => user !== null
        );

        setAvailableUsers(validUsers);
      } catch (error: any) {
        console.error("Error loading users by role:", error);
        // If the function doesn't exist yet (old contract), show empty list
        if (error.message?.includes("getApprovedUsersByRole") || 
            error.message?.includes("function does not exist")) {
          console.warn("Contract does not have getApprovedUsersByRole function. Please update the contract.");
        }
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {availableUsers.length === 0 && " Make sure there are approved users with the required role in the system."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

Agregando tests para la nueva función:


```solidity
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

```

Ejecutando todos los tests para verificar que todo funciona correctamente:


Todos los tests pasan. Resumen de cambios:

## Solución implementada - Opción B

### Cambios en el Smart Contract

1. Nueva función `getApprovedUsersByRole()`:
   - Accesible para usuarios aprobados (no requiere owner)
   - Filtra por rol y estado aprobado
   - Retorna solo direcciones de usuarios aprobados del rol especificado
   - Validación de rol antes de procesar

Características de seguridad:
- Modifier `onlyApprovedUser`: solo usuarios aprobados pueden llamarla
- Validación de rol: verifica que el rol sea válido
- Filtrado estricto: solo retorna usuarios con estado `Approved` y el rol especificado
- Información limitada: solo expone direcciones, no datos sensibles

### Cambios en el Frontend

1. Actualización de `loadAvailableUsers()`:
   - Usa la nueva función `getApprovedUsersByRole()` en lugar de `getAllUsers()`
   - Funciona para cualquier usuario aprobado, no solo owner
   - Manejo de errores si la función no existe (retrocompatibilidad)

2. Mensajes mejorados:
   - Mensajes más claros cuando no hay usuarios disponibles
   - Eliminada la referencia a "contract owner privileges"

### Tests agregados

Se agregaron 6 tests que verifican:
- Requiere usuario aprobado
- Retorna solo usuarios aprobados del rol especificado
- Filtra correctamente usuarios pendientes
- Maneja casos vacíos
- Valida roles inválidos
- Funciona con diferentes roles (Consumer, Factory, etc.)

### Próximos pasos

1. Redesplegar el contrato:
   ```bash
   cd sc
   ./scripts/deploy.sh
   ```

2. El script de deployment actualizará automáticamente:
   - El ABI en `web/src/contracts/`
   - La configuración del contrato

3. Después del deployment, el formulario de transferencia debería funcionar correctamente y mostrar los usuarios Factory aprobados.

### Ventajas de esta solución

- Segura: no expone información innecesaria
- Accesible: cualquier usuario aprobado puede usarla
- Eficiente: retorna solo lo necesario
- Escalable: funciona bien con muchos usuarios
- Educativa: muestra buenas prácticas de diseño de contratos

Redespliega el contrato y el formulario de transferencia debería funcionar correctamente.

```shellscript
   cd sc
   ./scripts/deploy.sh
```

---

**User**

ok hecho el deploy y todo lo necesario para tener los ultimos cambios, he hecho tambien la moderacion de los roles hasta factory para hacer una prueba creando un transfer desde producer a factory pero persiste el problema y con este mensaje en consola Error loading users by role: Error: execution reverted: "User not approved" (action="call", data="0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001155736572206e6f7420617070726f766564000000000000000000000000000000", reason="User not approved", transaction={ "data": "0x132dfba300000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000007466163746f727900000000000000000000000000000000000000000000000000", "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3" }, invocation=null, revert={ "args": [ "User not approved" ], "name": "Error", "signature": "Error(string)" }, code=CALL_EXCEPTION, version=6.15.0)

---

**Cursor**


La función `getApprovedUsersByRole` usa `onlyApprovedUser`, que requiere un signer. Revisando el código del frontend para usar el signer en lugar del provider:


El problema: se está usando `provider` en lugar de `signer` para llamar a `getApprovedUsersByRole()`, que tiene el modifier `onlyApprovedUser` y requiere un `msg.sender` válido. Corrigiéndolo para usar `signer`:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    // Need both provider and signer - provider for getUser calls, signer for getApprovedUsersByRole
    if (!provider || !signer || !user || !account) return;

    try {
      setLoadingUsers(true);
      
      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Use the new function to get approved users by role
      // This function requires onlyApprovedUser modifier, so we need signer
      try {
        const contractWithSigner = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          signer
        );
        
        const userAddresses: string[] = await contractWithSigner.getApprovedUsersByRole(nextRole);
        
        // Get user details for each address (can use provider for view functions)
        const contractWithProvider = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        
        const userPromises = userAddresses.map(async (address: string) => {
          try {
            const userData = await contractWithProvider.getUser(address);
            return {
              address,
              role: userData.role,
              id: Number(userData.id),
            };
          } catch (error) {
            console.error(`Error fetching user ${address}:`, error);
            return null;
          }
        });

        const userResults = await Promise.all(userPromises);
        const validUsers = userResults.filter(
          (user): user is AvailableUser => user !== null
        );

        setAvailableUsers(validUsers);
      } catch (error: any) {
        console.error("Error loading users by role:", error);
        
        // Check if it's the "User not approved" error
        if (error.message?.includes("User not approved")) {
          console.warn("Current user is not approved. Please ensure your account is approved in the system.");
          toast.error("Your account is not approved. Please wait for admin approval.");
        } else if (error.message?.includes("getApprovedUsersByRole") || 
                   error.message?.includes("function does not exist")) {
          console.warn("Contract does not have getApprovedUsersByRole function. Please update the contract.");
        }
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {availableUsers.length === 0 && " Make sure there are approved users with the required role in the system."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId && signer) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, signer, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    // Need both provider and signer - provider for getUser calls, signer for getApprovedUsersByRole
    if (!provider || !signer || !user || !account) return;

    try {
      setLoadingUsers(true);
      
      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Use the new function to get approved users by role
      // This function requires onlyApprovedUser modifier, so we need signer
      try {
        const contractWithSigner = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          signer
        );
        
        const userAddresses: string[] = await contractWithSigner.getApprovedUsersByRole(nextRole);
        
        // Get user details for each address (can use provider for view functions)
        const contractWithProvider = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        
        const userPromises = userAddresses.map(async (address: string) => {
          try {
            const userData = await contractWithProvider.getUser(address);
            return {
              address,
              role: userData.role,
              id: Number(userData.id),
            };
          } catch (error) {
            console.error(`Error fetching user ${address}:`, error);
            return null;
          }
        });

        const userResults = await Promise.all(userPromises);
        const validUsers = userResults.filter(
          (user): user is AvailableUser => user !== null
        );

        setAvailableUsers(validUsers);
      } catch (error: any) {
        console.error("Error loading users by role:", error);
        
        // Check if it's the "User not approved" error
        if (error.message?.includes("User not approved")) {
          console.warn("Current user is not approved. Please ensure your account is approved in the system.");
          toast.error("Your account is not approved. Please wait for admin approval.");
        } else if (error.message?.includes("getApprovedUsersByRole") || 
                   error.message?.includes("function does not exist")) {
          console.warn("Contract does not have getApprovedUsersByRole function. Please update the contract.");
        }
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {availableUsers.length === 0 && " Make sure there are approved users with the required role in the system."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

Verificando que el usuario Producer esté aprobado. El error "User not approved" indica que el `msg.sender` (cuenta conectada) no está aprobado. Aunque la función es `view`, el modifier `onlyApprovedUser` verifica que `msg.sender` esté aprobado. Mejorando el manejo de errores para aclarar esto:


El modifier `onlyApprovedUser` requiere que el usuario que hace la llamada esté aprobado. Agregando una verificación previa y mejorando el manejo de errores:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId && signer) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, signer, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    // Need both provider and signer - provider for getUser calls, signer for getApprovedUsersByRole
    if (!provider || !signer || !user || !account) return;

    try {
      setLoadingUsers(true);
      
      // First, verify the current user is approved
      const contractWithProvider = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      try {
        const currentUserData = await contractWithProvider.getUser(account);
        const currentUserStatus = Number(currentUserData.status);
        
        if (currentUserStatus !== 1) { // 1 = Approved
          console.warn("Current user is not approved. Status:", currentUserStatus);
          toast.error("Your account is not approved. Please wait for admin approval.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          console.warn("Current user is not registered in the system.");
          toast.error("Your account is not registered. Please register first.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
        throw error;
      }
      
      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Use the new function to get approved users by role
      // This function requires onlyApprovedUser modifier, so we need signer
      try {
        const contractWithSigner = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          signer
        );
        
        const userAddresses: string[] = await contractWithSigner.getApprovedUsersByRole(nextRole);
        
        // Get user details for each address (can use provider for view functions)
        const userPromises = userAddresses.map(async (address: string) => {
          try {
            const userData = await contractWithProvider.getUser(address);
            return {
              address,
              role: userData.role,
              id: Number(userData.id),
            };
          } catch (error) {
            console.error(`Error fetching user ${address}:`, error);
            return null;
          }
        });

        const userResults = await Promise.all(userPromises);
        const validUsers = userResults.filter(
          (user): user is AvailableUser => user !== null
        );

        setAvailableUsers(validUsers);
      } catch (error: any) {
        console.error("Error loading users by role:", error);
        
        // Check if it's the "User not approved" error
        if (error.message?.includes("User not approved") || 
            error.reason?.includes("User not approved")) {
          console.warn("Current user is not approved. Please ensure your account is approved in the system.");
          toast.error("Your account is not approved. Please wait for admin approval.");
        } else if (error.message?.includes("getApprovedUsersByRole") || 
                   error.message?.includes("function does not exist")) {
          console.warn("Contract does not have getApprovedUsersByRole function. Please update the contract.");
          toast.error("Contract version mismatch. Please redeploy the contract.");
        } else {
          console.error("Unexpected error:", error);
        }
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {availableUsers.length === 0 && " Make sure there are approved users with the required role in the system."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

Actualizado el código para verificar primero si el usuario está aprobado antes de llamar a la función. El error "User not approved" indica que el Producer no está aprobado. Verifica:

1. El Producer está registrado
2. El Producer está aprobado (status = Approved)

## Cambios realizados:

1. Verificación previa: antes de llamar a `getApprovedUsersByRole()`, verifica que el usuario actual esté aprobado.
2. Uso de signer: usa `signer` para la llamada a `getApprovedUsersByRole()` porque requiere el modifier `onlyApprovedUser`.
3. Manejo de errores: mensajes más claros cuando el usuario no está aprobado o no está registrado.

## Para solucionar el problema:

1. Verifica que el Producer esté aprobado:
   - Ve a `/admin/users`
   - Asegúrate de que el Producer tenga status "Approved"
   - Si está "Pending", apruebalo

2. Si el Producer ya está aprobado y el error persiste:
   - Verifica que estés conectado con la cuenta correcta del Producer
   - Recarga la página después de aprobar el usuario

El código ahora muestra un mensaje claro si el usuario no está aprobado, lo que ayuda a identificar el problema.

---

**User**

bueno el ultimo problema fue resuelto ahora de acuerdo con el @project-plan.md ejecutar el punto 5.5

---

**Cursor**


Implementando el punto 5.5: historial completo del producto. Revisando la página de detalles del token para agregar el historial:


Creando la página de historial completo y actualizando la página de detalles del token. Revisando cómo obtener los detalles de las transferencias:


Implementando el punto 5.5: crear la página de historial completo y actualizar la página de detalles del token.


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load token data
      const tokenData = await contract.getProductToken(tokenId);
      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };
      setToken(tokenObj);

      // Load transaction history
      const historyIds: bigint[] = await contract.getTokenTransactionHistory(tokenId);
      
      // Load all transfer details
      const transferPromises = historyIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          console.error(`Error loading transfer ${transferId}:`, error);
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first)
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenDetailPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [parentToken, setParentToken] = useState<ProductToken | null>(null);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const tokenBalance = await contract.getTokenBalance(tokenId, account);
      const tokenTotalSupply = await contract.getTokenTotalSupply(tokenId);
      const history = await contract.getTokenTransactionHistory(tokenId);

      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      setToken(tokenObj);
      setBalance(Number(tokenBalance));
      setTotalSupply(Number(tokenTotalSupply));
      setTransactionHistory(history.map((h: bigint) => Number(h)));

      // Load parent token if exists
      if (tokenObj.parentId > 0) {
        try {
          const parentData = await contract.getProductToken(tokenObj.parentId);
          setParentToken({
            id: tokenObj.parentId,
            creator: parentData.creator,
            metadata: parentData.metadata,
            parentId: Number(parentData.parentId),
            timestamp: Number(parentData.timestamp),
            isActive: parentData.isActive,
          });
        } catch (error) {
          console.error("Error loading parent token:", error);
        }
      }
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push('/token');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading token details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);
  const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {metadata.name || `Token #${token.id}`}
            </h1>
            <p className="text-muted-foreground mt-2">
              Token ID: #{token.id}
            </p>
          </div>
          <div className="flex gap-2">
            {balance > 0 && (
              <Link href={`/token/${token.id}/transfer`}>
                <Button>Transfer Tokens</Button>
              </Link>
            )}
            <Link href="/token">
              <Button variant="outline">Back to Tokens</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </div>
                  <div className="text-lg font-semibold">
                    {metadata.name || `Token #${token.id}`}
                  </div>
                </div>

                {metadata.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div className="text-sm">{metadata.description}</div>
                  </div>
                )}

                {metadata.category && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </div>
                    <Badge>{metadata.category}</Badge>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created At
                  </div>
                  <div className="text-sm">{formatDate(token.timestamp)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Creator
                  </div>
                  <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                  {isOwner && <Badge variant="outline" className="mt-1">You are the creator</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge className={token.isActive ? "bg-green-500" : "bg-gray-500"}>
                    {token.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {Object.keys(metadata).filter(key => !['name', 'description', 'category'].includes(key)).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Additional Metadata
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Token */}
            {parentToken && (
              <Card>
                <CardHeader>
                  <CardTitle>Parent Token</CardTitle>
                  <CardDescription>
                    This token was created from another token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Token ID
                      </div>
                      <Link href={`/token/${token.parentId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          Token #{token.parentId}
                        </Button>
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Name
                      </div>
                      <div className="text-sm">
                        {parseMetadata(parentToken.metadata).name || `Token #${token.parentId}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    All transfers related to this token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transactionHistory.map((transferId) => (
                      <div key={transferId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Transfer #{transferId}</span>
                        <Link href={`/transfers/${transferId}`}>
                          <Button variant="link" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{balance}</div>
                  <div className="text-sm text-muted-foreground">
                    Your balance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Supply
                  </div>
                  <div className="text-lg font-semibold">{totalSupply}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-lg font-semibold">{balance}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Transactions
                  </div>
                  <div className="text-lg font-semibold">{transactionHistory.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenDetailPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [parentToken, setParentToken] = useState<ProductToken | null>(null);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const tokenBalance = await contract.getTokenBalance(tokenId, account);
      const tokenTotalSupply = await contract.getTokenTotalSupply(tokenId);
      const history = await contract.getTokenTransactionHistory(tokenId);

      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      setToken(tokenObj);
      setBalance(Number(tokenBalance));
      setTotalSupply(Number(tokenTotalSupply));
      setTransactionHistory(history.map((h: bigint) => Number(h)));

      // Load parent token if exists
      if (tokenObj.parentId > 0) {
        try {
          const parentData = await contract.getProductToken(tokenObj.parentId);
          setParentToken({
            id: tokenObj.parentId,
            creator: parentData.creator,
            metadata: parentData.metadata,
            parentId: Number(parentData.parentId),
            timestamp: Number(parentData.timestamp),
            isActive: parentData.isActive,
          });
        } catch (error) {
          console.error("Error loading parent token:", error);
        }
      }
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push('/token');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading token details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);
  const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {metadata.name || `Token #${token.id}`}
            </h1>
            <p className="text-muted-foreground mt-2">
              Token ID: #{token.id}
            </p>
          </div>
          <div className="flex gap-2">
            {balance > 0 && user?.role !== "Consumer" && (
              <Link href={`/token/${token.id}/transfer`}>
                <Button>Transfer Tokens</Button>
              </Link>
            )}
            <Link href={`/token/${token.id}/history`}>
              <Button variant="outline">View Full History</Button>
            </Link>
            <Link href="/token">
              <Button variant="outline">Back to Tokens</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </div>
                  <div className="text-lg font-semibold">
                    {metadata.name || `Token #${token.id}`}
                  </div>
                </div>

                {metadata.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div className="text-sm">{metadata.description}</div>
                  </div>
                )}

                {metadata.category && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </div>
                    <Badge>{metadata.category}</Badge>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created At
                  </div>
                  <div className="text-sm">{formatDate(token.timestamp)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Creator
                  </div>
                  <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                  {isOwner && <Badge variant="outline" className="mt-1">You are the creator</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge className={token.isActive ? "bg-green-500" : "bg-gray-500"}>
                    {token.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {Object.keys(metadata).filter(key => !['name', 'description', 'category'].includes(key)).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Additional Metadata
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Token */}
            {parentToken && (
              <Card>
                <CardHeader>
                  <CardTitle>Parent Token</CardTitle>
                  <CardDescription>
                    This token was created from another token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Token ID
                      </div>
                      <Link href={`/token/${token.parentId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          Token #{token.parentId}
                        </Button>
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Name
                      </div>
                      <div className="text-sm">
                        {parseMetadata(parentToken.metadata).name || `Token #${token.parentId}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    All transfers related to this token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transactionHistory.map((transferId) => (
                      <div key={transferId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Transfer #{transferId}</span>
                        <Link href={`/transfers/${transferId}`}>
                          <Button variant="link" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{balance}</div>
                  <div className="text-sm text-muted-foreground">
                    Your balance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Supply
                  </div>
                  <div className="text-lg font-semibold">{totalSupply}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-lg font-semibold">{balance}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Transactions
                  </div>
                  <div className="text-lg font-semibold">{transactionHistory.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenDetailPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [parentToken, setParentToken] = useState<ProductToken | null>(null);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const tokenBalance = await contract.getTokenBalance(tokenId, account);
      const tokenTotalSupply = await contract.getTokenTotalSupply(tokenId);
      const history = await contract.getTokenTransactionHistory(tokenId);

      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      setToken(tokenObj);
      setBalance(Number(tokenBalance));
      setTotalSupply(Number(tokenTotalSupply));
      setTransactionHistory(history.map((h: bigint) => Number(h)));

      // Load parent token if exists
      if (tokenObj.parentId > 0) {
        try {
          const parentData = await contract.getProductToken(tokenObj.parentId);
          setParentToken({
            id: tokenObj.parentId,
            creator: parentData.creator,
            metadata: parentData.metadata,
            parentId: Number(parentData.parentId),
            timestamp: Number(parentData.timestamp),
            isActive: parentData.isActive,
          });
        } catch (error) {
          console.error("Error loading parent token:", error);
        }
      }
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push('/token');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading token details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);
  const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {metadata.name || `Token #${token.id}`}
            </h1>
            <p className="text-muted-foreground mt-2">
              Token ID: #{token.id}
            </p>
          </div>
          <div className="flex gap-2">
            {balance > 0 && user?.role !== "Consumer" && (
              <Link href={`/token/${token.id}/transfer`}>
                <Button>Transfer Tokens</Button>
              </Link>
            )}
            <Link href={`/token/${token.id}/history`}>
              <Button variant="outline">View Full History</Button>
            </Link>
            <Link href="/token">
              <Button variant="outline">Back to Tokens</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </div>
                  <div className="text-lg font-semibold">
                    {metadata.name || `Token #${token.id}`}
                  </div>
                </div>

                {metadata.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div className="text-sm">{metadata.description}</div>
                  </div>
                )}

                {metadata.category && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </div>
                    <Badge>{metadata.category}</Badge>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created At
                  </div>
                  <div className="text-sm">{formatDate(token.timestamp)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Creator
                  </div>
                  <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                  {isOwner && <Badge variant="outline" className="mt-1">You are the creator</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge className={token.isActive ? "bg-green-500" : "bg-gray-500"}>
                    {token.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {Object.keys(metadata).filter(key => !['name', 'description', 'category'].includes(key)).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Additional Metadata
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Token */}
            {parentToken && (
              <Card>
                <CardHeader>
                  <CardTitle>Parent Token</CardTitle>
                  <CardDescription>
                    This token was created from another token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Token ID
                      </div>
                      <Link href={`/token/${token.parentId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          Token #{token.parentId}
                        </Button>
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Name
                      </div>
                      <div className="text-sm">
                        {parseMetadata(parentToken.metadata).name || `Token #${token.parentId}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        Recent transfers related to this token
                      </CardDescription>
                    </div>
                    <Link href={`/token/${token.id}/history`}>
                      <Button variant="outline" size="sm">
                        View Full History
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transactionHistory.slice(-5).reverse().map((transferId) => (
                      <div key={transferId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Transfer #{transferId}</span>
                        <Link href={`/transfers/${transferId}`}>
                          <Button variant="link" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {transactionHistory.length > 5 && (
                      <div className="text-center pt-2">
                        <Link href={`/token/${token.id}/history`}>
                          <Button variant="link" size="sm">
                            View all {transactionHistory.length} transfers →
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{balance}</div>
                  <div className="text-sm text-muted-foreground">
                    Your balance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Supply
                  </div>
                  <div className="text-lg font-semibold">{totalSupply}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-lg font-semibold">{balance}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Transactions
                  </div>
                  <div className="text-lg font-semibold">{transactionHistory.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


```

Verificando que el componente Table esté disponible:


Actualizando el plan de proyecto para marcar el punto 5.5 como completado:


```markdown
# Title: Supply Chain Tracker
# Description: Educational decentralized app to keep tracking on chain supplies


# Requirements:
- code and Comments all English.
- Quality test for smart contract.
- Frontend standarts, responsive design, use shadcn/ui components and work with them in web/src/components/ui


# 1. Technologies
## Backend: Solidity, Foundry Anvil
## Frontend: Nextjs typescript, web3 provider, ethers, tailwind ^3 , Metamask

# 2. Proposed Initial Structure
```
- supply-chain-tracker/
    - sc/ -> Backend
    - web/ -> Frontend
```

# 3.  Users and Roles
This is the user and roles functionality for the frontend.
we will use shadcn/ui components along the project and all components form shadcn/ui will be on web/src/components/ui
reusable component as header, footer, menu, transfertable, usertable, will be on web/src/components/

## 3.1 Frontend connection register and Dashboards
User roles will be defined on the Backend smart contract (Admin, Producer, Factory, Retailer, Consumer)
## 3.1.1 connection
* work the connection on 
```supply-chain-tracker/web/src/contexts```
* Use local storage to preserve connection
* add disconnect  and handle disconnection functionality
* Detect connection changes and update storage  data
* using metamask connection, check if metamask exist, manage connection issues.
## 3.1.2 Frontend User Flow
* If user is not connected invite to connect.
* If user connected but not registered, show user registry form to create registry using the smart contract. 
        ```
        User:
        uint256 id;
        address userAddress;
        string role; //Form select component with the predefined users roles except for admins
        UserStatus status; // Dont show in form, 
        ```
        Default status for user registry is "pending"
* create registry from.
* If user is registered but still pending for approval, display the pending status on the dashboard, but without any option to take action.
* If user is registered and approved, redirect his user to the dashboard.
## 3.1.3 Dashboards
* Create personalized Dashboard for every role on web/src/app/dashboard.tsx
* Dashboard contain token statistics and transfers.
* Dashboard provide Buttons for actions quick access
* every Role will have a color configuration and will be apply to user theme.
* Create user administration inside web/src/app and create frontend route /admin/users

## 3.2 Backend User and Roles
## 3.2.1 SupplyChain contract
* Adjust the contract to create the user struct
```
User:
uint256 id;
address userAddress;
string role;
UserStatus status;
```
user status are { Pending, Approved, Rejected, Canceled }
* create user crud functions on the SupplyChain contract, apply soft delete on User Status.
* Include a function to change user status to be use to moderate user status by admin.
* Include a function to list all users just for admin moderation
* create new functionality 
## 3.2.2 Script shell for sc deployments
* create shell using env, to start or stop anvil, deploy contract to anvil with network on env file, the script must include deployment information and sync information with the frontend to be use for request on the web/src/contracts directory to be use for frontend calls
* use fork information for anvil https://eth-mainnet.g.alchemy.com/v2/fke6Zvkyv0BXboRGLnsvJ


# 4. Backend Product Token Functionality
Lets continue with the token creation, the contract Supply will be using an ERC20 token standard from openzepelling. 
the functionality is: when a producer create supply a token is created and can be send to the next on the chain in this case it will be factory, the Factory will get a pending request to receive the product token sent by the producer, after the factory confirmation receiving the tokens from the producer, a transfer will be registered too on the contract, saving transaction information.

## 4.1 Token ERC20
* implement token erc20 called ProductToken, right now is called SupplyItem so replace it and use the struct for the product token on the SupplyChainTracker.sol
* token struct will use a meta data json string attribute for the product features
* when a product is created based on other products the created Product token must contain the parentId
* if a product is created using another product the original product balance must be updated to keep an inventory for materials.
* ids for tokens must be sequential, so we need to calculate next Ids 
* add necessary mappings on the contract for transactions to keep track on products Tokens and transactions.

## 4.2 Product Token transfer
for better understanding, how is the token workflow we will use an example.
1. producer create 50 A supplies (producttokens)
2. producer create a request to send 25 A supplies to factory1, a request is created and can be approved by the factory.
3. once if the tokens are rejected the request is marked as rejected and tokens returns to the creator(producer).
4. if the request is accepted the transaction is complete and now the factory can create other products using the token A supply.
5 when the factory create an amount of products (more tokens as product with another metadata selecting parentId) the balances on the original product must be updated, after new product tokens creation de factory can create a request to send an amount of the new product to the retailer and retailer must accept the request
6. retailer accept the transfer and he can create another token for the customer selecting the parentID product.
7. when an actor (producer, factory, retailer) create the transfer request the default status for the transfer is pending.
8. when the destination actor (factory or retailer) accept or reject the transfer the status will be updated.

## 4.3 Prepare Contract to receive actions request.
 - create required methods  for token creation, including all the information required 
 - create required transfer struct and mapping to track all transactions and all the production chain.
 - create require methods to create transfer request with all the transfer required including dates for the history
 - create methods to create transactions acceptance on the destination actor
 - create methods to list all the pending transaction request for an actor.
 - make sure the only user that can change the request status is the destination address.
 - create method to get transaction chain history based on the product token.
 - update forge test and allow to access test methods specifically

# 5. Backend Product Token and Token transfers Functionality
 This point of the plant is to create the user interface to handle tokens, transfer request according to their roles.
    ## 5.1 create token interface
    * create token interface on the ./web/src/app/token/
    * create page to list all tokens created by the user.
    *  create a page to create new tokens form according with the backend struct, and implement backend call on form submit, add validation fields on the frontend before send the request to the backend.
    * create a page for the token detail, based on the product id
    * create a page to transfer  based on the product id to transfer, include transfer request form and submission handler, add fields validations before endpoint call.
    
    ## 5.2 create Transfer interface
    * working directory must be ./web/src/app/transfers/
    * create a page to display the transfers based on the userId and pending for moderation
    * add actions button to update the transfers(accept or decline), after the action is performed refresh the transfers list.
    * when the user accept a transfer the products amounts should be updated to allow the user to create products based on the product received as parentId.

    ## 5.3 Frontend token creation metadata json
    * create frontend method to transform metadata json content into, text fields as label and fieldData, and allow to add as much as user required.
    * create frontend method to check the metadata before the submission and filter labels to be lowercase and trimmed and textdata, and process them to transform all to json format.

    ## 5.4 Frontend token transfer form
    * simplify transfer creation, the recipient address field should be a select field with the address of the next actor on the chain. let say the producer is trying to create a token transfer request, the recipient address(destination address) should be a a select list of factories.
    * add fields validation before the transfer creation request is sent to the backend.
    
    ## 5.5 Frontend all history ✅
    * create the page and add a button on the products to see all product track history ✅
    * for users with consumer role since they are the last actor on the chain, they wont need the transfer button just the details and all history ✅
```

Implementado el punto 5.5 del plan de proyecto. Resumen:

## Implementación completada

### 1. Página de historial completo (`/token/[id]/history`)
- Muestra toda la cadena de transferencias del producto
- Visualización de la cadena con información de cada transferencia
- Detalles: from/to, roles, cantidad, estado, fechas
- Badges de roles con colores
- Tabla resumen con todos los detalles
- Enlaces a las páginas de detalle de cada transferencia

### 2. Actualización de la página de detalles del token
- Botón de transferencia oculto para usuarios Consumer (último actor)
- Botón "View Full History" para acceder al historial completo
- Sección de historial muestra las últimas 5 transferencias con enlace para ver todas

### 3. Características adicionales
- Carga asíncrona de roles de usuarios para mostrar información completa
- Ordenamiento cronológico de transferencias (más antiguas primero)
- Manejo de estados de carga y errores
- Diseño responsive y consistente con el resto de la aplicación

El punto 5.5 está marcado como completado en el plan de proyecto. Los usuarios Consumer pueden ver los detalles del producto y el historial completo, sin acceso al botón de transferencia.

---

**User**

after the history implementation we have some discrepancies that need to be fix

1. Consumer role user still have the option to transfer tokens tranferend to him. the consumer is the last chain link so the process stop when he receive token.

2. Token history is not completed, for example if factory create a token based on a producer transfered token, when the factory create the transfer request to the retailer and retailer accept the transfer request, when the history is checked history is empty

another example is: im logged as a consumer and check the history and it just cant see the last tranfer (retailer to consumer) but no the factory to retailer with the parentId and the producer to fabric

so fix both issues images are added for further context 



---

**Cursor**


Revisando el código para corregir ambos problemas:


Revisando cómo se registran las transferencias en el contrato:


Corrigiendo ambos problemas. Creando la lista de tareas inicial:


Corrigiendo ambos problemas:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenDetailPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [parentToken, setParentToken] = useState<ProductToken | null>(null);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const tokenBalance = await contract.getTokenBalance(tokenId, account);
      const tokenTotalSupply = await contract.getTokenTotalSupply(tokenId);
      const history = await contract.getTokenTransactionHistory(tokenId);

      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      setToken(tokenObj);
      setBalance(Number(tokenBalance));
      setTotalSupply(Number(tokenTotalSupply));
      setTransactionHistory(history.map((h: bigint) => Number(h)));

      // Load parent token if exists
      if (tokenObj.parentId > 0) {
        try {
          const parentData = await contract.getProductToken(tokenObj.parentId);
          setParentToken({
            id: tokenObj.parentId,
            creator: parentData.creator,
            metadata: parentData.metadata,
            parentId: Number(parentData.parentId),
            timestamp: Number(parentData.timestamp),
            isActive: parentData.isActive,
          });
        } catch (error) {
          console.error("Error loading parent token:", error);
        }
      }
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push('/token');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading token details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);
  const isOwner = token.creator.toLowerCase() === account?.toLowerCase();
  
  // Check if user is Consumer - Consumer should not see transfer button
  const canTransfer = balance > 0 && user && user.role !== "Consumer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {metadata.name || `Token #${token.id}`}
            </h1>
            <p className="text-muted-foreground mt-2">
              Token ID: #{token.id}
            </p>
          </div>
          <div className="flex gap-2">
            {canTransfer && (
              <Link href={`/token/${token.id}/transfer`}>
                <Button>Transfer Tokens</Button>
              </Link>
            )}
            <Link href={`/token/${token.id}/history`}>
              <Button variant="outline">View Full History</Button>
            </Link>
            <Link href="/token">
              <Button variant="outline">Back to Tokens</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </div>
                  <div className="text-lg font-semibold">
                    {metadata.name || `Token #${token.id}`}
                  </div>
                </div>

                {metadata.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div className="text-sm">{metadata.description}</div>
                  </div>
                )}

                {metadata.category && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </div>
                    <Badge>{metadata.category}</Badge>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created At
                  </div>
                  <div className="text-sm">{formatDate(token.timestamp)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Creator
                  </div>
                  <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                  {isOwner && <Badge variant="outline" className="mt-1">You are the creator</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge className={token.isActive ? "bg-green-500" : "bg-gray-500"}>
                    {token.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {Object.keys(metadata).filter(key => !['name', 'description', 'category'].includes(key)).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Additional Metadata
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Token */}
            {parentToken && (
              <Card>
                <CardHeader>
                  <CardTitle>Parent Token</CardTitle>
                  <CardDescription>
                    This token was created from another token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Token ID
                      </div>
                      <Link href={`/token/${token.parentId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          Token #{token.parentId}
                        </Button>
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Name
                      </div>
                      <div className="text-sm">
                        {parseMetadata(parentToken.metadata).name || `Token #${token.parentId}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        Recent transfers related to this token
                      </CardDescription>
                    </div>
                    <Link href={`/token/${token.id}/history`}>
                      <Button variant="outline" size="sm">
                        View Full History
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transactionHistory.slice(-5).reverse().map((transferId) => (
                      <div key={transferId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Transfer #{transferId}</span>
                        <Link href={`/transfers/${transferId}`}>
                          <Button variant="link" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {transactionHistory.length > 5 && (
                      <div className="text-center pt-2">
                        <Link href={`/token/${token.id}/history`}>
                          <Button variant="link" size="sm">
                            View all {transactionHistory.length} transfers →
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{balance}</div>
                  <div className="text-sm text-muted-foreground">
                    Your balance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Supply
                  </div>
                  <div className="text-lg font-semibold">{totalSupply}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-lg font-semibold">{balance}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Transactions
                  </div>
                  <div className="text-lg font-semibold">{transactionHistory.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for a token chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];

    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents)
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Load all transaction histories from the entire chain
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = historyIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          console.error(`Error loading transfer ${transferId}:`, error);
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first)
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

Corrigiendo el uso de `historyIds`; reemplazándolo por `allHistoryIds`.


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for a token chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];

    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents)
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Load all transaction histories from the entire chain
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          console.error(`Error loading transfer ${transferId}:`, error);
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first)
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

Agregando información sobre la cadena de tokens y mostrando qué token se usó en cada transferencia:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for a token chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];

    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents)
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Load all transaction histories from the entire chain
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          console.error(`Error loading transfer ${transferId}:`, error);
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first)
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for a token chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];

    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents)
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Load all transaction histories from the entire chain
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          console.error(`Error loading transfer ${transferId}:`, error);
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first)
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for a token chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];

    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents)
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Load all transaction histories from the entire chain
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          console.error(`Error loading transfer ${transferId}:`, error);
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first)
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for a token chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];

    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents)
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Load all transaction histories from the entire chain
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          console.error(`Error loading transfer ${transferId}:`, error);
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first)
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

Ambos problemas corregidos. Resumen de cambios:

## Problemas corregidos

### 1. Botón de transferencia para Consumer
- Cambio: En `/web/src/app/token/[id]/page.tsx`, se usa `canTransfer` que verifica que `user` existe y que `user.role !== "Consumer"`.
- Resultado: Los usuarios con rol Consumer no verán el botón "Transfer Tokens".

### 2. Historial completo de tokens
- Cambio: En `/web/src/app/token/[id]/history/page.tsx`, se implementó:
  - `loadTokenChain()`: función recursiva que carga todos los tokens padre en la cadena
  - `loadAllHistories()`: obtiene el historial de transferencias de todos los tokens en la cadena
  - Visualización de la cadena completa de tokens padre-hijo
  - Información del token usado en cada transferencia
- Resultado: El historial muestra todas las transferencias desde el inicio de la cadena hasta el token actual, incluyendo:
  - Producer → Factory
  - Factory → Retailer
  - Retailer → Consumer
  - Y cualquier otra transferencia en la cadena

### Mejoras adicionales
- Visualización de la cadena de tokens (Product Chain Lineage) cuando hay tokens padre
- Columna "Token ID" en la tabla de resumen para identificar qué token se usó en cada transferencia
- Enlaces a los tokens relacionados para navegación fácil

El historial ahora muestra la cadena completa de transferencias, incluso cuando se crean tokens hijos basados en tokens padre.

---

**User**

Excelente!!, ahora ejecutar punto 5.6 del @project-plan.md 

---

**Cursor**


Implementando el punto 5.6: organizar la página de tokens en dos vistas. Revisando la página actual:


Implementando el punto 5.6: organizando la página de tokens en dos vistas claras. Creando la lista de tareas:


Implementando las dos vistas con un sistema de tabs simple usando botones:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Filter tokens that have balance > 0 or were created by the user
      const userTokens = validTokens.filter(
        (token) => token.balance > 0 || token.creator.toLowerCase() === account.toLowerCase()
      );

      setTokens(userTokens);
      const balanceMap: Record<number, number> = {};
      userTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No tokens found</p>
                <Link href="/token/create">
                  <Button>Create Your First Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokens.map((token) => {
              const metadata = parseMetadata(token.metadata);
              const balance = balances[token.id] || 0;
              const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Balance
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Creator
                        </div>
                        <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                      </div>

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No tokens found</p>
                <Link href="/token/create">
                  <Button>Create Your First Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokens.map((token) => {
              const metadata = parseMetadata(token.metadata);
              const balance = balances[token.id] || 0;
              const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Balance
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Creator
                        </div>
                        <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                      </div>

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Balance
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Creator
                        </div>
                        <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                      </div>

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Balance
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Creator
                        </div>
                        <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                      </div>

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Balance
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Creator
                        </div>
                        <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                      </div>

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}


```

Mejorando las tarjetas para mostrar información más relevante según la vista:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                      {!isOwner && activeView === "transferred" && (
                        <Badge className="bg-blue-500">Received</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {activeView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Creator
                        </div>
                        <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                      </div>

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                      {!isOwner && activeView === "transferred" && (
                        <Badge className="bg-blue-500">Received</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {activeView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created from Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Creator
                        </div>
                        <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                      </div>

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                      {!isOwner && activeView === "transferred" && (
                        <Badge className="bg-blue-500">Received</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {activeView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created from Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      {activeView === "transferred" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Received from
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                        </div>
                      )}
                      {activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created by
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                          {isOwner && (
                            <Badge variant="outline" className="mt-1 text-xs">You</Badge>
                          )}
                        </div>
                      )}

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}


```

Actualizando el plan de proyecto:


```markdown
# Title: Supply Chain Tracker
# Description: Educational decentralized app to keep tracking on chain supplies


# Requirements:
- code and Comments all English.
- Quality test for smart contract.
- Frontend standarts, responsive design, use shadcn/ui components and work with them in web/src/components/ui


# 1. Technologies
## Backend: Solidity, Foundry Anvil
## Frontend: Nextjs typescript, web3 provider, ethers, tailwind ^3 , Metamask

# 2. Proposed Initial Structure
```
- supply-chain-tracker/
    - sc/ -> Backend
    - web/ -> Frontend
```

# 3.  Users and Roles
This is the user and roles functionality for the frontend.
we will use shadcn/ui components along the project and all components form shadcn/ui will be on web/src/components/ui
reusable component as header, footer, menu, transfertable, usertable, will be on web/src/components/

## 3.1 Frontend connection register and Dashboards
User roles will be defined on the Backend smart contract (Admin, Producer, Factory, Retailer, Consumer)
## 3.1.1 connection
* work the connection on 
```supply-chain-tracker/web/src/contexts```
* Use local storage to preserve connection
* add disconnect  and handle disconnection functionality
* Detect connection changes and update storage  data
* using metamask connection, check if metamask exist, manage connection issues.
## 3.1.2 Frontend User Flow
* If user is not connected invite to connect.
* If user connected but not registered, show user registry form to create registry using the smart contract. 
        ```
        User:
        uint256 id;
        address userAddress;
        string role; //Form select component with the predefined users roles except for admins
        UserStatus status; // Dont show in form, 
        ```
        Default status for user registry is "pending"
* create registry from.
* If user is registered but still pending for approval, display the pending status on the dashboard, but without any option to take action.
* If user is registered and approved, redirect his user to the dashboard.
## 3.1.3 Dashboards
* Create personalized Dashboard for every role on web/src/app/dashboard.tsx
* Dashboard contain token statistics and transfers.
* Dashboard provide Buttons for actions quick access
* every Role will have a color configuration and will be apply to user theme.
* Create user administration inside web/src/app and create frontend route /admin/users

## 3.2 Backend User and Roles
## 3.2.1 SupplyChain contract
* Adjust the contract to create the user struct
```
User:
uint256 id;
address userAddress;
string role;
UserStatus status;
```
user status are { Pending, Approved, Rejected, Canceled }
* create user crud functions on the SupplyChain contract, apply soft delete on User Status.
* Include a function to change user status to be use to moderate user status by admin.
* Include a function to list all users just for admin moderation
* create new functionality 
## 3.2.2 Script shell for sc deployments
* create shell using env, to start or stop anvil, deploy contract to anvil with network on env file, the script must include deployment information and sync information with the frontend to be use for request on the web/src/contracts directory to be use for frontend calls
* use fork information for anvil https://eth-mainnet.g.alchemy.com/v2/fke6Zvkyv0BXboRGLnsvJ


# 4. Backend Product Token Functionality
Lets continue with the token creation, the contract Supply will be using an ERC20 token standard from openzepelling. 
the functionality is: when a producer create supply a token is created and can be send to the next on the chain in this case it will be factory, the Factory will get a pending request to receive the product token sent by the producer, after the factory confirmation receiving the tokens from the producer, a transfer will be registered too on the contract, saving transaction information.

## 4.1 Token ERC20
* implement token erc20 called ProductToken, right now is called SupplyItem so replace it and use the struct for the product token on the SupplyChainTracker.sol
* token struct will use a meta data json string attribute for the product features
* when a product is created based on other products the created Product token must contain the parentId
* if a product is created using another product the original product balance must be updated to keep an inventory for materials.
* ids for tokens must be sequential, so we need to calculate next Ids 
* add necessary mappings on the contract for transactions to keep track on products Tokens and transactions.

## 4.2 Product Token transfer
for better understanding, how is the token workflow we will use an example.
1. producer create 50 A supplies (producttokens)
2. producer create a request to send 25 A supplies to factory1, a request is created and can be approved by the factory.
3. once if the tokens are rejected the request is marked as rejected and tokens returns to the creator(producer).
4. if the request is accepted the transaction is complete and now the factory can create other products using the token A supply.
5 when the factory create an amount of products (more tokens as product with another metadata selecting parentId) the balances on the original product must be updated, after new product tokens creation de factory can create a request to send an amount of the new product to the retailer and retailer must accept the request
6. retailer accept the transfer and he can create another token for the customer selecting the parentID product.
7. when an actor (producer, factory, retailer) create the transfer request the default status for the transfer is pending.
8. when the destination actor (factory or retailer) accept or reject the transfer the status will be updated.

## 4.3 Prepare Contract to receive actions request.
 - create required methods  for token creation, including all the information required 
 - create required transfer struct and mapping to track all transactions and all the production chain.
 - create require methods to create transfer request with all the transfer required including dates for the history
 - create methods to create transactions acceptance on the destination actor
 - create methods to list all the pending transaction request for an actor.
 - make sure the only user that can change the request status is the destination address.
 - create method to get transaction chain history based on the product token.
 - update forge test and allow to access test methods specifically

# 5. Backend Product Token and Token transfers Functionality
 This point of the plant is to create the user interface to handle tokens, transfer request according to their roles.
    ## 5.1 create token interface
    * create token interface on the ./web/src/app/token/
    * create page to list all tokens created by the user.
    *  create a page to create new tokens form according with the backend struct, and implement backend call on form submit, add validation fields on the frontend before send the request to the backend.
    * create a page for the token detail, based on the product id
    * create a page to transfer  based on the product id to transfer, include transfer request form and submission handler, add fields validations before endpoint call.
    
    ## 5.2 create Transfer interface
    * working directory must be ./web/src/app/transfers/
    * create a page to display the transfers based on the userId and pending for moderation
    * add actions button to update the transfers(accept or decline), after the action is performed refresh the transfers list.
    * when the user accept a transfer the products amounts should be updated to allow the user to create products based on the product received as parentId.

    ## 5.3 Frontend token creation metadata json
    * create frontend method to transform metadata json content into, text fields as label and fieldData, and allow to add as much as user required.
    * create frontend method to check the metadata before the submission and filter labels to be lowercase and trimmed and textdata, and process them to transform all to json format.

    ## 5.4 Frontend token transfer form
    * simplify transfer creation, the recipient address field should be a select field with the address of the next actor on the chain. let say the producer is trying to create a token transfer request, the recipient address(destination address) should be a a select list of factories.
    * add fields validation before the transfer creation request is sent to the backend.
    
    ## 5.5 Frontend all history ✅
    * create the page and add a button on the products to see all product track history ✅
    * for users with consumer role since they are the last actor on the chain, they wont need the transfer button just the details and all history ✅

    ## 5.6 Token page identify ✅
    * since there are 2 kind of tokens related with user (1. token transferred to the user 2. tokens created by the user related with another token as parentId) we need to create 2 views on that page to avoid confusions. ✅
```

Implementado el punto 5.6 del plan de proyecto. Resumen de cambios:

## Implementación del punto 5.6

### Separación de vistas en la página de tokens

Se crearon dos vistas claramente separadas:

1. **"Tokens Created by Me"**
   - Muestra tokens creados por el usuario
   - Pueden incluir tokens con `parentId` (creados a partir de otros tokens)
   - Muestra "Total Supply" en lugar de "Your Balance"
   - Badge "Creator" para identificar tokens propios
   - Muestra "Created from Parent Token" cuando aplica

2. **"Tokens Transferred to Me"**
   - Muestra tokens transferidos al usuario
   - Filtra tokens con balance > 0 donde el usuario no es el creador
   - Muestra "Your Balance" para indicar cuántos tokens tiene
   - Badge "Received" para identificar tokens recibidos
   - Muestra "Received from" con la dirección del creador

### Características implementadas

- Toggle de vistas: botones para alternar entre las dos vistas
- Contadores: badges con el número de tokens en cada vista
- Información contextual: labels y datos adaptados según la vista
- Filtrado: lógica separada para cada tipo de token
- Mensajes vacíos: mensajes específicos cuando no hay tokens en cada vista
- Restricción de transferencia: botón de transferencia oculto para usuarios Consumer

El punto 5.6 está marcado como completado en el plan de proyecto. La página de tokens ahora separa claramente los tokens creados por el usuario de los tokens transferidos al usuario, evitando confusiones.

