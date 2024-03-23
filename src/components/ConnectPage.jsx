import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ConnectPage.css";

const ConnectPage = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");

  const handleConnect = () => {
    navigate("/node", { state: { ip: inputValue } });
  };

  return (
    <div className="connectPageContainer">
      <div className="connectPageContent">
        <input
          type="text"
          className="connectInput"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Zadajte ip adresu a port"
        />
        <button className="connectButton" onClick={handleConnect}>
          Connect
        </button>
      </div>
    </div>
  );
};

export default ConnectPage;
