# Title: Supply Chain Tracker
# Description: Educational decentralized app to keep tracking on chain supplies


# Requirements:
- code and Comments all English.
- Quality test for smart contract.
- Frontend standarts, responsive design, use shadcn/ui components and work with them in web/src/components/ui


# 1. Technologies ✅
## Backend: Solidity, Foundry Anvil
## Frontend: Nextjs typescript, web3 provider, ethers, tailwind ^3 , Metamask

# 2. Proposed Initial Structure ✅
```
- supply-chain-tracker/
    - sc/ -> Backend
    - web/ -> Frontend
```

# 3.  Users and Roles ✅
This is the user and roles functionality for the frontend.
we will use shadcn/ui components along the project and all components form shadcn/ui will be on web/src/components/ui
reusable component as header, footer, menu, transfertable, usertable, will be on web/src/components/

## 3.1 Frontend connection register and Dashboards ✅
User roles will be defined on the Backend smart contract (Admin, Producer, Factory, Retailer, Consumer)
## 3.1.1 connection ✅
* work the connection on 
```supply-chain-tracker/web/src/contexts```
* Use local storage to preserve connection
* add disconnect  and handle disconnection functionality
* Detect connection changes and update storage  data
* using metamask connection, check if metamask exist, manage connection issues.
## 3.1.2 Frontend User Flow ✅
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
## 3.1.3 Dashboards ✅
* Create personalized Dashboard for every role on web/src/app/dashboard.tsx
* Dashboard contain token statistics and transfers.
* Dashboard provide Buttons for actions quick access
* every Role will have a color configuration and will be apply to user theme.
* Create user administration inside web/src/app and create frontend route /admin/users

## 3.2 Backend User and Roles ✅
## 3.2.1 SupplyChain contract ✅
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
## 3.2.2 Script shell for sc deployments ✅
* create shell using env, to start or stop anvil, deploy contract to anvil with network on env file, the script must include deployment information and sync information with the frontend to be use for request on the web/src/contracts directory to be use for frontend calls
* use fork information for anvil https://eth-mainnet.g.alchemy.com/v2/fke6Zvkyv0BXboRGLnsvJ


# 4. Backend Product Token Functionality ✅
Lets continue with the token creation, the contract Supply will be using an ERC20 token standard from openzepelling. 
the functionality is: when a producer create supply a token is created and can be send to the next on the chain in this case it will be factory, the Factory will get a pending request to receive the product token sent by the producer, after the factory confirmation receiving the tokens from the producer, a transfer will be registered too on the contract, saving transaction information.

## 4.1 Token ERC20 ✅
* implement token erc20 called ProductToken, right now is called SupplyItem so replace it and use the struct for the product token on the SupplyChainTracker.sol
* token struct will use a meta data json string attribute for the product features
* when a product is created based on other products the created Product token must contain the parentId
* if a product is created using another product the original product balance must be updated to keep an inventory for materials.
* ids for tokens must be sequential, so we need to calculate next Ids 
* add necessary mappings on the contract for transactions to keep track on products Tokens and transactions.

## 4.2 Product Token transfer ✅
for better understanding, how is the token workflow we will use an example.
1. producer create 50 A supplies (producttokens)
2. producer create a request to send 25 A supplies to factory1, a request is created and can be approved by the factory.
3. once if the tokens are rejected the request is marked as rejected and tokens returns to the creator(producer).
4. if the request is accepted the transaction is complete and now the factory can create other products using the token A supply.
5 when the factory create an amount of products (more tokens as product with another metadata selecting parentId) the balances on the original product must be updated, after new product tokens creation de factory can create a request to send an amount of the new product to the retailer and retailer must accept the request
6. retailer accept the transfer and he can create another token for the customer selecting the parentID product.
7. when an actor (producer, factory, retailer) create the transfer request the default status for the transfer is pending.
8. when the destination actor (factory or retailer) accept or reject the transfer the status will be updated.

## 4.3 Prepare Contract to receive actions request. ✅
 - create required methods  for token creation, including all the information required 
 - create required transfer struct and mapping to track all transactions and all the production chain.
 - create require methods to create transfer request with all the transfer required including dates for the history
 - create methods to create transactions acceptance on the destination actor
 - create methods to list all the pending transaction request for an actor.
 - make sure the only user that can change the request status is the destination address.
 - create method to get transaction chain history based on the product token.
 - update forge test and allow to access test methods specifically

# 5. Backend Product Token and Token transfers  ✅
 This point of the plant is to create the user interface to handle tokens, transfer request according to their roles.
    ## 5.1 create token interface ✅
    * create token interface on the ./web/src/app/token/
    * create page to list all tokens created by the user.
    *  create a page to create new tokens form according with the backend struct, and implement backend call on form submit, add validation fields on the frontend before send the request to the backend.
    * create a page for the token detail, based on the product id
    * create a page to transfer  based on the product id to transfer, include transfer request form and submission handler, add fields validations before endpoint call.
    
    ## 5.2 create Transfer interface ✅
    * working directory must be ./web/src/app/transfers/
    * create a page to display the transfers based on the userId and pending for moderation
    * add actions button to update the transfers(accept or decline), after the action is performed refresh the transfers list.
    * when the user accept a transfer the products amounts should be updated to allow the user to create products based on the product received as parentId.

    ## 5.3 Frontend token creation metadata json ✅
    * create frontend method to transform metadata json content into, text fields as label and fieldData, and allow to add as much as user required.
    * create frontend method to check the metadata before the submission and filter labels to be lowercase and trimmed and textdata, and process them to transform all to json format.

    ## 5.4 Frontend token transfer form ✅
    * simplify transfer creation, the recipient address field should be a select field with the address of the next actor on the chain. let say the producer is trying to create a token transfer request, the recipient address(destination address) should be a a select list of factories.
    * add fields validation before the transfer creation request is sent to the backend.
    
    ## 5.5 Frontend all history ✅
    * create the page and add a button on the products to see all product track history 
    * for users with consumer role since they are the last actor on the chain, they wont need the transfer button just the details and all history

    ## 5.6 Token page identify ✅
    * since there are 2 kind of tokens related with user (1. token transferred to the user 2. tokens created by the user related with another token as parentId) we need to create 2 views on that page to avoid confusions. ✅

# 6. Profiles✅
* create profile page on ./web/src/app/profile/page.tsx
* display user information on this page


# 7. Performance check and clean up
* Check contract performance and standards
* Do a performance check on the frontend
* Clean up code, remove dead code. 

# 8. Tests
* check contract actual tests, do the tests cover all the functionality.
* list of functionality for test coverage:
- User register
- admin approve user
- admin reject user
- User status changes
- only approved users can operate
- get user info
- is admin
- token creation by producer, factory, retailer
- token with parent Id
- token metadata
- token balance
- get token
- get User tokens
- Transfer from to (producer->factory, factory->retailer,retailer->consumer)
- accept/reject transfers
- transfer with insufficient balance
- get transfer
- get users transfers
- invalid role transfer
- unapproved user cant create token
- unapproved user cant create transfer
- only admin can change status
- consumer cannot transfer
- transfer to same address
- transfer zero account
- transfer non existent token
- accept non existent transfer
- double accept transfer
- transfer after rejection
- event user register
- event user status change
- event token created
- event transfer initiated
- event transfer accepted
- event transfer rejected
- complete supply chain flow
- multiple tokens flow
- traceability flow
* create frontend automate test just for admin to test flow and functionality on /web/tests follow the previous list to check test coverage.



# 9. Log errors found during AI sessions.
* read and analyze files in ./ai-chats/*, detect issues during session and write them below point 3 in the ./AI.md