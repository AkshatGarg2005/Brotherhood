import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { uploadImage } from '../utils/cloudinary';
import { FaPaperPlane, FaCamera } from 'react-icons/fa';

const GlobalChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef();

  // Fetch Global Messages
  useEffect(() => {
    const q = query(
      collection(db, "global_messages"),
      orderBy("createdAt", "asc"),
      limit(50) // Keep it light
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    return unsubscribe;
  }, []);

  const handleSend = async (imgUrl = null) => {
    if (!newMessage.trim() && !imgUrl) return;
    
    const user = auth.currentUser;

    await addDoc(collection(db, "global_messages"), {
      text: newMessage,
      image: imgUrl || null,
      senderId: user.uid,
      senderName: user.displayName,
      senderPhoto: user.photoURL,
      createdAt: serverTimestamp()
    });
    setNewMessage('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if(file) {
      const url = await uploadImage(file);
      if(url) handleSend(url);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-white">
      {/* Header */}
      <div className="p-4 bg-white border-b shadow-sm z-10 flex items-center gap-2">
        <h1 className="font-bold text-xl text-brand-600 tracking-tight">Brotherhood <span className="text-gray-400 font-normal">Global</span></h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
        {messages.map((msg) => {
          const isMe = msg.senderId === auth.currentUser.uid;
          return (
            <div key={msg.id} ref={scrollRef} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <img 
                src={msg.senderPhoto || "https://via.placeholder.com/40"} 
                alt="avatar" 
                className="w-8 h-8 rounded-full object-cover mt-1"
              />
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <span className="text-xs text-gray-400 mb-1 ml-1">{msg.senderName}</span>
                <div className={`p-3 rounded-2xl ${isMe ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}`}>
                  {msg.image && <img src={msg.image} alt="upload" className="rounded-lg mb-2" />}
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white flex items-center gap-3">
        <label className="p-2 text-gray-400 hover:text-brand-500 cursor-pointer transition-colors">
          <FaCamera size={22} />
          <input type="file" className="hidden" onChange={handleImageUpload} />
        </label>
        <input 
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Say something to everyone..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
        />
        <button onClick={() => handleSend()} className="p-3 bg-brand-500 text-white rounded-full shadow-lg hover:bg-brand-600 transition-transform active:scale-95">
          <FaPaperPlane size={18} />
        </button>
      </div>
    </div>
  );
};

export default GlobalChat;