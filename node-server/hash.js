import SHA256 from "crypto-js/sha256.js";

export const calculateHash = (index, previousHash, timestamp, data) => {
  return SHA256(
    index + previousHash + timestamp + JSON.stringify(data)
  ).toString();
};
