import { calculateHash } from "./hash.js";

export const createBlock = (index, timestamp, data, previousHash) => {
  const block = {
    index,
    timestamp,
    data,
    previousHash,
    hash: calculateHash(index, previousHash, timestamp, data),
  };

  return block;
};
