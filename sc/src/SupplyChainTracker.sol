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
    address public pendingOwner; // For two-step ownership transfer
    bool public paused; // Emergency pause mechanism
    uint256 public totalProductTokens;
    uint256 public totalUsers;
    uint256 public totalTransfers;
    
    // Constants
    uint256 public constant MAX_METADATA_LENGTH = 10240; // 10KB limit for metadata
    uint256 public constant MAX_USERS_PER_QUERY = 100; // Limit for pagination
    uint256 public constant MAX_TRANSFERS_PER_QUERY = 100; // Limit for transfer pagination
    uint256 public constant MAX_AMOUNT = type(uint256).max / 2; // Prevent overflow issues
    
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
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyApprovedUser() {
        require(users[msg.sender].status == UserStatus.Approved, "User not approved");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        paused = false;
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
     * @dev Initiate ownership transfer (two-step process)
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Invalid new owner address");
        require(_newOwner != owner, "New owner must be different");
        pendingOwner = _newOwner;
        emit OwnershipTransferStarted(owner, _newOwner);
    }
    
    /**
     * @dev Accept ownership transfer (must be called by pendingOwner)
     */
    function acceptOwnership() public {
        require(msg.sender == pendingOwner, "Only pending owner can accept");
        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, owner);
    }
    
    /**
     * @dev Renounce ownership (decentralize the contract)
     */
    function renounceOwnership() public onlyOwner {
        address oldOwner = owner;
        owner = address(0);
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, address(0));
    }
    
    /**
     * @dev Pause contract operations (emergency only)
     */
    function pause() public onlyOwner whenNotPaused {
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @dev Unpause contract operations
     */
    function unpause() public onlyOwner whenPaused {
        paused = false;
        emit Unpaused(msg.sender);
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
    function registerUser(string memory _role) public whenNotPaused returns (uint256) {
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
     * @param _offset Starting index for pagination (0-based)
     * @param _limit Maximum number of results to return (max 100)
     * @return addresses Array of addresses of approved users with the specified role
     * @return totalCount Total number of approved users with the specified role
     */
    function getApprovedUsersByRole(
        string memory _role,
        uint256 _offset,
        uint256 _limit
    ) 
        public 
        view 
        onlyApprovedUser 
        returns (address[] memory addresses, uint256 totalCount) 
    {
        require(validRoles[_role], "Invalid role");
        require(_limit > 0 && _limit <= MAX_USERS_PER_QUERY, "Invalid limit");
        
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
        
        totalCount = count;
        
        // Calculate actual result size
        uint256 resultSize = _offset < count ? (count - _offset < _limit ? count - _offset : _limit) : 0;
        addresses = new address[](resultSize);
        uint256 index = 0;
        uint256 currentIndex = 0;
        
        // Populate array with pagination
        for (uint256 i = 0; i < userAddresses.length && index < resultSize; i++) {
            address userAddr = userAddresses[i];
            if (
                users[userAddr].id != 0 &&
                users[userAddr].status == UserStatus.Approved &&
                keccak256(bytes(users[userAddr].role)) == keccak256(bytes(_role))
            ) {
                if (currentIndex >= _offset) {
                    addresses[index] = userAddr;
                    index++;
                }
                currentIndex++;
            }
        }
        
        return (addresses, totalCount);
    }
    
    /**
     * @dev Get approved users by role (backward compatibility - returns first 100)
     * @param _role The role to filter by
     * @return addresses Array of addresses of approved users with the specified role
     */
    function getApprovedUsersByRole(string memory _role) 
        public 
        view 
        onlyApprovedUser 
        returns (address[] memory) 
    {
        (address[] memory addresses, ) = getApprovedUsersByRole(_role, 0, MAX_USERS_PER_QUERY);
        return addresses;
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
        whenNotPaused
        returns (uint256) 
    {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= MAX_AMOUNT, "Amount too large");
        require(bytes(_metadata).length > 0, "Metadata cannot be empty");
        require(bytes(_metadata).length <= MAX_METADATA_LENGTH, "Metadata too long");
        
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
        whenNotPaused
        returns (uint256)
    {
        require(keccak256(bytes(users[msg.sender].role)) != keccak256(bytes("Consumer")), "Consumer cannot transfer");
        require(productTokens[_tokenId].id != 0, "Product token does not exist");
        require(productTokens[_tokenId].isActive, "Product token is not active");
        require(_to != address(0), "Invalid destination address");
        require(_to != msg.sender, "Cannot transfer to yourself");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= MAX_AMOUNT, "Amount too large");
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
    function acceptTransfer(uint256 _transferId) public whenNotPaused {
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
    function rejectTransfer(uint256 _transferId) public whenNotPaused {
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
     * @dev Get all pending transfers for an address (with pagination)
     * @param _address Address to get pending transfers for
     * @param _offset Starting index for pagination (0-based)
     * @param _limit Maximum number of results to return (max 100)
     * @return resultTransferIds Array of transfer IDs that are still pending
     * @return totalCount Total number of pending transfers for the address
     */
    function getPendingTransfers(
        address _address,
        uint256 _offset,
        uint256 _limit
    ) public view returns (uint256[] memory resultTransferIds, uint256 totalCount) {
        require(_limit > 0 && _limit <= MAX_TRANSFERS_PER_QUERY, "Invalid limit");
        
        uint256[] memory allTransfers = pendingTransfersByAddress[_address];
        uint256[] memory temp = new uint256[](allTransfers.length);
        uint256 count = 0;
        
        // Filter to only pending transfers
        for (uint256 i = 0; i < allTransfers.length; i++) {
            if (transfers[allTransfers[i]].status == TransferStatus.Pending) {
                temp[count] = allTransfers[i];
                count++;
            }
        }
        
        totalCount = count;
        
        // Calculate actual result size with pagination
        uint256 resultSize = _offset < count ? (count - _offset < _limit ? count - _offset : _limit) : 0;
        resultTransferIds = new uint256[](resultSize);
        
        // Populate result array with pagination
        for (uint256 i = 0; i < resultSize; i++) {
            resultTransferIds[i] = temp[_offset + i];
        }
        
        return (resultTransferIds, totalCount);
    }
    
    /**
     * @dev Get all pending transfers for an address (backward compatibility - returns first 100)
     * @param _address Address to get pending transfers for
     * @return Array of transfer IDs that are still pending
     */
    function getPendingTransfers(address _address) public view returns (uint256[] memory) {
        (uint256[] memory resultTransferIds, ) = getPendingTransfers(_address, 0, MAX_TRANSFERS_PER_QUERY);
        return resultTransferIds;
    }
    
    /**
     * @dev Get transaction chain history for a product token (with pagination)
     * @param _tokenId Token ID
     * @param _offset Starting index for pagination (0-based)
     * @param _limit Maximum number of results to return (max 100)
     * @return resultTransferIds Array of transfer IDs representing the transaction history
     * @return totalCount Total number of transfers in history
     */
    function getTokenTransactionHistory(
        uint256 _tokenId,
        uint256 _offset,
        uint256 _limit
    ) public view returns (uint256[] memory resultTransferIds, uint256 totalCount) {
        require(_limit > 0 && _limit <= MAX_TRANSFERS_PER_QUERY, "Invalid limit");
        
        uint256[] memory allHistory = tokenTransactionHistory[_tokenId];
        totalCount = allHistory.length;
        
        // Calculate actual result size with pagination
        uint256 resultSize = _offset < totalCount ? (totalCount - _offset < _limit ? totalCount - _offset : _limit) : 0;
        resultTransferIds = new uint256[](resultSize);
        
        // Populate result array with pagination
        for (uint256 i = 0; i < resultSize; i++) {
            resultTransferIds[i] = allHistory[_offset + i];
        }
        
        return (resultTransferIds, totalCount);
    }
    
    /**
     * @dev Get transaction chain history for a product token (backward compatibility - returns first 100)
     * @param _tokenId Token ID
     * @return Array of transfer IDs representing the transaction history
     */
    function getTokenTransactionHistory(uint256 _tokenId) public view returns (uint256[] memory) {
        (uint256[] memory resultTransferIds, ) = getTokenTransactionHistory(_tokenId, 0, MAX_TRANSFERS_PER_QUERY);
        return resultTransferIds;
    }
    
    /**
     * @dev Get total number of transfers
     * @return Total count of transfers
     */
    function getTotalTransfers() public view returns (uint256) {
        return totalTransfers;
    }
}
