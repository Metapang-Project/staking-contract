//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./IBEP20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BnBTokenPool is Ownable {
  using SafeMath for uint256;

  IBEP20 public INTEREST;
  string public TOKEN_SYMBOL = "BNB";
  string public INTEREST_SYMBOL;

  uint startTime;
  uint endTime;
  uint _stakingDays;
  bool _isInitialize = false;
  uint calculateCount = 0;

  uint256 private _stakeTotal;
  uint256 private _intrestTotal;
  uint256 private _intrestRest;
  mapping(address => uint256) private _balances;
  mapping(address => uint256) private _userIntrestToal;
  mapping(address => mapping(uint => uint256)) private _intrests;
  address[] internal _stakers;

  event Staked(address indexed user, uint256 amount);
  event Withdrawn(address indexed user, string symbol, uint256 amount);
  event Calculate(uint indexed day, uint256 dailyIntrest, uint stakerCount);

  constructor(address _interest, string memory _interestSymbol) {
    INTEREST = IBEP20(_interest);
    INTEREST_SYMBOL = _interestSymbol;
  }

  function stakeTotal() public view returns (uint256) {
    return _stakeTotal;
  }

  function stakeSymbol() public view returns (string memory) {
    return TOKEN_SYMBOL;
  }

  function intrestTotal() public view returns (uint256) {
    return _intrestTotal;
  }

  function intrestRest() public view returns (uint256) {
    return _intrestRest;
  }

  function intrestSymbol() public view returns (string memory) {
    return INTEREST_SYMBOL;
  }

  function stakingDays() public view returns (uint) {
    return _stakingDays;
  }

  function balanceOf(address account) public view returns (uint256) {
    return _balances[account];
  }

  function intrestOf(address account) public view returns (uint256) {
    return _userIntrestToal[account];
  }

  function dayInterestOf(address account, uint day) public view returns (uint256) {
    return _intrests[account][day];
  }

  function isInitialize() public view returns (bool) {
    return _isInitialize;
  }
  
  function intialize(uint256 _interestAmount, uint _startTime, uint _endTime, uint _days) public onlyOwner {
    require(_isInitialize == false, "Pool already initialized");
    INTEREST.transferFrom(msg.sender, address(this), _interestAmount);
    _intrestTotal = _intrestTotal.add(_interestAmount);
    _intrestRest = _intrestTotal;
    startTime = _startTime;
    endTime = _endTime;
    _stakingDays = _days;
    _isInitialize = true;
  }

  function stake() public payable {
    require(_isInitialize == true, "Pool not initialized");
    require(msg.value > 0, 'Cannot Stake 0');
    require(block.timestamp >= startTime, "Staking did not start");
    require(block.timestamp < endTime, "Staking did end");

    if (_balances[msg.sender] == 0) {
      _stakers.push(msg.sender);
    }

    _stakeTotal = _stakeTotal.add(msg.value);
    _balances[msg.sender] = _balances[msg.sender].add(msg.value);

    emit Staked(msg.sender, msg.value);
  }

  function principalWithdraw(uint256 amount) public {
    require(_isInitialize == true, "Pool not initialized");
    require(_balances[msg.sender] > 0, "No balance");
    require(amount > 0, "Cannot withdraw 0");
    require(block.timestamp > endTime, "Staking did not end");

    _stakeTotal = _stakeTotal.sub(amount);
    _balances[msg.sender] = _balances[msg.sender].sub(amount);

    payable(msg.sender).transfer(amount);

    emit Withdrawn(msg.sender, TOKEN_SYMBOL, amount);
  }

  function interestWithdraw(uint256 amount) public {
    require(_isInitialize == true, "Pool not initialized");
    require(_userIntrestToal[msg.sender] > 0, "No balance");
    require(amount > 0, "Cannot withdraw 0");
    require(block.timestamp > endTime, "Staking did not end");

    _intrestTotal = _intrestTotal.sub(amount);
    _userIntrestToal[msg.sender] = _userIntrestToal[msg.sender].sub(amount);

    INTEREST.transfer(msg.sender, amount);

    emit Withdrawn(msg.sender, INTEREST_SYMBOL, amount);
  }

  function calculate() public onlyOwner {
    require(_stakingDays > calculateCount, "All calculations are complete");
    calculateCount = calculateCount + 1;
    uint256 dailyInterest = _intrestTotal.div(_stakingDays);

    for (uint i = 0; i < _stakers.length; i++) {
      uint256 userStaked = _balances[_stakers[i]];
      uint256 userIntrest = dailyInterest.div(_stakeTotal).mul(userStaked);

      _userIntrestToal[_stakers[i]] = _userIntrestToal[_stakers[i]].add(userIntrest);
      _intrests[_stakers[i]][calculateCount] = userIntrest;

      INTEREST.approve(_stakers[i], _userIntrestToal[_stakers[i]]);
    }

    _intrestRest = _intrestRest.sub(dailyInterest);

    emit Calculate(calculateCount, dailyInterest, _stakers.length);
  }
}