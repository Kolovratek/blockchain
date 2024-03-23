import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./MainPage.css";

function splitIpAndPort(inputString) {
  const parts = inputString.split(":");

  const ip = parts[0];
  const port = parts[1];

  return { ip, port };
}

const MainPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [neighbors, setNeighbors] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [blockchain, setBlockchain] = useState([]);
  const [currentIp, setCurrentIp] = useState("");
  const [currentPort, setCurrentPort] = useState("");
  const [transaction, setTransaction] = useState("");
  const [transactionCount, setTransactionCount] = useState(0);

  const { ip: initialIp, port: initialPort } = splitIpAndPort(
    location.state?.ip
  );

  useEffect(() => {
    setCurrentIp(initialIp);
    setCurrentPort(initialPort);
  }, [initialIp, initialPort]);

  useEffect(() => {
    const fetchNeighbors = async () => {
      try {
        const response = await axios.get(
          `http://${currentIp}:${currentPort}/getNeighbors`
        );
        setNeighbors(response.data.neighbors);
      } catch (error) {
        alert(`Na daný server sa nevieš napojiť zmeň ip a port`);
        navigate("/");
      }
    };

    const intervalId = setInterval(fetchNeighbors, 5000);
    const intervalId2 = setInterval(fetchBlockchain, 4000);
    // Zastav interval, ak komponent unmountuje
    return () => clearInterval(intervalId);
  }, [currentIp, currentPort]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(
        `http://${currentIp}:${currentPort}/getAllTransacion`
      );
      setAllTransactions(response.data.transactions);
      console.log("Transactions:", response.data.transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchBlockchain = async () => {
    try {
      const response = await axios.get(
        `http://${currentIp}:${currentPort}/getBlockchain`
      );
      setBlockchain(response.data.blockchain);
      console.log("Dostal som Blockchain:", response.data.blockchain);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
    console.log("use state blockchain", blockchain);
  };

  const handleChangeIp = (inputIp, inputPort) => {
    console.log("Changing ip to:", inputIp, inputPort);
    setCurrentIp(inputIp);
    setCurrentPort(inputPort);
  };

  const handleAddTransaction = async () => {
    console.log("Adding transaction:", transaction);
    try {
      const response = await axios.post(
        `http://${currentIp}:${currentPort}/addTransaction`,
        {
          transaction: transaction,
          timestamp: new Date().getTime(),
          nodeId: `${currentIp}:${currentPort}`,
        }
      );
      console.log("Transaction added:", response.data);
      setTransactionCount(transactionCount + 1);
      fetchTransactions();
      fetchBlockchain();
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Error nepodarilo sa pridať blok");
      let success = false;
      while (!success) {
        try {
          const response = await axios.post(
            `http://${currentIp}:${currentPort}/addBlock`,
            {}
          );
          console.log("Transaction added:", response.data);
          setTransactionCount(transactionCount + 1);
          fetchTransactions();
          fetchBlockchain();
          success = true;
        } catch (error) {beh
          console.error("Error adding transaction:", error);
          alert("Error: " + error);
          await new Promise((resolve) => setTimeout(resolve, 6000));
        }
      }
    }
  };

  return (
    <div className="MainPage">
      <div>
        <h1>
          Connect: {currentIp}:{currentPort}
        </h1>
        <div>
          <input
            type="text"
            value={transaction}
            onChange={(e) => setTransaction(e.target.value)}
            placeholder="Zadajte transakciu"
          />
          <button onClick={() => handleAddTransaction()}>Transaction</button>
        </div>
      </div>
      <div className="NodeList">
        <h2>NodeList:</h2>
        {neighbors.map((neighbor, index) => {
          if (neighbor.ip === currentIp && neighbor.port === currentPort) {
            return null;
          }

          return (
            <div className="NodeItem" key={index}>
              <span>
                {neighbor.ip}:{neighbor.port}
              </span>
              <button
                onClick={() => handleChangeIp(neighbor.ip, neighbor.port)}
              >
                Connect
              </button>
            </div>
          );
        })}
      </div>
      <div className="Transaction">
        <h2>Transaction:</h2>
        {allTransactions.map((transaction, index) => (
          <div className="TransactionItem" key={index}>
            <span>
              {transaction.transaction},{transaction.timestamp},
              {transaction.nodeId}
            </span>
          </div>
        ))}
      </div>
      <div className="Blockchain">
        <h2>Blockchain:</h2>
        {blockchain.map((block, index) => (
          <div className="BlockItem" key={index}>
            <p>Index: {block.index}</p>
            <p>Timestamp: {block.timestamp}</p>
            {block.data === null && <p>Data: </p>}
            {block.data !== null && (
              <div className="Data">
                {block.data.map((transaction, i) => (
                  <div key={i}>
                    <p>Transaction: {transaction.transaction}</p>
                    <p>Timestamp: {transaction.timestamp}</p>
                    <p>Node ID: {transaction.nodeId}</p>
                  </div>
                ))}
              </div>
            )}
            <p>Previous Hash: {block.previousHash}</p>
            <p>Hash: {block.hash}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainPage;
