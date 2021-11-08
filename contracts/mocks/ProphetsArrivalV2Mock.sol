import '../ProphetsArrival.sol';

contract ProphetsArrivalV2Mock is ProphetsArrival {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(Prophets _prophets)
        ProphetsArrival(_prophets, IERC20Upgradeable(0x0000000000000000000000000000000000000001), 9000000000)
    {}
}
