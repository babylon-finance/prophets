import '../Prophets.sol';

contract ProphetsV2Mock is Prophets {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() Prophets(IERC20Upgradeable(0x0000000000000000000000000000000000000000)) {}
}
