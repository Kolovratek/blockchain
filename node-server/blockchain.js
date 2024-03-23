import { calculateHash } from "./hash.js";
import { createBlock } from "./block.js";

const createBlockchain = () => {
  const chain = [createBlock(0, 0, null, "0")];

  const addBlock = (newBlock) => {
    newBlock.hash = calculateHash(
      newBlock.index,
      newBlock.previousHash,
      newBlock.timestamp,
      newBlock.data
    );
    const block = createBlock(
      newBlock.index,
      newBlock.timestamp,
      newBlock.data,
      newBlock.previousHash,
      newBlock.hash
    );
    chain.push(block);
    console.log("New block added to the chain", chain);
  };

  const getLatestBlock = () => {
    console.log("dlzka", chain.length);
    return chain[chain.length - 1];
  };

  const isValid = () => {
    for (let i = chain.length - 1; i > 0; i--) {
      if (chain[i].hash !== calculateHash(chain[i])) {
        return false;
      }
      if (chain[i].previousHash !== chain[i - 1].hash) {
        return false;
      }
    }
    return true;
  };

  return { addBlock, getLatestBlock, isValid, chain };
};

export default createBlockchain;
