// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title SupplyChainTracker
 * @dev Educational smart contract for tracking supplies on-chain
 * @notice Basic implementation of supply chain tracking functionality
 */
contract SupplyChainTracker {
    // State variables
    address public owner;
    uint256 public totalSupplies;
    
    // Supply item structure
    struct SupplyItem {
        uint256 id;
        string name;
        string location;
        uint256 timestamp;
        address registeredBy;
        bool isActive;
    }
    
    // Mapping from supply ID to SupplyItem
    mapping(uint256 => SupplyItem) public supplies;
    
    // Array of all supply IDs
    uint256[] public supplyIds;
    
    // Events
    event SupplyRegistered(uint256 indexed id, string name, address indexed registeredBy);
    event SupplyUpdated(uint256 indexed id, string newLocation);
    event SupplyDeactivated(uint256 indexed id);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        totalSupplies = 0;
    }
    
    /**
     * @dev Register a new supply item
     * @param _name Name of the supply item
     * @param _location Current location of the supply
     * @return supplyId The ID of the newly registered supply
     */
    function registerSupply(string memory _name, string memory _location) 
        public 
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
     * @dev Update the location of an existing supply
     * @param _id Supply ID to update
     * @param _newLocation New location of the supply
     */
    function updateSupplyLocation(uint256 _id, string memory _newLocation) public {
        require(supplies[_id].id != 0, "Supply does not exist");
        require(supplies[_id].isActive, "Supply is not active");
        
        supplies[_id].location = _newLocation;
        
        emit SupplyUpdated(_id, _newLocation);
    }
    
    /**
     * @dev Deactivate a supply item
     * @param _id Supply ID to deactivate
     */
    function deactivateSupply(uint256 _id) public {
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

