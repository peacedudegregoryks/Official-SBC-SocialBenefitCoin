pragma solidity ^0.4.23;

import './interfaces/ERC20.sol';
import './SBCoin.sol';
import './SafeMath.sol';
import './Ownable.sol';

/**
 * Social Benefit Coin airdrop distribution
 *
 * Distribute community, wirdpbc, founder, game, advisor, reserve, and bonus coins
 */
contract SBCDistribution is Ownable {
  using SafeMath for uint256;

  SBCoin public SBC;

  uint256 private constant decimalFactor = 10**uint256(18);
  enum AllocationType { COMMUNITY, WIRDPBC, FOUNDER, GAME, ADVISOR, RESERVE, BONUS1, BONUS2, BONUS3 }
  uint256 public constant INITIAL_SUPPLY   =  198000000 * decimalFactor;
  uint256 public AVAILABLE_TOTAL_SUPPLY    =  198000000 * decimalFactor;
  uint256 public AVAILABLE_COMMUNITY_SUPPLY  =  80000000 * decimalFactor; // 33% Released at CD +1 year -> 100% at CD +3 years
  uint256 public AVAILABLE_WIRDPBC_SUPPLY  =  12000000 * decimalFactor; // 33% Released at CD +1 year -> 100% at CD +3 years
  uint256 public AVAILABLE_FOUNDER_SUPPLY  =  11000000 * decimalFactor; // 33% Released at CD +1 year -> 100% at CD +3 years
  uint256 public AVAILABLE_GAMEAIRDROP_SUPPLY  =  10000000 * decimalFactor; // 100% Released at CD
  uint256 public AVAILABLE_ADVISOR_SUPPLY  =  2500000 * decimalFactor; // 33% Released at CD +1 year -> 100% at CD +3 years
  uint256 public AVAILABLE_RESERVE_SUPPLY  =  71000000 * decimalFactor; // 6.8% Released at CD +100 days -> 100% at CD +4 years
  uint256 public AVAILABLE_BONUS1_SUPPLY  =    4000000 * decimalFactor; // 100% Released at CD +1 year
  uint256 public AVAILABLE_BONUS2_SUPPLY  =     4000000 * decimalFactor; // 100% Released at CD +2 years
  uint256 public AVAILABLE_BONUS3_SUPPLY  =    4000000 * decimalFactor; // 100% Released at CD +3 years

  uint256 public grandTotalClaimed = 0;
  uint256 public startTime;

  // Allocation with vesting information
  struct Allocation {
    uint8 AllocationSupply; // Type of allocation
    uint256 endCliff;       // coins are locked until
    uint256 endVesting;     // This is when the coins are fully unvested
    uint256 totalAllocated; // Total coins allocated
    uint256 amountClaimed;  // Total coins claimed
  }
  mapping (address => Allocation) public allocations;

  // List of admins
  mapping (address => bool) public airdropAdmins;

  // Keeps track of whether or not a 200 SBC game airdrop has been made to a particular address
  mapping (address => bool) public airdrops;

  modifier onlyOwnerOrAdmin() {
    require(msg.sender == owner || airdropAdmins[msg.sender]);
    _;
  }

  event LogNewAllocation(address indexed _recipient, AllocationType indexed _fromSupply, uint256 _totalAllocated, uint256 _grandTotalAllocated);
  event LogSBCClaimed(address indexed _recipient, uint8 indexed _fromSupply, uint256 _amountClaimed, uint256 _totalAllocated, uint256 _grandTotalClaimed);

  /**
    * dev Constructor function - Set the Social Benefit Coin address
    * param _startTime The time when SBCDistribution goes live
    */
  function SBCDistribution(uint256 _startTime) public {
    require(_startTime >= now);
    require(AVAILABLE_TOTAL_SUPPLY == AVAILABLE_COMMUNITY_SUPPLY.add(WIRDPBC_SUPPLY).add(AVAILABLE_FOUNDER_SUPPLY).add(AVAILABLE_GAMEAIRDROP_SUPPLY).add(AVAILABLE_ADVISOR_SUPPLY).add(AVAILABLE_RESERVE_SUPPLY).add(AVAILABLE_BONUS1_SUPPLY).add(AVAILABLE_BONUS2_SUPPLY).add(AVAILABLE_BONUS3_SUPPLY));
    startTime = _startTime;
    SBC = new SBCoin(this);
  }

  /**
    * dev Allow the owner of the contract to assign a new allocation
    * param _recipient The recipient of the allocation
    * param _totalAllocated The total amount of SBC coins available to the receipient (after vesting)
    * param _supply The SBC supply the allocation will be taken from
    */
  function setAllocation (address _recipient, uint256 _totalAllocated, AllocationType _supply) onlyOwner public {
    require(allocations[_recipient].totalAllocated == 0 && _totalAllocated > 0);
    require(_supply >= AllocationType.COMMUNITY && _supply <= AllocationType.COMMUNITY);
    require(_recipient != address(0));
    if (_supply == AllocationType.COMMUNITY) {
      AVAILABLE_COMMUNITY_SUPPLY = AVAILABLE_COMMUNITY_SUPPLY.sub(_totalAllocated);
      allocations[_recipient] = Allocation(uint8(AllocationType.COMMUNITY), startTime + 1 years, startTime + 3 years, _totalAllocated, 0);

    } else if (_supply == AllocationType.WIRDPBC) {
        AVAILABLE_WIRDPBC_SUPPLY = AVAILABLE_WIRDPBC_SUPPLY.sub(_totalAllocated);
        allocations[_recipient] = Allocation(uint8(AllocationType.WIRDPBC), startTime + 1 years, startTime + 3 years, _totalAllocated, 0);

    } else if (_supply == AllocationType.FOUNDER) {
      AVAILABLE_FOUNDER_SUPPLY = AVAILABLE_FOUNDER_SUPPLY.sub(_totalAllocated);
      allocations[_recipient] = Allocation(uint8(AllocationType.FOUNDER), startTime + 1 years, startTime + 3 years, _totalAllocated, 0);

      } else if (_supply == AllocationType.ADVISOR) {
        AVAILABLE_GAMEAIRDROP_SUPPLY = AVAILABLE_GAMEAIRDROP_SUPPLY.sub(_totalAllocated);
        allocations[_recipient] = Allocation(uint8(AllocationType.GAME), startTime + 90 days, 0, _totalAllocated, 0);

    } else if (_supply == AllocationType.ADVISOR) {
      AVAILABLE_ADVISOR_SUPPLY = AVAILABLE_ADVISOR_SUPPLY.sub(_totalAllocated);
      allocations[_recipient] = Allocation(uint8(AllocationType.ADVISOR), startTime + 1 years, startTime + 3 years, _totalAllocated, 0);

    } else if (_supply == AllocationType.RESERVE) {
      AVAILABLE_RESERVE_SUPPLY = AVAILABLE_RESERVE_SUPPLY.sub(_totalAllocated);
      allocations[_recipient] = Allocation(uint8(AllocationType.RESERVE), startTime + 100 days, startTime + 4 years, _totalAllocated, 0);

    } else if (_supply == AllocationType.BONUS1) {
      AVAILABLE_BONUS1_SUPPLY = AVAILABLE_BONUS1_SUPPLY.sub(_totalAllocated);
      allocations[_recipient] = Allocation(uint8(AllocationType.BONUS1), startTime + 1 years, startTime + 1 years, _totalAllocated, 0);

    } else if (_supply == AllocationType.BONUS2) {
      AVAILABLE_BONUS2_SUPPLY = AVAILABLE_BONUS2_SUPPLY.sub(_totalAllocated);
      allocations[_recipient] = Allocation(uint8(AllocationType.BONUS2), startTime + 2 years, startTime + 2 years, _totalAllocated, 0);

    } else if (_supply == AllocationType.BONUS3) {
      AVAILABLE_BONUS3_SUPPLY = AVAILABLE_BONUS3_SUPPLY.sub(_totalAllocated);
      allocations[_recipient] = Allocation(uint8(AllocationType.BONUS3), startTime + 3 years, startTime + 3 years, _totalAllocated, 0);

    }
    AVAILABLE_TOTAL_SUPPLY = AVAILABLE_TOTAL_SUPPLY.sub(_totalAllocated);
    LogNewAllocation(_recipient, _supply, _totalAllocated, grandTotalAllocated());
  }

  /**
    * dev Add an airdrop admin
    */
  function setAirdropAdmin(address _admin, bool _isAdmin) public onlyOwner {
    airdropAdmins[_admin] = _isAdmin;
  }

  /**
    * dev perform a transfer of SBC Game airdrop allocations
    * param _recipient is a list of recipients
    */
  function airdropcoins(address[] _recipient) public onlyOwnerOrAdmin {
    require(now >= startTime);
    uint airdropped;
    for(uint256 i = 0; i< _recipient.length; i++)
    {
        if (!airdrops[_recipient[i]]) {
          airdrops[_recipient[i]] = true;
          require(SBC.transfer(_recipient[i], 200 * decimalFactor));
          airdropped = airdropped.add(200 * decimalFactor);
        }
    }
    AVAILABLE_GAMEAIRDROP_SUPPLY = AVAILABLE_GAMEAIRDROP_SUPPLY.sub(airdropped);
    AVAILABLE_TOTAL_SUPPLY = AVAILABLE_TOTAL_SUPPLY.sub(airdropped);
    grandTotalClaimed = grandTotalClaimed.add(airdropped);
  }

  /**
    * dev Transfer a recipients available allocation to their address
    * param _recipient The address to withdraw coins for
    */
  function transferTokens (address _recipient) public {
    require(allocations[_recipient].amountClaimed < allocations[_recipient].totalAllocated);
    require(now >= allocations[_recipient].endCliff);
    require(now >= startTime);
    uint256 newAmountClaimed;
    if (allocations[_recipient].endVesting > now) {
      // Transfer available amount based on vesting schedule and allocation
      newAmountClaimed = allocations[_recipient].totalAllocated.mul(now.sub(startTime)).div(allocations[_recipient].endVesting.sub(startTime));
    } else {
      // Transfer total allocated (minus previously claimed coins)
      newAmountClaimed = allocations[_recipient].totalAllocated;
    }
    uint256 coinsToTransfer = newAmountClaimed.sub(allocations[_recipient].amountClaimed);
    allocations[_recipient].amountClaimed = newAmountClaimed;
    require(SBC.transfer(_recipient, coinsToTransfer));
    grandTotalClaimed = grandTotalClaimed.add(coinsToTransfer);
    LogSBCClaimed(_recipient, allocations[_recipient].AllocationSupply, coinsToTransfer, newAmountClaimed, grandTotalClaimed);
  }

  // Returns the amount of SBC allocated
  function grandTotalAllocated() public view returns (uint256) {
    return INITIAL_SUPPLY - AVAILABLE_TOTAL_SUPPLY;
  }

  // Allow transfer of accidentally sent ERC20 (tokens)coins
  function refundTokens(address _recipient, address _token) public onlyOwner {
    require(_token != address(SBC));
    ERC20 token = ERC20(_token);
    uint256 balance = token.balanceOf(this);
    require(token.transfer(_recipient, balance));
  }
}
