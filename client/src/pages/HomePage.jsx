import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const HomePage = () => {
  const navigate = useNavigate();

  const createRoom = () => {
    const newRoomId = uuidv4();
    navigate(`/${newRoomId}`);
  };
  return (
    <div>
      <h1>Home</h1>
      <button onClick={createRoom}>Create Room</button>
    </div>
  );
};

export default HomePage;
