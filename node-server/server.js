import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import os from "os";
import cors from "cors";
import createBlockchain from "./blockchain.js";
import { createBlock } from "./block.js";
import fs from "fs";
import path from "path";
import { get } from "http";
import { exit, exitCode } from "process";

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }
}

const app = express();
app.use(cors());
let neighbors = [];
let peopleStatus = [];

const INTERVAL_TIME = 5000;

const args = process.argv.slice(2);
let config = {
  port: undefined,
  ip: undefined,
  connectPort: undefined,
  status: undefined,
};

if (args.length === 4) {
  config = {
    port: args[0],
    ip: args[1],
    connectPort: args[2],
    status: args[3],
  };
} else if (args.length === 2) {
  config = {
    port: args[0],
    ip: getLocalIP(),
    connectPort: undefined,
    status: args[1],
  };
} else {
  console.log(
    "Zadal si zlé argumenty ak si prvý musíš zadať node server {PORT} {STATUS} ak sa chceš na niekoho napojiť \
     musíš zadať v tvare: node server {PORT} {IP} {CONNECT-PORT} {STATUS}"
  );
  exit(1);
}

const getNeighborsStatus = async () => {
  if (neighbors.length === 1) {
    peopleStatus.push("A");
  }
  for (const neighbor of neighbors) {
    if (neighbor.port === config.port) {
      continue;
    }
    try {
      const response = await axios.get(
        `http://${neighbor.ip}:${neighbor.port}/getStatus`
      );
      console.log("response", response.data.status);
      if (response.data.status === "A") {
        peopleStatus.push("A");
      } else if (response.data.status === "B") {
        peopleStatus.push("B");
      }
    } catch (error) {
      if (error.code === "ECONNRESET") {
        const response = await axios.get(
          `http://${neighbor.ip}:${neighbor.port}/getStatus`
        );
        if (response.data.status === "A") {
          peopleStatus.push("A");
        } else if (response.data.status === "B") {
          peopleStatus.push("B");
        }
      } else {
        console.error(
          `Nedá sa pripojiť k susedovi ${neighbor.port}: ${error.message}`
        );
        neighbors = neighbors.filter(
          (n) => n.port !== neighbor.port || n.ip !== neighbor.ip
        );
      }
    }
  }
};

const calculateFinalStatus = (peopleStatus) => {
  let countA = 0;
  let countB = 0;
  for (const status of peopleStatus) {
    if (status === "A") {
      countA++;
    } else if (status === "B") {
      countB++;
    }
  }
  if (countA > countB) {
    return "A";
  } else {
    return "B";
  }
};

function loadTransactionFromFile() {
  const nodeAddress = `${config.ip}:${config.port}`;
  const fileName = `${nodeAddress.replace(":", "_")}-transaction.json`;

  let transactions = [];

  try {
    const transactionsData = fs.readFileSync(fileName, "utf-8");
    transactions = JSON.parse(transactionsData);
    console.log(
      `Tranzakcie pre ${nodeAddress} sú načítané zo súboru ${fileName}`
    );
  } catch (error) {
    console.error(`Tranzakcie neexistuje vytváram nový`);
    try {
      fs.openSync(fileName, "w");
      fs.writeFileSync(fileName, JSON.stringify(transactions));
      console.log(
        `Nový transaction blok pre ${nodeAddress} bol vytvorený a uložený do súboru ${fileName}`
      );
    } catch (error) {
      console.error(
        `Chyba pri vytváraní a ukladaní nového súboru s tranzakciami: ${error}`
      );
    }
  }

  return transactions;
}

const saveTransactionToFile = (transactions) => {
  const nodeAddress = `${config.ip}:${config.port}`;
  const fileName = `${nodeAddress.replace(":", "_")}-transaction.json`;
  const transactionData = JSON.stringify(transactions);

  try {
    fs.writeFileSync(fileName, transactionData);
    console.log(`Tranzakcie úspešne uložené do ${fileName}`);
  } catch (error) {
    console.error(`Error pri ukladaní tranzakcií do súboru: ${error.message}`);
  }
};

const deleteTransactionFile = () => {
  const nodeAddress = `${config.ip}:${config.port}`;
  const fileName = `${nodeAddress.replace(":", "_")}-transaction.json`;

  if (fs.existsSync(fileName)) {
    try {
      fs.unlinkSync(fileName);
      console.log(`Súbor ${fileName} bol úspešne odstránený.`);
    } catch (error) {
      console.error(
        `Chyba pri odstraňovaní súboru ${fileName}: ${error.message}`
      );
    }
  } else {
    console.log(`Súbor s názvom ${fileName} nebol nájdený.`);
  }
};

let transactions = loadTransactionFromFile();

function loadBlockchainFromFileForFirstTime() {
  const nodeAddress = `${config.ip}:${config.port}`;
  const fileName = `${nodeAddress.replace(":", "_")}-blockchain.json`;

  let blockchain = createBlockchain();

  try {
    const blockchainData = fs.readFileSync(fileName, "utf-8");
    blockchain.chain = JSON.parse(blockchainData);
    console.log(`Blockchain pre ${nodeAddress} načítaný zo súboru ${fileName}`);
  } catch (error) {
    console.error(`Blockchain neexistuje vytváram nový`);
    try {
      fs.openSync(fileName, "w");
      fs.writeFileSync(fileName, JSON.stringify(blockchain));
      console.log(
        `Nový blockchain pre ${nodeAddress} bol vytvorený a uložený do súboru ${fileName}`
      );
    } catch (error) {
      console.error(
        `Chyba pri vytváraní a ukladaní nového súboru s blockchainom: ${error}`
      );
    }
  }
  // console.log("blockchain zo suboru", blockchain);
  return blockchain;
}x

const saveBlockchainToFile = (blockchain) => {
  const nodeAddress = `${config.ip}:${config.port}`;
  const fileName = `${nodeAddress.replace(":", "_")}-blockchain.json`;
  const blockchainData = JSON.stringify(blockchain);

  try {
    fs.writeFileSync(fileName, blockchainData);
    // console.log(`blockchain úspešne uložený do ${fileName}`);
  } catch (error) {
    console.error(`Error pri ukladaní blockchainu do súboru: ${error.message}`);
  }
};

let blockchain = loadBlockchainFromFileForFirstTime();

function loadBlockchainFromFile() {
  const nodeAddress = `${config.ip}:${config.port}`;
  const fileName = `${nodeAddress.replace(":", "_")}-blockchain.json`;

  let tmpBlockchain = blockchain;

  try {
    const tmpBlockchainData = fs.readFileSync(fileName, "utf-8");
    tmpBlockchain.chain = JSON.parse(tmpBlockchainData);
    // console.log(`Blockchain pre ${nodeAddress} načítaný zo súboru ${fileName}`);
  } catch (error) {
    console.error(`Chyba pri načítaní blockchainu zo súboru: ${error}`);
    try {
      fs.openSync(fileName, "w");
      fs.writeFileSync(fileName, JSON.stringify(tmpBlockchain));
      console.log(
        `Nový blockchain pre ${nodeAddress} bol vytvorený a uložený do súboru ${fileName}`
      );
    } catch (error) {
      console.error(
        `Chyba pri vytváraní a ukladaní nového súboru s blockchainom: ${error}`
      );
    }
  }
  return tmpBlockchain;
}

// Body parser middleware
app.use(bodyParser.json());

app.post("/add-neighbor", async (req, res) => {
  const { neighborPort, neighborIP } = req.body;

  if (!neighbors.find((n) => n.port === neighborPort && n.ip === neighborIP)) {
    neighbors.push({ port: neighborPort, ip: neighborIP });
  }
});

const registerOnParentServer = async (parentPort) => {
  try {
    const response = await axios.post(
      `http://${config.ip}:${parentPort}/add-neighbor`,
      {
        neighborPort: config.port,
        neighborIP: config.ip,
      }
    );
    neighbors = response.data.neighbors;
    console.log(`Úspešne zaregistrovaný na server porte ${parentPort}`);
  } catch (error) {
    console.error(
      `Nepodarilo sa zaregistrovať na server porte ${parentPort}: ${error.message}`
    );
  }
};

const getTransactionsFromParentServer = async (parentPort) => {
  try {
    const response = await axios.get(
      `http://${config.ip}:${parentPort}/getAllTransacion`
    );
    saveTransactionToFile(response.data.transactions);
  } catch (error) {
    console.error(
      `Nepodarilo sa získať transakcie zo servera porte ${parentPort}: ${error.message}`
    );
  }
};

const getBlockchainFromParentServer = async (parentPort) => {
  try {
    const response = await axios.get(
      `http://${config.ip}:${parentPort}/getBlockchain`
    );
    loadBlockchainFromFileForFirstTime();
    saveBlockchainToFile(response.data.blockchain);
    console.log("blockchain ktory som dostal", response.data.blockchain);
  } catch (error) {
    console.error(
      `Nepodarilo sa získať blockchain zo servera porte ${parentPort}: ${error.message}`
    );
  }
};

async function checkAndUpdateNeighbors() {
  for (const neighbor of neighbors) {
    if (neighbor.port === config.port) {
      continue;
    }
    try {
      await axios.post(
        `http://${neighbor.ip}:${neighbor.port}/receive-neighbors`,
        {
          myNeighbors: neighbors,
        }
      );
    } catch (error) {
      if (error.code === "ECONNRESET") {
        await axios.post(
          `http://${neighbor.ip}:${neighbor.port}/receive-neighbors`,
          {
            myNeighbors: neighbors,
          }
        );
      } else {
        console.error(
          `Nedá sa pripojiť k susedovi ${neighbor.port}: ${error.message}`
        );
        neighbors = neighbors.filter(
          (n) => n.port !== neighbor.port || n.ip !== neighbor.ip
        );
      }
    }
  }
  console.log("Aktualizovaný zoznam susedov:", neighbors);
}

app.post("/receive-neighbors", (req, res) => {
  const { myNeighbors } = req.body;
  for (const neighbor of myNeighbors) {
    if (
      !neighbors.find((n) => n.port === neighbor.port && n.ip === neighbor.ip)
    ) {
      neighbors.push(neighbor);
    }
  }

  res.send("Zoznam susedov prijatý a spracovaný.");
});

async function checkAndUpdateTransactions() {
  for (const neighbor of neighbors) {
    if (neighbor.port === config.port) {
      continue;
    }
    try {
      await axios.post(
        `http://${neighbor.ip}:${neighbor.port}/receive-transactions`,
        {
          myTransactions: transactions,
        }
      );
    } catch (error) {
      if (error.code === "ECONNRESET") {
        await axios.post(
          `http://${neighbor.ip}:${neighbor.port}/receive-transactions`,
          {
            myTransactions: transactions,
          }
        );
      } else {
        console.error(
          `Nedá sa pripojiť k susedovi ${neighbor.port}: ${error.message}`
        );
        neighbors = neighbors.filter(
          (n) => n.port !== neighbor.port || n.ip !== neighbor.ip
        );
      }
    }
  }
}

app.post("/receive-transactions", (req, res) => {
  const { myTransactions } = req.body;
  transactions = myTransactions;
  res.send("Zoznam transakcii prijatý a spracovaný.");
});

async function checkAndUpdateBlockchain() {
  blockchain = loadBlockchainFromFile();
  for (const neighbor of neighbors) {
    if (neighbor.port === config.port) {
      continue;
    }
    try {
      await axios.post(
        `http://${neighbor.ip}:${neighbor.port}/receive-blockchain`,
        {
          myBlockchain: blockchain.chain,
        }
      );
    } catch (error) {
      if (error.code === "ECONNRESET") {
        await axios.post(
          `http://${neighbor.ip}:${neighbor.port}/receive-blockchain`,
          {
            myBlockchain: blockchain.chain,
          }
        );
      } else {
        console.error(
          `Nedá sa pripojiť k susedovi ${neighbor.port}: ${error.message}`
        );
        neighbors = neighbors.filter(
          (n) => n.port !== neighbor.port || n.ip !== neighbor.ip
        );
      }
    }
  }
}

app.post("/receive-blockchain", (req, res) => {
  const { myBlockchain } = req.body;

  saveBlockchainToFile(myBlockchain);
  res.send("Blockchain prijatý a spracovaný.");
});

app.get("/getStatus", (req, res) => {
  res.json({ status: config.status });
});

app.get("/getNeighbors", (req, res) => {
  res.json({ neighbors });
});

app.get("/getAllTransacion", (req, res) => {
  transactions = loadTransactionFromFile();
  console.log("Aktualizované tranzakcie", transactions);
  res.json({ transactions });
});

app.get("/getBlockchain", (req, res) => {
  blockchain = loadBlockchainFromFile();
  checkAndUpdateBlockchain();
  res.json({ blockchain: blockchain.chain.chain });
});

app.post("/addTransaction", async (req, res) => {
  const { transaction, timestamp, nodeId } = req.body;
  transactions.push({ transaction, timestamp, nodeId });
  saveTransactionToFile(transactions);
  blockchain = loadBlockchainFromFile();
  const lastBlock = blockchain.chain.chain[blockchain.chain.chain.length - 1];
  const lastHash = lastBlock.hash;
  peopleStatus = [];
  await getNeighborsStatus();
  const finalStatus = calculateFinalStatus(peopleStatus);
  console.log("finalStatus", finalStatus);
  if (transactions.length === 5 && finalStatus === "A") {
    const block = createBlock(
      blockchain.chain.chain.length,
      Date.now(),
      transactions,
      lastHash
    );
    blockchain.chain.chain.push(block);
    blockchain.addBlock(block);
    transactions = [];
    deleteTransactionFile();
    saveBlockchainToFile(blockchain.chain);
    checkAndUpdateBlockchain();
  } else if (transactions.length === 5 && finalStatus === "B") {
    res.status(400).send("Nepodarilo sa vytvoriť blok");
    return;
  }
  checkAndUpdateTransactions();
  res.send("Pridal som tranzakciu.");
});

app.post("/addBlock", (req, res) => {
  blockchain = loadBlockchainFromFile();
  const lastBlock = blockchain.chain.chain[blockchain.chain.chain.length - 1];
  const lastHash = lastBlock.hash;
  getNeighborsStatus();
  const finalStatus = calculateFinalStatus(peopleStatus);
  console.log("finalStatus", finalStatus);
  if (transactions.length === 5 && finalStatus === "A") {
    const block = createBlock(
      blockchain.chain.chain.length,
      Date.now(),
      transactions,
      lastHash
    );
    blockchain.chain.chain.push(block);
    blockchain.addBlock(block);
    transactions = [];
    deleteTransactionFile();
    saveBlockchainToFile(blockchain.chain);
    checkAndUpdateBlockchain();
  } else if (transactions.length === 5 && finalStatus === "B") {
    res.status(400).send("Nepodarilo sa vytvoriť blok");
    return;
  }
  checkAndUpdateTransactions();
  res.send("Pridal som tranzakciu.");
});

// Spustenie servera
app.listen(config.port, () => {
  console.log(`Server beží na IP ${config.ip} a porte ${config.port}`);
  neighbors.push({ port: config.port, ip: config.ip });

  blockchain = loadBlockchainFromFile();
  if (config.connectPort) {
    registerOnParentServer(config.connectPort);
    getTransactionsFromParentServer(config.connectPort);
    getBlockchainFromParentServer(config.connectPort);
  }
  setInterval(checkAndUpdateNeighbors, INTERVAL_TIME);
});
