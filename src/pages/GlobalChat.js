import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { uploadFile } from '../utils/cloudinary';
import { FaPaperPlane, FaPaperclip, FaFileAlt, FaExternalLinkAlt, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const GlobalChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "global_messages"), orderBy("createdAt", "asc"), limit(50));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileData = await uploadFile(file);
    if (fileData) handleSend(fileData);
  };

  const handleSend = async (attachment = null) => {
    const validAttachment = attachment && attachment.url ? attachment : null;
    if (!newMessage.trim() && !validAttachment) return;
    
    const user = auth.currentUser;
    await addDoc(collection(db, "global_messages"), {
      text: newMessage,
      attachment: validAttachment,
      image: validAttachment?.type?.startsWith('image') ? validAttachment.url : null,
      senderId: user.uid,
      senderName: user.displayName,
      senderPhoto: user.photoURL,
      createdAt: serverTimestamp()
    });
    setNewMessage('');
  };

  const renderMessageContent = (msg) => {
    return (
      <>
        {msg.image && !msg.attachment && <img src={msg.image} alt="img" className="rounded-lg mb-2 max-h-40 w-full object-cover"/>}
        {msg.attachment && (
          msg.attachment.type?.startsWith('image') ? (
            <img src={msg.attachment.url} alt="img" className="rounded-lg mb-2 max-h-40 w-full object-cover"/>
          ) : (
            // FIXED: Open in new tab
            <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-black/5 p-3 rounded-lg mb-2 hover:bg-black/10 transition-colors no-underline">
              <div className="bg-white p-2 rounded-full text-brand-600"><FaFileAlt /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{msg.attachment.name}</p>
                <p className="text-[10px] text-gray-500 uppercase">Tap to open</p>
              </div>
              <FaExternalLinkAlt className="text-gray-400" size={12}/>
            </a>
          )
        )}
        <p>{msg.text}</p>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col h-[100dvh]">
      <div className="flex-none p-4 bg-white border-b shadow-sm z-10 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <FaArrowLeft size={16} className="text-gray-600"/>
        </button>
        <h1 className="font-bold text-xl text-brand-600 tracking-tight">Global <span className="text-gray-400 font-normal">Chat</span></h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
        {messages.map((msg) => {
          const isMe = msg.senderId === auth.currentUser.uid;
          return (
            <div key={msg.id} ref={scrollRef} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <img src={msg.senderPhoto || "https://via.placeholder.com/40"} alt="avatar" className="w-8 h-8 rounded-full object-cover mt-1"/>
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <span className="text-xs text-gray-400 mb-1 ml-1">{msg.senderName}</span>
                <div className={`px-4 py-3 text-sm shadow-sm ${isMe ? 'bg-brand-500 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-sm'}`}>
                  {renderMessageContent(msg)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-none p-3 bg-white border-t flex items-center gap-3 pb-safe">
        <label className="p-2 text-gray-400 hover:text-brand-500 cursor-pointer transition-colors">
          <FaPaperclip size={22} />
          <input type="file" className="hidden" onChange={handleFileUpload} />
        </label>
        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Say something..." className="flex-1 bg-gray-100 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"/>
        <button onClick={() => handleSend()} className="p-3 bg-brand-500 text-white rounded-full shadow-lg hover:bg-brand-600 transition-transform active:scale-95"><FaPaperPlane size={18} /></button>
      </div>
    </div>
  );
};

export default GlobalChat;