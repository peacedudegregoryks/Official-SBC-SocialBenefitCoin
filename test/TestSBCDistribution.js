const SBCDistribution = artifacts.require("./SBCDistribution.sol");
const SBCoin = artifacts.require("./SBC.sol");
const Web3 = require('web3')

var BigNumber = require('bignumber.js')

//The following line is required to use timeTravel with web3 v1.x.x
Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545")) // Hardcoded development port

const timeTravel = function (time) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [time], // 86400 is num seconds in day
      id: new Date().getTime()
    }, (err, result) => {
      if(err){ return reject(err) }
      return resolve(result)
    });
  })
}

const mineBlock = function () {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_mine"
    }, (err, result) => {
      if(err){ return reject(err) }
      return resolve(result)
    });
  })
}

const logTitle = function (title) {
  console.log("*****************************************");
  console.log(title);
  console.log("*****************************************");
}

const logError = function (err) {
  console.log("-----------------------------------------");
  console.log(err);
  console.log("-----------------------------------------");
}

contract('SBCDistribution', function(accounts) {

  let sbcDistribution;
  let sbcCoin;
  let sbcCoinAddress;
  let timeOffset = 3600 * 24 * 30; // Starts in 30 days
  let _startTime = Math.floor(new Date().getTime() /1000 + timeOffset); // Starts 10 min from now

  let account_owner     = accounts[0];
  let account_community = accounts[1];
  let account_wirdpbc   = accounts[2];
  let account_founder   = accounts[3];
  let account_game      = accounts[6];
  let account_advisors  = accounts[7];
  let account_bonus     = accounts[8];
  let account_reserve   = accounts[9];

  let account_admin1  = accounts[4];

  let airdrop_massive = new Array();
  for (var i = 0; i< 50; i++){
    var acc = web3.eth.accounts.create();
    airdrop_massive[i] = acc.address;
  }

  let airdrop_massive2 = new Array();
  for (var i = 0; i< 50; i++){
    var acc = web3.eth.accounts.create();
    airdrop_massive2[i] = acc.address;
  }

  let allocationStruct = {
    AllocationSupply: 0,    // Type of allocation
    endCliff: 0,            // Tokens are locked until
    endVesting: 0,          // This is when the tokens are fully unvested
    totalAllocated: 0,       // Total tokens allocated
    amountClaimed: 0        // Total tokens claimed
  }

  let contractStartTime;

  function setAllocationStruct(_struct){
    allocationStruct.AllocationSupply = _struct[0].toNumber();
    allocationStruct.endCliff = _struct[1].toNumber();
    allocationStruct.endVesting = _struct[2].toNumber();
    allocationStruct.totalAllocated = _struct[3].toNumber();
    allocationStruct.amountClaimed = _struct[4].toNumber();
  }

  function logWithdrawalData(_allocationType, _currentBlockTime, _account_community, _contractStartTime, _allocation, _new_community_tokenBalance){
    console.log("\n");
    logTitle("Review coins withdrawn for "+ _allocationType +" account:\n" + _account_community);
    console.log("Current time:", _currentBlockTime.toString(10));
    console.log("Start time:", _contractStartTime.toString(10));
    console.log("Cliff End:", _allocation[1].toString(10));
    console.log("Vesting End:", _allocation[2].toString(10));
    console.log("Tokens Allocated:", _allocation[3].toString(10));
    console.log("Tokens Claimed :", _allocation[4].toString(10));
    console.log("SBC coin balance :", _new_community_tokenBalance.toString(10));
    console.log("\n");
  }

  function calculateExpectedTokens(_allocation, _currentTime, _contractStartTime){
    //If fully vested (vesting time >= now) return all the allocation, else, calculate the proportion
    if(_currentTime >= _allocation[2].toNumber())
      return _allocation[3].toNumber();
    else
      return Math.floor((_allocation[3].toNumber() * (_currentTime - _contractStartTime.toNumber())) / (_allocation[2].toNumber() - _contractStartTime.toNumber()));
  }

  async function doAllocationTests(_allocationType, _tokenAllocation, _accountToUse) {
    it("should allocate "+ _allocationType +" tokens", async function () {

      let oldCommunitySupply;
      let tokenAllocation = _tokenAllocation;
      let accountToUse = _accountToUse;
      let allocationTypeNum;

      switch (_allocationType) {
        case "COMMUNITY":
            oldCommunitySupply = await sbcDistribution.AVAILABLE_COMMUNITY_SUPPLY({from:account_owner});
            allocationTypeNum = 0;
          break;
        case "FOUNDER":
            oldCommunitySupply = await sbcDistribution.AVAILABLE_FOUNDER_SUPPLY({from:account_owner});
            allocationTypeNum = 1;
          break;
        case "ADVISOR":
            oldCommunitySupply = await sbcDistribution.AVAILABLE_ADVISOR_SUPPLY({from:account_owner});
            allocationTypeNum = 3;
          break;
        case "RESERVE":
            oldCommunitySupply = await sbcDistribution.AVAILABLE_RESERVE_SUPPLY({from:account_owner});
            allocationTypeNum = 4;
          break;
        case "BONUS1":
            oldCommunitySupply = await sbcDistribution.AVAILABLE_BONUS1_SUPPLY({from:account_owner});
            allocationTypeNum = 5;
          break;
        case "BONUS2":
            oldCommunitySupply = await sbcDistribution.AVAILABLE_BONUS2_SUPPLY({from:account_owner});
            allocationTypeNum = 6;
          break;
        case "BONUS3":
            oldCommunitySupply = await sbcDistribution.AVAILABLE_BONUS3_SUPPLY({from:account_owner});
            allocationTypeNum = 7;
          break;
        default:

      }

      await sbcDistribution.setAllocation(accountToUse,tokenAllocation,allocationTypeNum,{from:account_owner});
      let allocation = await sbcDistribution.allocations(accountToUse,{from:account_owner});
      setAllocationStruct(allocation);

      // Allocation must be equal to the passed tokenAllocation
      assert.equal(allocationStruct.totalAllocated, tokenAllocation);
      assert.equal(allocationStruct.AllocationSupply, allocationTypeNum);

      console.log(allocationStruct);

      let newCommunitySupply

      switch (_allocationType) {
        case "COMMUNITY":
          newCommunitySupply = await sbcDistribution.AVAILABLE_COMMUNITY_SUPPLY({from:account_owner});
          break;
        case "FOUNDER":
          newCommunitySupply = await sbcDistribution.AVAILABLE_FOUNDER_SUPPLY({from:account_owner});
          break;
        case "ADVISOR":
          newCommunitySupply = await sbcDistribution.AVAILABLE_ADVISOR_SUPPLY({from:account_owner});
          break;
        case "RESERVE":
          newCommunitySupply = await sbcDistribution.AVAILABLE_RESERVE_SUPPLY({from:account_owner});
          break;
        case "BONUS1":
          newCommunitySupply = await sbcDistribution.AVAILABLE_BONUS1_SUPPLY({from:account_owner});
          break;
        case "BONUS2":
          newCommunitySupply = await sbcDistribution.AVAILABLE_BONUS2_SUPPLY({from:account_owner});
          break;
        case "BONUS3":
          newCommunitySupply = await sbcDistribution.AVAILABLE_BONUS3_SUPPLY({from:account_owner});
          break;
        default:

      }

      // Supply must match the new supply available
      assert.equal(newCommunitySupply.toNumber(),oldCommunitySupply.toNumber() + tokenAllocation);

    });
  };

  before(async() => {
        sbcDistribution = await sbcDistribution.new(_startTime,{from:accounts[0]});
        sbcCoinAddress = await sbcDistribution.SBC({from:accounts[0]});
        sbCoin = await SBCoin.at(sbcCoinAddress);

        contractStartTime = await sbcDistribution.startTime({from:accounts[0]});
    });

  describe("All tests", async function () {

    describe("Test Constructor", async function () {

      it("should have deployed SBCoin", async function () {
        logTitle("SBCoin Address: "+ sbcCoinAddress);
        assert.notEqual(sbcCoinAddress.valueOf(), "0x0000000000000000000000000000000000000000", "Token was not initialized");
      });

    });

    ///////////////////////
    // Test allocations
    ///////////////////////

    describe("Allocations", async function () {

      let oldTotalSupply;
      let grantTotalAllocationSum = new BigNumber(0);
      let tokensAllocated;

      before(async() => {
        oldTotalSupply = await sbcDistribution.AVAILABLE_TOTAL_SUPPLY({from:account_owner});
      });

      describe("COMMUNITY Allocation", async function () {

        let tokensToAllocate = 1000;
        doAllocationTests("COMMUNITY",tokensToAllocate,account_community);

        after(async() => {
          oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
          grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
        });
      });

      describe("FOUNDER 1 Allocation", async function () {

        let tokensToAllocate = 50000;
        doAllocationTests("FOUNDER",tokensToAllocate,account_founder1);

        after(async() => {
          oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
          grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
        });

      });

      describe("FOUNDER 2 Allocation", async function () {

        let tokensToAllocate = 175000;
        doAllocationTests("FOUNDER",tokensToAllocate,account_founder2);

        after(async() => {
          oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
          grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
        });

      });

      describe("ADVISOR 1 Allocation", async function () {

        let tokensToAllocate = 3333;
        doAllocationTests("ADVISOR",tokensToAllocate,account_advisor1);

        after(async() => {
          oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
          grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
        });

      });

      describe("ADVISOR 2 Allocation", async function () {

        let tokensToAllocate = 7777;
        doAllocationTests("ADVISOR",tokensToAllocate,account_advisor2);

        after(async() => {
          oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
          grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
        });

      });

      describe("RESERVE Allocation", async function () {

        let tokensToAllocate = 1000;
        doAllocationTests("RESERVE",tokensToAllocate,account_reserve);

        after(async() => {
          oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
          grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
        });

      });

      describe("BONUS 1 Allocation", async function () {

        let tokensToAllocate = 5000;
        doAllocationTests("BONUS1",tokensToAllocate,account_bonus1);

        after(async() => {
          oldTotalSupply = new BigNumber(oldTotalSupply.minus(tokensToAllocate));
          grantTotalAllocationSum = new BigNumber(grantTotalAllocationSum.plus(tokensToAllocate));
        });

      });

      describe("Allocation post tests", async function () {

        it("New total supply should match allocations previously made", async function () {

          let newTotalSupply = await sbcDistribution.AVAILABLE_TOTAL_SUPPLY({from:account_owner});
          assert.equal(oldTotalSupply.toString(10),newTotalSupply.toString(10));

        });

        it("Grand total should match allocations previously made", async function () {

          let grandTotalAllocated = await sbcDistribution.grandTotalAllocated({from:account_owner});
          assert.equal(grantTotalAllocationSum.toString(10),grandTotalAllocated.toString(10));

        });
      });

      describe("Allocation invalid parameters", async function () {

        it("should reject invalid _supply codes", async function () {
          try {
            await sbcDistribution.setAllocation(account_advisor1,1000,8,{from:account_owner});
          } catch (error) {
              logError("✅   Rejected invalid _supply code");
              return true;
          }
          throw new Error("I should never see this!")
        });

        it("should reject invalid address", async function () {
          try {
            await sbcDistribution.setAllocation(0,1000,0,{from:account_owner});
          } catch (error) {
              logError("✅   Rejected invalid address");
              return true;
          }
          throw new Error("I should never see this!")
        });

        it("should reject invalid allocation", async function () {
          try {
            await sbcDistribution.setAllocation(account_advisor2,0,0,{from:account_owner});
          } catch (error) {
              logError("✅   Rejected invalid allocation ");
              return true;
          }
          throw new Error("I should never see this!")
        });

        it("should reject repeated allocations", async function () {
          try {
            await sbcDistribution.setAllocation(account_community,1000,0,{from:account_owner});
          } catch (error) {
              logError("✅   Rejected repeated allocations ");
              return true;
          }
          throw new Error("I should never see this!")
        });

      });

    });

    ///////////////////////
    // Test withdrawal
    ///////////////////////

    describe("Withdrawal / transfer", async function () {

      describe("Withdraw immediately after allocations", async function () {

        before(async() => {
          //Time travel to startTime;
            await timeTravel(timeOffset+1)// Move forward in time so the No-Ico has started
            await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
          });

        it("should withdraw COMMUNITY tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await sbCoin.balanceOf(account_community,{from:accounts[0]});
          await sbcDistribution.transferTokens(account_community,{from:accounts[0]});
          let new_tokenBalance = await sbCoin.balanceOf(account_presale,{from:accounts[0]});

          //COMMUNITY coins.
          let allocation = await sbcDistribution.allocations(account_community,{from:account_owner});

          logWithdrawalData("COMMUNITY",currentBlock.timestamp,account_community,contractStartTime,allocation,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);
          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });

        it("should fail to withdraw FOUNDER tokens as cliff period not reached", async function () {

          try {
            await sbcDistribution.transferTokens(account_founder1,{from:accounts[0]});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await sbCoin.balanceOf(account_founder1,{from:accounts[0]});
              let allocation = await sbcDistribution.allocations(account_founder1,{from:account_owner});
              logWithdrawalData("FOUNDER",currentBlock.timestamp,account_founder1,contractStartTime,allocation,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!")

        });

        it("should fail to withdraw ADVISOR tokens as cliff period not reached", async function () {

          try {
            await sbcDistribution.transferTokens(account_advisor1,{from:accounts[0]});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await sbCoin.balanceOf(account_advisor1,{from:accounts[0]});
              let allocation = await sbcDistribution.allocations(account_advisor1,{from:account_owner});
              logWithdrawalData("ADVISOR",currentBlock.timestamp,account_advisor1,contractStartTime,allocation,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!")

        });

        it("should fail to withdraw RESERVE tokens as cliff period not reached", async function () {

          try {
            await sbcDistribution.transferTokens(account_reserve,{from:accounts[0]});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await sbCoin.balanceOf(account_reserve,{from:accounts[0]});
              let allocation = await sbcDistribution.allocations(account_reserve,{from:account_owner});
              logWithdrawalData("RESERVE",currentBlock.timestamp,account_reserve,contractStartTime,allocation,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!")

        });

        it("should perform the AIRDROP for 50 accounts", async function () {
          await sbcDistribution.airdropTokens(airdrop_massive,{from:accounts[0]});

        });

        it("airdrop accounts should have 200 SBC each", async function () {
          for (var i = 0; i< airdrop_massive.length; i++){
            let tokenBalance = await sbCoin.balanceOf(airdrop_massive[i],{from:accounts[0]});
            assert.equal(tokenBalance.toString(10), "250000000000000000000");

          }
        });

        it("should set another admin for airdrop", async function () {
          await sbcDistribution.setAirdropAdmin(account_admin1,true,{from:accounts[0]});

        });

        it("should perform the AIRDROP for 50 accounts with an admin", async function () {
          await sbcDistribution.airdropTokens(airdrop_massive2,{from:account_admin1});

        });

        it("airdrop accounts should have 200 SBC each", async function () {
          for (var i = 0; i< airdrop_massive2.length; i++){
            let tokenBalance = await sbCoin.balanceOf(airdrop_massive2[i],{from:accounts[0]});
            assert.equal(tokenBalance.toString(10), "250000000000000000000");

          }
        });



      });

      describe("Withdraw 8 months after allocations", async function () {

        before(async() => {
          //Time travel to startTime + 8 months;
            await timeTravel((3600 * 24 * 240))// Move forward in time so the No-Ico has started
            await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
        });

        it("should withdraw RESERVE tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check coin token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await sbCoin.balanceOf(account_reserve,{from:accounts[0]});
          await sbcDistribution.transferTokens(account_reserve,{from:accounts[0]});
          let new_tokenBalance = await sbCoin.balanceOf(account_reserve,{from:accounts[0]});

          //COMMUNITY coins have a vesting period 
          let allocation = await sbcDistribution.allocations(account_reserve,{from:account_owner});

          logWithdrawalData("RESERVE",currentBlock.timestamp,account_reserve,contractStartTime,allocation,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);
          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });


      });



      describe("Withdraw 15 months after allocations", async function () {

        before(async() => {
          //Time travel to startTime + 15 months;
            await timeTravel((3600 * 24 * 210))// Move forward in time so the crowdsale has started
            await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
        });

        it("should withdraw FOUNDER tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await sbCoin.balanceOf(account_founder1,{from:accounts[0]});
          await sbcDistribution.transferTokens(account_founder1,{from:accounts[0]});
          let new_tokenBalance = await sbCoin.balanceOf(account_founder1,{from:accounts[0]});

          //COMMUNITY coins now have a vesting period or cliff
          let allocation = await sbcDistribution.allocations(account_founder1,{from:account_owner});

          logWithdrawalData("FOUNDER",currentBlock.timestamp,account_founder1,contractStartTime,allocation,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);
          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });

        it("should withdraw BONUS 1 tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check coin balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await sbCoin.balanceOf(account_bonus1,{from:accounts[0]});
          await sbcDistribution.transferTokens(account_bonus1,{from:accounts[0]});
          let new_tokenBalance = await sbCoin.balanceOf(account_bonus1,{from:accounts[0]});

          //COMMUNITY coins now have a vesting period or cliff
          let allocation = await sbcDistribution.allocations(account_bonus1,{from:account_owner});

          logWithdrawalData("BONUS1",currentBlock.timestamp,account_bonus1,contractStartTime,allocation,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);
          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });

        it("should withdraw RESERVE tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check coin balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await sbCoin.balanceOf(account_reserve,{from:accounts[0]});
          await sbcDistribution.transferTokens(account_reserve,{from:accounts[0]});
          let new_tokenBalance = await sbCoin.balanceOf(account_reserve,{from:accounts[0]});

          //COMMUNITY coins now have a vesting period or cliff
          let allocation = await sbcDistribution.allocations(account_reserve,{from:account_owner});

          logWithdrawalData("RESERVE",currentBlock.timestamp,account_reserve,contractStartTime,allocation,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);
          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });

        it("should withdraw ADVISOR tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check coin balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await sbCoin.balanceOf(account_advisor1,{from:accounts[0]});
          await sbcDistribution.transferTokens(account_advisor1,{from:accounts[0]});
          let new_tokenBalance = await sbCoin.balanceOf(account_advisor1,{from:accounts[0]});

          //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
          let allocation = await sbcDistribution.allocations(account_advisor1,{from:account_owner});

          logWithdrawalData("ADVISOR",currentBlock.timestamp,account_advisor1,contractStartTime,allocation,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);
          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });

      });

    });

    ///////////////////////
    // Test others
    ///////////////////////

    describe("Ether Transfers", async function () {

      it("should reject transfers", async function () {
        try {
          await sbcDistribution.sendTransaction({from:accounts[0], value:web3.utils.toWei("1","ether")});
        } catch (error) {
            logError("✅   Rejected incoming ether");
            return true;
        }
        throw new Error("I should never see this!")
      });

    });

  });
});
