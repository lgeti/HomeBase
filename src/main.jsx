import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { captureAuthorizationFromUrl } from './core/utils/pendingAuthorization'
import { captureInviteFromUrl } from './core/utils/pendingInvite'

captureInviteFromUrl()
captureAuthorizationFromUrl()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
