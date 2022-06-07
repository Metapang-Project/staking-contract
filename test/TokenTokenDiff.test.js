const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("TokenToken(Different Token) Test", () => {
  const accounts = [];
  let operator;
  let staker1;
  let staker2;
  let staker3;
  let token;
  let interest;
  let notWithdrawablePool;
  const TOKEN_NAME = 'TEST TOKEN4';
  const TOKEN_SYMBOL = 'TEST4';
  const INTEREST_NAME = 'TEST INTEREST';
  const INTEREST_SYMBOL = 'INT';
  const DECIMALS = 18;
  const TOTAL_SUPPLY = '10000000000000000000000000';
  const INTEREST_AMOUNT = '3000000000000000000000000';
  const DIST_AMOUNT = '100000000000000000000';

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

    interest = await Token.connect(operator).deploy(TOTAL_SUPPLY, DECIMALS, INTEREST_SYMBOL, INTEREST_NAME);
    await interest.deployed();
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

  it("Interest Token Factory", async () => {
    const symbol = await interest.symbol();
    const name = await interest.name();
    const totalSupply = await interest.totalSupply();
    const decimals = await interest.decimals();
    const operatorBalance = await interest.balanceOf(operator.address);

    expect(symbol).to.equal(INTEREST_SYMBOL);
    expect(name).to.equal(INTEREST_NAME);
    expect(decimals).to.equal(DECIMALS);
    expect(totalSupply).to.equal(TOTAL_SUPPLY);
    expect(operatorBalance).to.equal(totalSupply);
  });

  it("Token Airdrop", async () => {
    await token.connect(operator).transfer(staker1.address, DIST_AMOUNT);
    await token.connect(operator).transfer(staker2.address, DIST_AMOUNT);
    await token.connect(operator).transfer(staker3.address, DIST_AMOUNT);

    const staker1Balance = await token.balanceOf(staker1.address);
    const staker2Balance = await token.balanceOf(staker2.address);
    const staker3Balance = await token.balanceOf(staker3.address);

    expect(staker1Balance).to.equal(DIST_AMOUNT);
    expect(staker2Balance).to.equal(DIST_AMOUNT);
    expect(staker3Balance).to.equal(DIST_AMOUNT);
  });

  it("Deploy Staking Pool(Not withdrawable)", async () => {
    const Pool = await ethers.getContractFactory('TokenTokenPool');
    notWithdrawablePool = await Pool.connect(operator).deploy(token.address, TOKEN_SYMBOL, interest.address, INTEREST_SYMBOL);
    await notWithdrawablePool.deployed();

    const stakeSymbol = await notWithdrawablePool.stakeSymbol();
    const interestSymbol = await notWithdrawablePool.interestSymbol();
    const isInitialize = await notWithdrawablePool.isInitialize();

    expect(stakeSymbol).to.equal(TOKEN_SYMBOL);
    expect(interestSymbol).to.equal(INTEREST_SYMBOL);
    expect(isInitialize).to.equal(false);
  });

  it("Initialize Pool", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    const startTime = latestBlock.timestamp + 5000;
    const endTime = startTime + 5000;
    console.log('startTimestamp:', startTime, 'endTimeStamp:', endTime);

    await interest.connect(operator).approve(notWithdrawablePool.address, INTEREST_AMOUNT);
    await notWithdrawablePool.connect(operator).intialize(INTEREST_AMOUNT, startTime, endTime, 3);

    const operatorTokenBalance = await interest.balanceOf(operator.address);
    const contractTokenBalance = await interest.balanceOf(notWithdrawablePool.address);
    const interestTotal = await notWithdrawablePool.interestTotal();
    const stakingDays = await notWithdrawablePool.stakingDays();
    const isInitialize = await notWithdrawablePool.isInitialize();

    const opeatorRest = BigNumber.from(TOTAL_SUPPLY).sub(BigNumber.from(INTEREST_AMOUNT));

    expect(opeatorRest).to.equal(operatorTokenBalance);
    expect(contractTokenBalance).to.equal(interestTotal);
    expect(contractTokenBalance).to.equal(INTEREST_AMOUNT);
    expect(stakingDays).to.equal(3);
    expect(isInitialize).to.equal(true);
  });

  it("before startTime staking", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await token.connect(staker1).approve(notWithdrawablePool.address, '10000000000000000000');
    await expect(notWithdrawablePool.connect(staker1).stake('10000000000000000000')).to.be.reverted;
  });

  it("First staking", async () => {
    for(let i = 0; i < 5000; i++) {
      await hre.network.provider.request({ method: "evm_mine", params: [] });
    }

    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await token.connect(staker1).approve(notWithdrawablePool.address, '10000000000000000000');
    await notWithdrawablePool.connect(staker1).stake('10000000000000000000');
    const stakingBalance = await notWithdrawablePool.balanceOf(staker1.address);

    expect(stakingBalance).to.equal('10000000000000000000');
  });

  it("Second staking", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await token.connect(staker2).approve(notWithdrawablePool.address, '10000000000000000000');
    await notWithdrawablePool.connect(staker2).stake('10000000000000000000');
    const stakingBalance = await notWithdrawablePool.balanceOf(staker2.address);

    expect(stakingBalance).to.equal('10000000000000000000');
  });

  it("Third staking", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await token.connect(staker3).approve(notWithdrawablePool.address, '10000000000000000000');
    await notWithdrawablePool.connect(staker3).stake('10000000000000000000');
    const stakingBalance = await notWithdrawablePool.balanceOf(staker3.address);

    expect(stakingBalance).to.equal('10000000000000000000');
  });

  it("First Calculate", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    await notWithdrawablePool.connect(operator).calculate();

    const staker1interest = await notWithdrawablePool.interestOf(staker1.address);
    const staker2interest = await notWithdrawablePool.interestOf(staker2.address);
    const staker3interest = await notWithdrawablePool.interestOf(staker3.address);
    const interestRest = await notWithdrawablePool.interestRest();

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const restinterest = BigNumber.from(INTEREST_AMOUNT).sub(dailyInterest);

    const stakingTotal = await notWithdrawablePool.stakeTotal();
    const staker1Balance = await notWithdrawablePool.balanceOf(staker1.address);
    const staker2Balance = await notWithdrawablePool.balanceOf(staker2.address);
    const staker3Balance = await notWithdrawablePool.balanceOf(staker3.address);

    const staker1interestCalc = dailyInterest.div(stakingTotal).mul(staker1Balance);
    const staker2interestCalc = dailyInterest.div(stakingTotal).mul(staker2Balance);
    const staker3interestCalc = dailyInterest.div(stakingTotal).mul(staker3Balance);

    expect(restinterest).to.equal(interestRest);
    expect(staker1interest).to.equal(staker1interestCalc);
    expect(staker2interest).to.equal(staker2interestCalc);
    expect(staker3interest).to.equal(staker3interestCalc);
  });

  it("Must can not withdraw", async() => {
    const staker1Balance = await notWithdrawablePool.balanceOf(staker1.address);
    const staker1interest = await notWithdrawablePool.interestOf(staker1.address);
    
    await expect(notWithdrawablePool.connect(staker1).principalWithdraw(staker1Balance.toString())).to.be.reverted;
    await expect(notWithdrawablePool.connect(staker1).interestWithdraw(staker1interest.toString())).to.be.reverted;
  });

  it("Add staking by sencond Staker", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await token.connect(staker2).approve(notWithdrawablePool.address, '30000000000000000000');
    await notWithdrawablePool.connect(staker2).stake('30000000000000000000');
    const stakingBalance = await notWithdrawablePool.balanceOf(staker2.address);
    const total = BigNumber.from('10000000000000000000').add(BigNumber.from('30000000000000000000'));

    expect(stakingBalance).to.equal(total);
  });

  it("Add staking by third Staker", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await token.connect(staker3).approve(notWithdrawablePool.address, '50000000000000000000');
    await notWithdrawablePool.connect(staker3).stake('50000000000000000000');
    const stakingBalance = await notWithdrawablePool.balanceOf(staker3.address);
    const total = BigNumber.from('10000000000000000000').add(BigNumber.from('50000000000000000000'));

    expect(stakingBalance).to.equal(total);
  });

  it("Second Calculate", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    await notWithdrawablePool.connect(operator).calculate();

    const staker1interest = await notWithdrawablePool.dayInterestOf(staker1.address, 2);
    const staker2interest = await notWithdrawablePool.dayInterestOf(staker2.address, 2);
    const staker3interest = await notWithdrawablePool.dayInterestOf(staker3.address, 2);
    const interestRest = await notWithdrawablePool.interestRest();

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const restinterest = BigNumber.from(INTEREST_AMOUNT).sub(dailyInterest).sub(dailyInterest);

    const stakingTotal = await notWithdrawablePool.stakeTotal();
    const staker1Balance = await notWithdrawablePool.balanceOf(staker1.address);
    const staker2Balance = await notWithdrawablePool.balanceOf(staker2.address);
    const staker3Balance = await notWithdrawablePool.balanceOf(staker3.address);

    const staker1interestCalc = dailyInterest.div(stakingTotal).mul(staker1Balance);
    const staker2interestCalc = dailyInterest.div(stakingTotal).mul(staker2Balance);
    const staker3interestCalc = dailyInterest.div(stakingTotal).mul(staker3Balance);

    expect(restinterest).to.equal(interestRest);
    expect(staker1interest).to.equal(staker1interestCalc);
    expect(staker2interest).to.equal(staker2interestCalc);
    expect(staker3interest).to.equal(staker3interestCalc);
  });

  it("Add staking by first Staker", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);
    
    await token.connect(staker1).approve(notWithdrawablePool.address, '20000000000000000000');
    await notWithdrawablePool.connect(staker1).stake('20000000000000000000');
    const stakingBalance = await notWithdrawablePool.balanceOf(staker1.address);
    const total = BigNumber.from('10000000000000000000').add(BigNumber.from('20000000000000000000'));

    expect(stakingBalance).to.equal(total);
  });

  it("Third Calculate", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    await notWithdrawablePool.connect(operator).calculate();

    const staker1interest = await notWithdrawablePool.dayInterestOf(staker1.address, 3);
    const staker2interest = await notWithdrawablePool.dayInterestOf(staker2.address, 3);
    const staker3interest = await notWithdrawablePool.dayInterestOf(staker3.address, 3);
    const interestRest = await notWithdrawablePool.interestRest();

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const restinterest = BigNumber.from(INTEREST_AMOUNT).sub(dailyInterest).sub(dailyInterest).sub(dailyInterest);

    const stakingTotal = await notWithdrawablePool.stakeTotal();
    const staker1Balance = await notWithdrawablePool.balanceOf(staker1.address);
    const staker2Balance = await notWithdrawablePool.balanceOf(staker2.address);
    const staker3Balance = await notWithdrawablePool.balanceOf(staker3.address);

    const staker1interestCalc = dailyInterest.div(stakingTotal).mul(staker1Balance);
    const staker2interestCalc = dailyInterest.div(stakingTotal).mul(staker2Balance);
    const staker3interestCalc = dailyInterest.div(stakingTotal).mul(staker3Balance);

    expect(restinterest).to.equal(interestRest);
    expect(staker1interest).to.equal(staker1interestCalc);
    expect(staker2interest).to.equal(staker2interestCalc);
    expect(staker3interest).to.equal(staker3interestCalc);
  });

  it("Check First Staker Calculate", async () => {
    const day1interest = await notWithdrawablePool.dayInterestOf(staker1.address, 1);
    const day2interest = await notWithdrawablePool.dayInterestOf(staker1.address, 2);
    const day3interest = await notWithdrawablePool.dayInterestOf(staker1.address, 3);

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const day1Balance = BigNumber.from('10000000000000000000');
    const day3Balnace = day1Balance.add(BigNumber.from('20000000000000000000'));
    const day1TotalBalance = BigNumber.from('10000000000000000000').mul(3);
    const day2TotalBalance = day1TotalBalance.add(BigNumber.from('30000000000000000000')).add(BigNumber.from('50000000000000000000'));
    const day3TotalBalance = day2TotalBalance.add(BigNumber.from('20000000000000000000'));

    const day1Calc = dailyInterest.div(day1TotalBalance).mul(day1Balance);
    const day2Calc = dailyInterest.div(day2TotalBalance).mul(day1Balance);
    const day3Calc = dailyInterest.div(day3TotalBalance).mul(day3Balnace);

    const totalinterest = await notWithdrawablePool.interestOf(staker1.address);
    const totalManualCalc = day1Calc.add(day2Calc).add(day3Calc);
    const totalCalc = day1interest.add(day2interest).add(day3interest);

    expect(day1interest).to.equal(day1Calc);
    expect(day2interest).to.equal(day2Calc);
    expect(day3interest).to.equal(day3Calc);
    expect(totalinterest).to.equal(totalManualCalc);
    expect(totalManualCalc).to.equal(totalCalc);
    expect(totalCalc).to.equal(totalinterest);
  });

  it("Check Second Staker Calculate", async () => {
    const day1interest = await notWithdrawablePool.dayInterestOf(staker2.address, 1);
    const day2interest = await notWithdrawablePool.dayInterestOf(staker2.address, 2);
    const day3interest = await notWithdrawablePool.dayInterestOf(staker2.address, 3);

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const day1Balance = BigNumber.from('10000000000000000000');
    const day2Balnace = day1Balance.add(BigNumber.from('30000000000000000000'));
    const day1TotalBalance = BigNumber.from('10000000000000000000').mul(3);
    const day2TotalBalance = day1TotalBalance.add(BigNumber.from('30000000000000000000')).add(BigNumber.from('50000000000000000000'));
    const day3TotalBalance = day2TotalBalance.add(BigNumber.from('20000000000000000000'));

    const day1Calc = dailyInterest.div(day1TotalBalance).mul(day1Balance);
    const day2Calc = dailyInterest.div(day2TotalBalance).mul(day2Balnace);
    const day3Calc = dailyInterest.div(day3TotalBalance).mul(day2Balnace);

    const totalinterest = await notWithdrawablePool.interestOf(staker2.address);
    const totalManualCalc = day1Calc.add(day2Calc).add(day3Calc);
    const totalCalc = day1interest.add(day2interest).add(day3interest);

    expect(day1interest).to.equal(day1Calc);
    expect(day2interest).to.equal(day2Calc);
    expect(day3interest).to.equal(day3Calc);
    expect(totalinterest).to.equal(totalManualCalc);
    expect(totalManualCalc).to.equal(totalCalc);
    expect(totalCalc).to.equal(totalinterest);
  });

  it("Check Third Staker Calculate", async () => {
    const day1interest = await notWithdrawablePool.dayInterestOf(staker3.address, 1);
    const day2interest = await notWithdrawablePool.dayInterestOf(staker3.address, 2);
    const day3interest = await notWithdrawablePool.dayInterestOf(staker3.address, 3);

    const dailyInterest = BigNumber.from(INTEREST_AMOUNT).div(3);
    const day1Balance = BigNumber.from('10000000000000000000');
    const day2Balnace = day1Balance.add(BigNumber.from('50000000000000000000'));
    const day1TotalBalance = BigNumber.from('10000000000000000000').mul(3);
    const day2TotalBalance = day1TotalBalance.add(BigNumber.from('30000000000000000000')).add(BigNumber.from('50000000000000000000'));
    const day3TotalBalance = day2TotalBalance.add(BigNumber.from('20000000000000000000'));

    const day1Calc = dailyInterest.div(day1TotalBalance).mul(day1Balance);
    const day2Calc = dailyInterest.div(day2TotalBalance).mul(day2Balnace);
    const day3Calc = dailyInterest.div(day3TotalBalance).mul(day2Balnace);

    const totalinterest = await notWithdrawablePool.interestOf(staker3.address);
    const totalManualCalc = day1Calc.add(day2Calc).add(day3Calc);
    const totalCalc = day1interest.add(day2interest).add(day3interest);

    expect(day1interest).to.equal(day1Calc);
    expect(day2interest).to.equal(day2Calc);
    expect(day3interest).to.equal(day3Calc);
    expect(totalinterest).to.equal(totalManualCalc);
    expect(totalManualCalc).to.equal(totalCalc);
    expect(totalCalc).to.equal(totalinterest);
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
    const staker1interest = await notWithdrawablePool.interestOf(staker1.address);
    const beforeBalance = await token.balanceOf(staker1.address);

    const calTotal = beforeBalance.add(staker1Balance);

    await notWithdrawablePool.connect(staker1).principalWithdraw(staker1Balance.toString());
    await notWithdrawablePool.connect(staker1).interestWithdraw(staker1interest.toString());

    const afterIntrest = await interest.balanceOf(staker1.address);

    const afterStakedBalance = await notWithdrawablePool.balanceOf(staker1.address);
    const afterTokenBalance = await token.balanceOf(staker1.address);
    const afterinterestBalance = await notWithdrawablePool.interestOf(staker1.address);

    expect(calTotal).to.equal(afterTokenBalance);
    expect(staker1interest).to.equal(afterIntrest);
    expect(afterinterestBalance).to.equal(0);
    expect(afterStakedBalance).to.equal(0);
  });

  it("Second Staker Withdraw", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    const staker2Balance = await notWithdrawablePool.balanceOf(staker2.address);
    const staker2interest = await notWithdrawablePool.interestOf(staker2.address);
    const beforeBalance = await token.balanceOf(staker2.address);

    const calTotal = beforeBalance.add(staker2Balance);

    await notWithdrawablePool.connect(staker2).principalWithdraw(staker2Balance.toString());
    await notWithdrawablePool.connect(staker2).interestWithdraw(staker2interest.toString());

    const afterIntrest = await interest.balanceOf(staker2.address);

    const afterStakedBalance = await notWithdrawablePool.balanceOf(staker2.address);
    const afterTokenBalance = await token.balanceOf(staker2.address);
    const afterinterestBalance = await notWithdrawablePool.interestOf(staker2.address);

    expect(calTotal).to.equal(afterTokenBalance);
    expect(staker2interest).to.equal(afterIntrest);
    expect(afterinterestBalance).to.equal(0);
    expect(afterStakedBalance).to.equal(0);
  });

  it("Third Staker Withdraw", async () => {
    const latestBlock = await hre.ethers.provider.getBlock("latest");
    console.log('currentTimestamp:', latestBlock.timestamp);

    const staker3Balance = await notWithdrawablePool.balanceOf(staker3.address);
    const staker3interest = await notWithdrawablePool.interestOf(staker3.address);
    const beforeBalance = await token.balanceOf(staker3.address);

    const calTotal = beforeBalance.add(staker3Balance);

    await notWithdrawablePool.connect(staker3).principalWithdraw(staker3Balance.toString());
    await notWithdrawablePool.connect(staker3).interestWithdraw(staker3interest.toString());

    const afterIntrest = await interest.balanceOf(staker3.address);

    const afterStakedBalance = await notWithdrawablePool.balanceOf(staker3.address);
    const afterTokenBalance = await token.balanceOf(staker3.address);
    const afterinterestBalance = await notWithdrawablePool.interestOf(staker3.address);

    expect(calTotal).to.equal(afterTokenBalance);
    expect(staker3interest).to.equal(afterIntrest);
    expect(afterinterestBalance).to.equal(0);
    expect(afterStakedBalance).to.equal(0);
  });
});