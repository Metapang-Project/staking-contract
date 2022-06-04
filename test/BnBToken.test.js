const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("BnBToken Test", () => {
  const accounts = [];
  let operator;
  let staker1;
  let staker2;
  let staker3;
  let token;
  let notWithdrawablePool;
  const TOKEN_NAME = 'TEST TOKEN';
  const TOKEN_SYMBOL = 'TEST';
  const DECIMALS = 18;
  const TOTAL_SUPPLY = '1000000000000000000000';
  const INTEREST_AMOUNT = '300000000000000000000';

  before(async () => {
    const wallets = await ethers.getSigners();
    for (const account of wallets) {
      accounts.push(account);
    }

    operator = accounts[0];
    staker1 = accounts[1];
    staker2 = accounts[2];
    staker3 = accounts[3];

    const Token = await ethers.getContractFactory('BEP20Token');
    token = await Token.connect(operator).deploy(TOTAL_SUPPLY, DECIMALS, TOKEN_SYMBOL, TOKEN_NAME);
    await token.deployed();
  });

  it("Token Factory", async () => {
    const symbol = await token.symbol();
    const name = await token.name();
    const totalSupply = await token.totalSupply();
    const decimals = await token.decimals();
    const operatorBalance = await token.balanceOf(operator.address);

    expect(symbol).to.equal(TOKEN_SYMBOL);
    expect(name).to.equal(TOKEN_NAME);
    expect(decimals).to.equal(DECIMALS);
    expect(totalSupply).to.equal(TOTAL_SUPPLY);
    expect(operatorBalance).to.equal(totalSupply);
  });

  it("Deploy Staking Pool(Not withdrawable)", async () => {
    const Pool = await ethers.getContractFactory('BnBTokenPool');
    notWithdrawablePool = await Pool.connect(operator).deploy(token.address, TOKEN_SYMBOL);
    await notWithdrawablePool.deployed();

    const stakeSymbol = await notWithdrawablePool.stakeSymbol();
    const intrestSymbol = await notWithdrawablePool.intrestSymbol();
    const isInitialize = await notWithdrawablePool.isInitialize();

    expect(stakeSymbol).to.equal('BNB');
    expect(intrestSymbol).to.equal(TOKEN_SYMBOL);
    expect(isInitialize).to.equal(false);
  });

  it("Initialize Pool", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    const startTime = latestBlock.timestamp + 5000;
    const endTime = startTime + 5000;
    console.log('startTimestamp:', startTime, 'endTimeStamp:', endTime);

    await token.connect(operator).approve(notWithdrawablePool.address, INTEREST_AMOUNT);
    await notWithdrawablePool.connect(operator).intialize(INTEREST_AMOUNT, startTime, endTime, 3);

    const operatorTokenBalance = await token.balanceOf(operator.address);
    const contractTokenBalance = await token.balanceOf(notWithdrawablePool.address);
    const intrestTotal = await notWithdrawablePool.intrestTotal();
    const stakingDays = await notWithdrawablePool.stakingDays();
    const isInitialize = await notWithdrawablePool.isInitialize();

    const opeatorRest = BigNumber.from(TOTAL_SUPPLY).sub(BigNumber.from(INTEREST_AMOUNT));

    expect(opeatorRest).to.equal(operatorTokenBalance);
    expect(contractTokenBalance).to.equal(intrestTotal);
    expect(contractTokenBalance).to.equal(INTEREST_AMOUNT);
    expect(stakingDays).to.equal(3);
    expect(isInitialize).to.equal(true);
  });

  it("before startTime staking", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await expect(notWithdrawablePool.connect(staker1).stake({ value: '100000000000000000' })).to.be.reverted;
  });

  it("First staking", async () => {
    for(let i = 0; i < 5000; i++) {
      await hre.network.provider.request({ method: "evm_mine", params: [] });
    }

    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await notWithdrawablePool.connect(staker1).stake({ value: '100000000000000000' });
    const stakingBalance = await notWithdrawablePool.balanceOf(staker1.address);

    expect(stakingBalance).to.equal('100000000000000000');
  });

  it("Second staking", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await notWithdrawablePool.connect(staker2).stake({ value: '100000000000000000' });
    const stakingBalance = await notWithdrawablePool.balanceOf(staker2.address);

    expect(stakingBalance).to.equal('100000000000000000');
  });

  it("Third staking", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await notWithdrawablePool.connect(staker3).stake({ value: '100000000000000000' });
    const stakingBalance = await notWithdrawablePool.balanceOf(staker3.address);

    expect(stakingBalance).to.equal('100000000000000000');
  });

  it("First Calculate", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    await notWithdrawablePool.connect(operator).calculate();

    const staker1Intrest = await notWithdrawablePool.intrestOf(staker1.address);
    const staker2Intrest = await notWithdrawablePool.intrestOf(staker2.address);
    const staker3Intrest = await notWithdrawablePool.intrestOf(staker3.address);
    const intrestRest = await notWithdrawablePool.intrestRest();

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const restIntrest = BigNumber.from(INTEREST_AMOUNT).sub(dailyInterest);

    const stakingTotal = await notWithdrawablePool.stakeTotal();
    const staker1Balance = await notWithdrawablePool.balanceOf(staker1.address);
    const staker2Balance = await notWithdrawablePool.balanceOf(staker2.address);
    const staker3Balance = await notWithdrawablePool.balanceOf(staker3.address);

    const staker1IntrestCalc = dailyInterest.div(stakingTotal).mul(staker1Balance);
    const staker2IntrestCalc = dailyInterest.div(stakingTotal).mul(staker2Balance);
    const staker3IntrestCalc = dailyInterest.div(stakingTotal).mul(staker3Balance);

    expect(restIntrest).to.equal(intrestRest);
    expect(staker1Intrest).to.equal(staker1IntrestCalc);
    expect(staker2Intrest).to.equal(staker2IntrestCalc);
    expect(staker3Intrest).to.equal(staker3IntrestCalc);
  });

  it("Must can not withdraw", async() => {
    const staker1Balance = await notWithdrawablePool.balanceOf(staker1.address);
    const staker1Intrest = await notWithdrawablePool.intrestOf(staker1.address);

    await expect(notWithdrawablePool.connect(staker1).principalWithdraw(staker1Balance.toString())).to.be.reverted;
    await expect(notWithdrawablePool.connect(staker1).interestWithdraw(staker1Intrest.toString())).to.be.reverted;
  });

  it("Add staking by sencond Staker", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await notWithdrawablePool.connect(staker2).stake({ value: '300000000000000000' });
    const stakingBalance = await notWithdrawablePool.balanceOf(staker2.address);
    const total = BigNumber.from('100000000000000000').add(BigNumber.from('300000000000000000'));

    expect(stakingBalance).to.equal(total);
  });

  it("Add staking by third Staker", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await notWithdrawablePool.connect(staker3).stake({ value: '500000000000000000' });
    const stakingBalance = await notWithdrawablePool.balanceOf(staker3.address);
    const total = BigNumber.from('100000000000000000').add(BigNumber.from('500000000000000000'));

    expect(stakingBalance).to.equal(total);
  });

  it("Second Calculate", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    await notWithdrawablePool.connect(operator).calculate();

    const staker1Intrest = await notWithdrawablePool.dayInterestOf(staker1.address, 2);
    const staker2Intrest = await notWithdrawablePool.dayInterestOf(staker2.address, 2);
    const staker3Intrest = await notWithdrawablePool.dayInterestOf(staker3.address, 2);
    const intrestRest = await notWithdrawablePool.intrestRest();

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const restIntrest = BigNumber.from(INTEREST_AMOUNT).sub(dailyInterest).sub(dailyInterest);

    const stakingTotal = await notWithdrawablePool.stakeTotal();
    const staker1Balance = await notWithdrawablePool.balanceOf(staker1.address);
    const staker2Balance = await notWithdrawablePool.balanceOf(staker2.address);
    const staker3Balance = await notWithdrawablePool.balanceOf(staker3.address);

    const staker1IntrestCalc = dailyInterest.div(stakingTotal).mul(staker1Balance);
    const staker2IntrestCalc = dailyInterest.div(stakingTotal).mul(staker2Balance);
    const staker3IntrestCalc = dailyInterest.div(stakingTotal).mul(staker3Balance);

    expect(restIntrest).to.equal(intrestRest);
    expect(staker1Intrest).to.equal(staker1IntrestCalc);
    expect(staker2Intrest).to.equal(staker2IntrestCalc);
    expect(staker3Intrest).to.equal(staker3IntrestCalc);
  });

  it("Add staking by first Staker", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await notWithdrawablePool.connect(staker1).stake({ value: '200000000000000000' });
    const stakingBalance = await notWithdrawablePool.balanceOf(staker1.address);
    const total = BigNumber.from('100000000000000000').add(BigNumber.from('200000000000000000'));

    expect(stakingBalance).to.equal(total);
  });

  it("Third Calculate", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    await notWithdrawablePool.connect(operator).calculate();

    const staker1Intrest = await notWithdrawablePool.dayInterestOf(staker1.address, 3);
    const staker2Intrest = await notWithdrawablePool.dayInterestOf(staker2.address, 3);
    const staker3Intrest = await notWithdrawablePool.dayInterestOf(staker3.address, 3);
    const intrestRest = await notWithdrawablePool.intrestRest();

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const restIntrest = BigNumber.from(INTEREST_AMOUNT).sub(dailyInterest).sub(dailyInterest).sub(dailyInterest);

    const stakingTotal = await notWithdrawablePool.stakeTotal();
    const staker1Balance = await notWithdrawablePool.balanceOf(staker1.address);
    const staker2Balance = await notWithdrawablePool.balanceOf(staker2.address);
    const staker3Balance = await notWithdrawablePool.balanceOf(staker3.address);

    const staker1IntrestCalc = dailyInterest.div(stakingTotal).mul(staker1Balance);
    const staker2IntrestCalc = dailyInterest.div(stakingTotal).mul(staker2Balance);
    const staker3IntrestCalc = dailyInterest.div(stakingTotal).mul(staker3Balance);

    expect(restIntrest).to.equal(intrestRest);
    expect(staker1Intrest).to.equal(staker1IntrestCalc);
    expect(staker2Intrest).to.equal(staker2IntrestCalc);
    expect(staker3Intrest).to.equal(staker3IntrestCalc);
  });

  it("Check First Staker Calculate", async () => {
    const day1Intrest = await notWithdrawablePool.dayInterestOf(staker1.address, 1);
    const day2Intrest = await notWithdrawablePool.dayInterestOf(staker1.address, 2);
    const day3Intrest = await notWithdrawablePool.dayInterestOf(staker1.address, 3);

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const day1Balance = BigNumber.from('100000000000000000');
    const day3Balnace = day1Balance.add(BigNumber.from('200000000000000000'));
    const day1TotalBalance = BigNumber.from('100000000000000000').mul(3);
    const day2TotalBalance = day1TotalBalance.add(BigNumber.from('300000000000000000')).add(BigNumber.from('500000000000000000'));
    const day3TotalBalance = day2TotalBalance.add(BigNumber.from('200000000000000000'));

    const day1Calc = dailyInterest.div(day1TotalBalance).mul(day1Balance);
    const day2Calc = dailyInterest.div(day2TotalBalance).mul(day1Balance);
    const day3Calc = dailyInterest.div(day3TotalBalance).mul(day3Balnace);

    const totalIntrest = await notWithdrawablePool.intrestOf(staker1.address);
    const totalManualCalc = day1Calc.add(day2Calc).add(day3Calc);
    const totalCalc = day1Intrest.add(day2Intrest).add(day3Intrest);

    expect(day1Intrest).to.equal(day1Calc);
    expect(day2Intrest).to.equal(day2Calc);
    expect(day3Intrest).to.equal(day3Calc);
    expect(totalIntrest).to.equal(totalManualCalc);
    expect(totalManualCalc).to.equal(totalCalc);
    expect(totalCalc).to.equal(totalIntrest);
  });

  it("Check Second Staker Calculate", async () => {
    const day1Intrest = await notWithdrawablePool.dayInterestOf(staker2.address, 1);
    const day2Intrest = await notWithdrawablePool.dayInterestOf(staker2.address, 2);
    const day3Intrest = await notWithdrawablePool.dayInterestOf(staker2.address, 3);

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const day1Balance = BigNumber.from('100000000000000000');
    const day2Balnace = day1Balance.add(BigNumber.from('300000000000000000'));
    const day1TotalBalance = BigNumber.from('100000000000000000').mul(3);
    const day2TotalBalance = day1TotalBalance.add(BigNumber.from('300000000000000000')).add(BigNumber.from('500000000000000000'));
    const day3TotalBalance = day2TotalBalance.add(BigNumber.from('200000000000000000'));

    const day1Calc = dailyInterest.div(day1TotalBalance).mul(day1Balance);
    const day2Calc = dailyInterest.div(day2TotalBalance).mul(day2Balnace);
    const day3Calc = dailyInterest.div(day3TotalBalance).mul(day2Balnace);

    const totalIntrest = await notWithdrawablePool.intrestOf(staker2.address);
    const totalManualCalc = day1Calc.add(day2Calc).add(day3Calc);
    const totalCalc = day1Intrest.add(day2Intrest).add(day3Intrest);

    expect(day1Intrest).to.equal(day1Calc);
    expect(day2Intrest).to.equal(day2Calc);
    expect(day3Intrest).to.equal(day3Calc);
    expect(totalIntrest).to.equal(totalManualCalc);
    expect(totalManualCalc).to.equal(totalCalc);
    expect(totalCalc).to.equal(totalIntrest);
  });

  it("Check Third Staker Calculate", async () => {
    const day1Intrest = await notWithdrawablePool.dayInterestOf(staker3.address, 1);
    const day2Intrest = await notWithdrawablePool.dayInterestOf(staker3.address, 2);
    const day3Intrest = await notWithdrawablePool.dayInterestOf(staker3.address, 3);

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const day1Balance = BigNumber.from('100000000000000000');
    const day2Balnace = day1Balance.add(BigNumber.from('500000000000000000'));
    const day1TotalBalance = BigNumber.from('100000000000000000').mul(3);
    const day2TotalBalance = day1TotalBalance.add(BigNumber.from('300000000000000000')).add(BigNumber.from('500000000000000000'));
    const day3TotalBalance = day2TotalBalance.add(BigNumber.from('200000000000000000'));

    const day1Calc = dailyInterest.div(day1TotalBalance).mul(day1Balance);
    const day2Calc = dailyInterest.div(day2TotalBalance).mul(day2Balnace);
    const day3Calc = dailyInterest.div(day3TotalBalance).mul(day2Balnace);

    const totalIntrest = await notWithdrawablePool.intrestOf(staker3.address);
    const totalManualCalc = day1Calc.add(day2Calc).add(day3Calc);
    const totalCalc = day1Intrest.add(day2Intrest).add(day3Intrest);

    expect(day1Intrest).to.equal(day1Calc);
    expect(day2Intrest).to.equal(day2Calc);
    expect(day3Intrest).to.equal(day3Calc);
    expect(totalIntrest).to.equal(totalManualCalc);
    expect(totalManualCalc).to.equal(totalCalc);
    expect(totalCalc).to.equal(totalIntrest);
  });

  it("Must can not calculate", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    await expect(notWithdrawablePool.connect(operator).calculate()).to.be.reverted;
  });

  it("First Staker Withdraw", async () => {
    for(let i = 0; i < 5000; i++) {
      await hre.network.provider.request({ method: "evm_mine", params: [] });
    }

    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    const staker1Balance = await notWithdrawablePool.balanceOf(staker1.address);
    const staker1Intrest = await notWithdrawablePool.intrestOf(staker1.address);

    await notWithdrawablePool.connect(staker1).principalWithdraw(staker1Balance.toString());
    await notWithdrawablePool.connect(staker1).interestWithdraw(staker1Intrest.toString());

    const afterStakedBalance = await notWithdrawablePool.balanceOf(staker1.address);
    const afterTokenBalance = await token.balanceOf(staker1.address);
    const afterIntrestBalance = await notWithdrawablePool.intrestOf(staker1.address);

    expect(staker1Intrest).to.equal(afterTokenBalance);
    expect(afterIntrestBalance).to.equal(0);
    expect(afterStakedBalance).to.equal(0);
  });

  it("Second Staker Withdraw", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    const staker2Balance = await notWithdrawablePool.balanceOf(staker2.address);
    const staker2Intrest = await notWithdrawablePool.intrestOf(staker2.address);

    await notWithdrawablePool.connect(staker2).principalWithdraw(staker2Balance.toString());
    await notWithdrawablePool.connect(staker2).interestWithdraw(staker2Intrest.toString());

    const afterStakedBalance = await notWithdrawablePool.balanceOf(staker2.address);
    const afterTokenBalance = await token.balanceOf(staker2.address);
    const afterIntrestBalance = await notWithdrawablePool.intrestOf(staker2.address);

    expect(staker2Intrest).to.equal(afterTokenBalance);
    expect(afterIntrestBalance).to.equal(0);
    expect(afterStakedBalance).to.equal(0);
  });

  it("Third Staker Withdraw", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    const staker3Balance = await notWithdrawablePool.balanceOf(staker3.address);
    const staker3Intrest = await notWithdrawablePool.intrestOf(staker3.address);

    await notWithdrawablePool.connect(staker3).principalWithdraw(staker3Balance.toString());
    await notWithdrawablePool.connect(staker3).interestWithdraw(staker3Intrest.toString());

    const afterStakedBalance = await notWithdrawablePool.balanceOf(staker3.address);
    const afterTokenBalance = await token.balanceOf(staker3.address);
    const afterIntrestBalance = await notWithdrawablePool.intrestOf(staker3.address);

    expect(staker3Intrest).to.equal(afterTokenBalance);
    expect(afterIntrestBalance).to.equal(0);
    expect(afterStakedBalance).to.equal(0);
  });
});


