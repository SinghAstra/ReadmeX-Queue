import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import VideoChatPage from "./pages/VideoChatPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:roomId" element={<VideoChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
