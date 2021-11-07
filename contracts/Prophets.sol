// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import '@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol';

import 'hardhat/console.sol';

// TODO: Clawback BABL from not minted great prophets

contract Prophets is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /* ============ Constants ============ */

    uint256 public constant PROPHETS = 8000;
    uint256 public constant GREAT_PROPHETS = 1000;
    uint256 public constant FUTURE_PROPHETS = 1000;

    uint256 public constant MAX_PROPHETS = PROPHETS + GREAT_PROPHETS + FUTURE_PROPHETS;

    uint256 public constant BABL_SUPPLY = 40_000e18;
    uint256 public constant PROPHET_BABL = BABL_SUPPLY / PROPHETS;
    uint64  public constant PROPHET_LP_BONUS = 1e2; // 1%

    /* ============ Immutables ============ */

    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    IERC20Upgradeable public immutable bablToken;

    /* ============ Structs ============ */

    struct ProphetAttributes {
        uint256 bablLoot;
        uint64 creatorMultiplier;
        uint64 lpMultiplier;
        uint64 voterMultiplier;
        uint64 strategistMultiplier;
    }

    /* ============ Private State Variables ============ */

    CountersUpgradeable.Counter private prophetsMinted;
    mapping(uint256 => ProphetAttributes) private prophetsAttributes;

    /* ============ Public State Variables ============ */

    string public baseTokenURI;
    mapping(uint256 => bool) public prophetsBABLClaimed;
    address public minter;

    /* ============ Modifiers ============ */

    function _onlyMinter() view internal {
        require(msg.sender == minter, 'Caller is not the minter');
    }

    function _onlyOwner() view internal {
        require(owner() == msg.sender, "Caller is not the owner");
    }
    /* ============ Events ============ */

    event MintProphet(uint256 indexed id);

    /* ============ Constructor ============ */

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(IERC20Upgradeable _bablToken) initializer {
        bablToken = _bablToken;
    }

    function initialize(string calldata _uri) initializer public {
        __ERC721_init('Babylon Prophets', 'BPH');
        __ERC721Enumerable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __ERC721Burnable_init();

        baseTokenURI = _uri;
    }

    /* ============ External Write Functions ============ */

    function mintProphet(address _to) external {
        _onlyMinter();
        require(prophetsMinted.current() < PROPHETS, 'Not a prophet');

        prophetsMinted.increment();
        _mintProphet(_to, prophetsMinted.current());
    }

    function mintGreatProphet(address _to, uint256 _id) external {
        _onlyMinter();
        require(_id > PROPHETS && _id <= PROPHETS + GREAT_PROPHETS, 'Not a great prophet');

        _mintProphet(_to, _id);
    }

    function setProphetsAttributes(
        uint256[] calldata _ids,
        uint256[] calldata _bablLoots,
        uint64[] calldata _creatorBonuses,
        uint64[] calldata _lpBonuses,
        uint64[] calldata _voterMultipliers,
        uint64[] calldata _strategistMultipliers
    ) external {
        _onlyOwner();
        for (uint256 i = 0; i < _ids.length; i++) {
            require(_ids[i] > PROPHETS, 'Not a great prophet');
            _setProphetAttributes(
                _ids[i],
                _bablLoots[i],
                _creatorBonuses[i],
                _lpBonuses[i],
                _voterMultipliers[i],
                _strategistMultipliers[i]
            );
        }
    }

    function setBaseURI(string memory baseURI) external {
        _onlyOwner();
        baseTokenURI = baseURI;
    }

    function setMinter(address _minter) external {
        _onlyOwner();
        require(address(_minter) != address(0), 'Specify minter');
        minter = _minter;
    }

    function claimLoot(uint256 _id) external nonReentrant {
        require(balanceOf(msg.sender) > 0, 'Caller does not own a prophet');
        require(ownerOf(_id) == msg.sender, 'Caller must own the prophet');
        require(!prophetsBABLClaimed[_id] && _id < (PROPHETS + GREAT_PROPHETS), 'Loot already claimed');

        uint256 lootAmount = getProphetAttributes(_id).bablLoot;
        require(lootAmount != 0, 'Loot can not be empty');

        prophetsBABLClaimed[_id] = true;

        bablToken.safeTransfer(msg.sender, lootAmount);
    }

    /* ============ External View Functions ============ */

    function getProphetAttributes(uint256 _id) public view returns (ProphetAttributes memory) {
        if(_id < PROPHETS) {
          return ProphetAttributes({
            bablLoot: PROPHET_BABL, creatorMultiplier: 0, lpMultiplier: PROPHET_LP_BONUS, voterMultiplier:0,
            strategistMultiplier:0 });
        }

        return prophetsAttributes[_id];
    }

    function maxSupply() external pure returns (uint256) {
        return MAX_PROPHETS;
    }

    function prophetsSupply() external view returns (uint256) {
        return prophetsMinted.current();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /* ============ Internal Write Functions ============ */

    function _mintProphet(address _to, uint256 _id) private {
        require(_to != address(0), 'Recipient is 0x0');
        _mint(_to, _id);

        emit MintProphet(_id);
    }

    function _setProphetAttributes(
        uint256 _id,
        uint256 _bablLoot,
        uint64 _creatorMultiplier,
        uint64 _lpMultiplier,
        uint64 _voterMultiplier,
        uint64 _strategistMultiplier
    ) private {
        ProphetAttributes storage attrs = prophetsAttributes[_id];

        attrs.bablLoot = _bablLoot;

        attrs.creatorMultiplier = _creatorMultiplier;
        attrs.lpMultiplier = _lpMultiplier;
        attrs.voterMultiplier = _voterMultiplier;
        attrs.strategistMultiplier = _strategistMultiplier;
    }

    function _authorizeUpgrade(address newImplementation) internal override {
        _onlyOwner();
    }

    /* ============ Internal View Functions ============ */

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}

contract ProphetsV1 is Prophets {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() Prophets(IERC20Upgradeable(0xF4Dc48D260C93ad6a96c5Ce563E70CA578987c74)) {}
}
