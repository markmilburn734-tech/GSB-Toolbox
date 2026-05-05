import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GSB } from './components/Icons';
import './index.css';

// Connects the App to the 'root' div in your Index.html
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);