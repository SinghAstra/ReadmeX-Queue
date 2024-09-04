import { useParams } from "react-router-dom";

const VideoChatPage = () => {
  const { roomId } = useParams();
  return (
    <div>
      <h1>Video Chat Room</h1>
      <p>Room ID: {roomId}</p>
    </div>
  );
};

export default VideoChatPage;
