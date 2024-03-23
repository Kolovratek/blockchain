import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ConnectPage from "./components/ConnectPage";
import MainPage from "./components/MainPage";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ConnectPage />} />
        <Route path="/node" element={<MainPage />} />
      </Routes>
    </Router>
  );
}

export default App;
