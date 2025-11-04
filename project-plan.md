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
* add necessary mappings on the contract for transactions to keep track on products.