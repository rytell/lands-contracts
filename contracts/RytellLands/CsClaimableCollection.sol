// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBaseCollection {
  function ownerOf(uint256 tokenId) external view returns (address);
}

contract CsClaimableCollection is ERC721Enumerable, Ownable {
  using Strings for uint256;
  using Counters for Counters.Counter;

  Counters.Counter private supply;

  string public uriPrefix = "";
  string public uriSuffix = ".json";

  uint256 public maxSupply = 10000;

  bool public paused = true;
  string private baseURI;
  address public baseCollection;

  mapping(uint256 => uint256) public sealLand;

  constructor(string memory _baseUri, address _baseCollection)
    ERC721("The lands of the crypto seals of Rytell", "TLOCSR")
  {
    baseURI = _baseUri; // ipfs://id/
    baseCollection = _baseCollection; // rytell seals collection address
  }

  modifier mintCompliance(uint256 _sealNumber) {
    // You don't own this seal
    require(
      IBaseCollection(baseCollection).ownerOf(_sealNumber) == _msgSender(),
      "You don't own this seal"
    );
    // This seal has already claimed a land
    require(
      sealLand[_sealNumber] == uint256(0),
      "This seal has already claimed a land"
    );
    _;
  }

  function totalSupply() public view override returns (uint256) {
    return supply.current();
  }

  function mint(uint256 _sealNumber) public mintCompliance(_sealNumber) {
    supply.increment();
    _safeMint(_msgSender(), _sealNumber);
    sealLand[_sealNumber] = _sealNumber;
  }

  /// @dev This function collects all the token IDs of a wallet.
  /// @param owner_ This is the address for which the balance of token IDs is returned.
  /// @return an array of token IDs.
  function walletOfOwner(address owner_)
    external
    view
    returns (uint256[] memory)
  {
    uint256 ownerTokenCount = balanceOf(owner_);
    uint256[] memory tokenIDs = new uint256[](ownerTokenCount);
    for (uint256 i = 0; i < ownerTokenCount; i++) {
      tokenIDs[i] = tokenOfOwnerByIndex(owner_, i);
    }
    return tokenIDs;
  }

  function tokenURI(uint256 _tokenId)
    public
    view
    virtual
    override
    returns (string memory)
  {
    require(
      _exists(_tokenId),
      "ERC721Metadata: URI query for nonexistent token"
    );

    string memory currentBaseURI = _baseURI();
    return
      bytes(currentBaseURI).length > 0
        ? string(
          abi.encodePacked(currentBaseURI, _tokenId.toString(), uriSuffix)
        )
        : "";
  }

  function setBaseCollectionAddress(address _newAddress) public onlyOwner {
    baseCollection = _newAddress;
  }

  function setUriPrefix(string memory _uriPrefix) public onlyOwner {
    uriPrefix = _uriPrefix;
  }

  function setUriSuffix(string memory _uriSuffix) public onlyOwner {
    uriSuffix = _uriSuffix;
  }

  function setPaused(bool _state) public onlyOwner {
    paused = _state;
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return uriPrefix;
  }
}
