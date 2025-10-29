import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '/src/index.css';
import '/src/font.css'
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Provider } from 'react-redux';
import { store } from './contexts/store.jsx';



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      
        <App />
     
    </Provider>
  </StrictMode>
);