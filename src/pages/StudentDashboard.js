import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { uploadImage } from '../utils/cloudinary';
import { FaPaperPlane, FaCamera, FaArrowLeft, FaCheckCircle, FaFire, FaHeadset } from 'react-icons/fa';

const StudentDashboard = () => {
  const [view, setView] = useState('list'); 
  const [shops, setShops] = useState([]);
  const [activeShop, setActiveShop] = useState(null);
  const [shopProducts, setShopProducts] = useState([]);
  const [globalFeatured, setGlobalFeatured] = useState([]);
  const [filter, setFilter] = useState('All');
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpMessages, setHelpMessages] = useState([]);
  const scrollRef = useRef();

  useEffect(() => {
    const unsubShops = onSnapshot(query(collection(db, "users"), where("role", "==", "shop")), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => !s.blacklisted));
    });
    const unsubFeatured = onSnapshot(query(collection(db, "global_featured"), orderBy("createdAt", "desc")), (snapshot) => {
      setGlobalFeatured(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubShops(); unsubFeatured(); };
  }, []);

  // FIX: Removed second orderBy. Items will now definitely show.
  useEffect(() => {
    if (!activeShop || view !== 'storefront') return;
    const q = query(
      collection(db, "products"), 
      where("shopId", "==", activeShop.id), 
      orderBy("isFrequent", "desc")
    );
    return onSnapshot(q, (snap) => setShopProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [activeShop, view]);

  useEffect(() => {
    if (!activeShop || view !== 'chat') return;
    const chatId = [auth.currentUser.uid, activeShop.id].sort().join("_");
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => { setMessages(snap.docs.map(d => d.data())); scrollRef.current?.scrollIntoView({ behavior: "smooth" }); });
  }, [activeShop, view]);

  useEffect(() => {
    if (view !== 'help') return;
    const chatId = `support_${auth.currentUser.uid}`;
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => { setHelpMessages(snap.docs.map(d => d.data())); scrollRef.current?.scrollIntoView({ behavior: "smooth" }); });
  }, [view]);

  const openStorefront = (shop) => { setActiveShop(shop); setView('storefront'); };
  const openChat = (initialMsg = '') => { if(initialMsg) setMessage(initialMsg); setView('chat'); };
  const handleGlobalItemClick = (item) => { openStorefront({ id: item.shopId, displayName: item.shopName, category: item.shopCategory }); };

  const handleSend = async (imgUrl = null) => {
    if (!message.trim() && !imgUrl) return;
    const chatId = [auth.currentUser.uid, activeShop.id].sort().join("_");
    await setDoc(doc(db, "chats", chatId), {
      participants: [auth.currentUser.uid, activeShop.id], lastMessage: message || "Image", lastUpdated: serverTimestamp(), studentName: auth.currentUser.displayName
    }, { merge: true });
    await addDoc(collection(db, "chats", chatId, "messages"), { text: message, image: imgUrl || null, sender: auth.currentUser.uid, createdAt: serverTimestamp() });
    setMessage('');
  };

  const handleSendHelp = async () => {
    if (!helpMessage.trim()) return;
    const chatId = `support_${auth.currentUser.uid}`;
    await setDoc(doc(db, "chats", chatId), {
      participants: [auth.currentUser.uid],
      isSupport: true,
      lastMessage: helpMessage,
      lastUpdated: serverTimestamp(),
      studentName: auth.currentUser.displayName || "Student"
    }, { merge: true });
    await addDoc(collection(db, "chats", chatId, "messages"), { text: helpMessage, sender: auth.currentUser.uid, createdAt: serverTimestamp() });
    setHelpMessage('');
  };

  if (view === 'list') {
    return (
      <div className="bg-gray-50 min-h-screen pb-24 relative">
        <button onClick={() => setView('help')} className="fixed bottom-20 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg z-40 flex items-center gap-2"><FaHeadset /> <span className="text-xs font-bold">Help</span></button>
        <div className="bg-white p-4 sticky top-0 z-10 shadow-sm mb-4">
          <h1 className="text-xl font-bold text-brand-600">Brotherhood.</h1>
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
            {['All', 'Stationery', 'General Store', 'Food & Snacks'].map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${filter === cat ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{cat}</button>
            ))}
          </div>
        </div>
        {globalFeatured.length > 0 && (
          <div className="px-4 mb-6">
            <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Frequently Ordered</h3>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {globalFeatured.map(item => (
                <div key={item.id} onClick={() => handleGlobalItemClick(item)} className="min-w-[120px] bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center cursor-pointer active:scale-95 transition-transform">
                  <img src={item.productImage} alt={item.productName} className="w-full h-20 object-cover rounded-lg mb-2 bg-gray-50"/>
                  <p className="text-xs font-bold text-gray-700 text-center line-clamp-1">{item.productName}</p>
                  <p className="text-[10px] text-gray-400 truncate w-full text-center">{item.shopName}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="px-4 grid gap-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Shops</h3>
          {shops.filter(s => filter === 'All' || s.category === filter).map(shop => (
            <div key={shop.id} onClick={() => openStorefront(shop)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden">
              {shop.verified && <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-0.5 text-[10px] font-bold rounded-bl-lg z-10 flex items-center gap-1"><FaCheckCircle size={10}/> VERIFIED</div>}
              <img src={shop.photoURL || "https://via.placeholder.com/50"} alt="shop" className="w-14 h-14 rounded-full object-cover bg-gray-100 border border-gray-200" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-1">{shop.displayName}</h3>
                <span className="text-xs font-medium text-brand-500 bg-brand-50 px-2 py-1 rounded-lg">{shop.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'help') {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] bg-white absolute top-0 left-0 w-full z-50">
        <div className="p-4 border-b flex items-center gap-3 bg-gray-800 text-white shadow-sm">
          <button onClick={() => setView('list')} className="text-white p-2"><FaArrowLeft /></button>
          <h2 className="font-bold text-lg">Admin Support</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {helpMessages.length === 0 && <p className="text-center text-gray-400 mt-10">Send a message to start chatting with Admin.</p>}
          {helpMessages.map((msg, idx) => (
            <div key={idx} ref={scrollRef} className={`flex ${msg.sender === auth.currentUser.uid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.sender === auth.currentUser.uid ? 'bg-gray-800 text-white rounded-tr-none' : 'bg-white border shadow-sm rounded-tl-none'}`}>{msg.text}</div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t bg-white flex gap-2">
          <input type="text" value={helpMessage} onChange={(e) => setHelpMessage(e.target.value)} placeholder="Type complaint..." className="flex-1 bg-gray-100 rounded-full px-4 py-3 outline-none" />
          <button onClick={handleSendHelp} className="p-3 bg-gray-800 text-white rounded-full"><FaPaperPlane /></button>
        </div>
      </div>
    );
  }

  if (view === 'storefront') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white p-6 pb-8 shadow-sm rounded-b-3xl relative">
          <button onClick={() => setView('list')} className="absolute top-4 left-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><FaArrowLeft /></button>
          <div className="flex flex-col items-center">
             <h2 className="text-2xl font-bold">{activeShop.displayName}</h2>
             <p className="text-gray-500">{activeShop.category}</p>
             <button onClick={() => openChat()} className="mt-4 bg-brand-500 text-white px-6 py-2 rounded-full font-bold">Message Shop</button>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
           {shopProducts.map(product => (
             <div key={product.id} onClick={() => openChat(`Interested in ${product.name}`)} className={`bg-white rounded-xl shadow-sm overflow-hidden ${product.isFrequent ? 'border-2 border-orange-100' : ''}`}>
               <div className="h-32 bg-gray-100 relative">
                 <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                 {product.isFrequent && <div className="absolute top-1 right-1 bg-orange-500 text-white p-1 rounded-full text-[10px]"><FaFire/></div>}
               </div>
               <div className="p-3">
                 <h4 className="font-medium text-gray-800 truncate text-sm">{product.name}</h4>
                 <span className="text-brand-600 font-bold text-xs">₹{product.price}</span>
               </div>
             </div>
           ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-white absolute top-0 left-0 w-full z-50">
      <div className="p-4 border-b flex items-center gap-3 bg-white shadow-sm">
        <button onClick={() => setView('storefront')} className="text-gray-600 p-2"><FaArrowLeft /></button>
        <h2 className="font-bold text-lg">{activeShop?.displayName}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} ref={scrollRef} className={`flex ${msg.sender === auth.currentUser.uid ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[75%] p-3 rounded-2xl ${msg.sender === auth.currentUser.uid ? 'bg-brand-500 text-white' : 'bg-white border'}`}>
               {msg.image && <img src={msg.image} alt="img" className="rounded-lg mb-2"/>}
               <p className="text-sm">{msg.text}</p>
             </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t bg-white flex gap-2">
         <input type="text" value={message} onChange={e => setMessage(e.target.value)} className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none"/>
         <button onClick={() => handleSend()} className="bg-brand-500 text-white p-3 rounded-full"><FaPaperPlane/></button>
      </div>
    </div>
  );
};
export default StudentDashboard;