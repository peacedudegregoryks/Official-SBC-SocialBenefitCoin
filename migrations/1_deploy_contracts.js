var SBCoin = artifacts.require('./SBCoin.sol');
var SBCDistribution = artifacts.require('./SBCDistribution.sol');

module.exports = async (deployer, network) => {
  let _now = Date.now();
  let _fromNow = 129600 * 1000; // Start distribution in 1 hour
  let _startTime = (_now + _fromNow) / 1000;
  await deployer.deploy(SBCDistribution, _startTime);
  console.log(`
    ---------------------------------------------------------------
    ----- SOCIAL BENEFIT COIN (SBC) SUCCESSFULLY DEPLOYED ---------
    ---------------------------------------------------------------
    - Contract address: ${SBCDistribution.address}
    - Distribution starts in: ${_fromNow/1000/60} minutes
    - Local Time: ${new Date(_now + _fromNow)}
    ---------------------------------------------------------------
  `);
};
