import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { uploadImage } from '../utils/cloudinary';
// FIXED: Added FaArrowRight to imports
import { FaPaperPlane, FaCamera, FaArrowLeft, FaArrowRight, FaCheckCircle, FaFire, FaHeadset, FaStore } from 'react-icons/fa';

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

  const CATEGORIES = ['All', 'General Store', 'Stationery', 'Food & Snacks', 'Printing/Xerox'];

  // --- DATA FETCHING ---
  useEffect(() => {
    const unsubShops = onSnapshot(query(collection(db, "users"), where("role", "==", "shop")), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => !s.blacklisted));
    });
    const unsubFeatured = onSnapshot(query(collection(db, "global_featured"), orderBy("createdAt", "desc")), (snapshot) => {
      setGlobalFeatured(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubShops(); unsubFeatured(); };
  }, []);

  useEffect(() => {
    if (!activeShop || view !== 'storefront') return;
    const q = query(collection(db, "products"), where("shopId", "==", activeShop.id), orderBy("isFrequent", "desc"), orderBy("name", "asc"));
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

  // --- ACTIONS ---
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
    await setDoc(doc(db, "chats", chatId), { participants: [auth.currentUser.uid], isSupport: true, lastMessage: helpMessage, lastUpdated: serverTimestamp(), studentName: auth.currentUser.displayName || "Student" }, { merge: true });
    await addDoc(collection(db, "chats", chatId, "messages"), { text: helpMessage, sender: auth.currentUser.uid, createdAt: serverTimestamp() });
    setHelpMessage('');
  };

  // --- UI HELPERS ---
  const Header = ({ title, onBack, rightAction }) => (
    <div className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3">
        {onBack && <button onClick={onBack} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><FaArrowLeft size={14} /></button>}
        <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">{title}</h1>
      </div>
      {rightAction}
    </div>
  );

  // --- VIEW 1: LIST ---
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        {/* Modern Header with Categories */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 pb-2">
          <div className="flex justify-between items-center px-4 py-3">
             <h1 className="text-xl font-extrabold text-brand-600 tracking-tight">Brotherhood.</h1>
             <button onClick={() => setView('help')} className="p-2 text-gray-400 hover:text-brand-600"><FaHeadset size={20}/></button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-1">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${filter === cat ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Global Featured (Stories Style) */}
        {globalFeatured.length > 0 && (
          <div className="pt-6 pb-4 pl-4">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">Trending Now</h3>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pr-4">
              {globalFeatured.map(item => (
                <div key={item.id} onClick={() => handleGlobalItemClick(item)} className="min-w-[110px] cursor-pointer group">
                  <div className="w-[110px] h-[110px] rounded-2xl overflow-hidden mb-2 border border-gray-100 shadow-sm relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"/>
                    <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                    <div className="absolute bottom-2 left-2 text-white text-xs font-bold">₹{item.productPrice}</div>
                  </div>
                  <p className="text-xs font-bold text-gray-800 truncate">{item.productName}</p>
                  <p className="text-[10px] text-gray-400 truncate">{item.shopName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shop List */}
        <div className="px-4 mt-2 grid gap-4">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">Shops Nearby</h3>
          {shops.filter(s => filter === 'All' || s.category === filter).length === 0 && (
             <div className="text-center text-gray-400 py-10 flex flex-col items-center">
               <FaStore size={40} className="text-gray-200 mb-3"/>
               <p>No shops found.</p>
             </div>
          )}
          {shops.filter(s => filter === 'All' || s.category === filter).map(shop => (
            <div key={shop.id} onClick={() => openStorefront(shop)} className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform">
              <div className="relative">
                 <img src={shop.photoURL || "https://via.placeholder.com/50"} alt="shop" className="w-16 h-16 rounded-2xl object-cover bg-gray-100" />
                 {shop.verified && <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full"><FaCheckCircle className="text-green-500 text-sm"/></div>}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{shop.displayName}</h3>
                <p className="text-xs text-gray-400 mt-1">{shop.category}</p>
              </div>
              <div className="h-8 w-8 bg-brand-50 rounded-full flex items-center justify-center text-brand-500">
                 <FaArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VIEW 2: STOREFRONT ---
  if (view === 'storefront') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Hero Header */}
        <div className="relative h-48 bg-brand-600 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <button onClick={() => setView('list')} className="absolute top-4 left-4 p-3 bg-white/20 backdrop-blur-md text-white rounded-full z-10"><FaArrowLeft /></button>
          <div className="absolute -bottom-10 left-0 w-full h-20 bg-gray-50 rounded-t-[2.5rem]" />
          <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-center z-10 translate-y-8">
             <img src={activeShop.photoURL || "https://via.placeholder.com/80"} className="w-24 h-24 rounded-full border-4 border-gray-50 shadow-lg object-cover" alt="Shop" />
          </div>
        </div>
        
        <div className="text-center mt-10 px-6">
           <h2 className="text-2xl font-bold text-gray-900 flex justify-center items-center gap-2">
             {activeShop.displayName} 
             {activeShop.verified && <FaCheckCircle className="text-green-500 text-lg"/>}
           </h2>
           <p className="text-gray-500 text-sm mb-6">{activeShop.category}</p>
           <button onClick={() => openChat()} className="w-full max-w-xs bg-gray-900 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">Start Chatting</button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3 mt-6">
           {shopProducts.length === 0 && <div className="col-span-2 text-center text-gray-400 py-10">No products listed.</div>}
           {shopProducts.map(product => (
             <div key={product.id} onClick={() => openChat(`Interested in ${product.name}`)} className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform border border-gray-100">
               <div className="h-36 bg-gray-100 relative">
                 <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                 {product.isFrequent && (
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur text-orange-600 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <FaFire/> HOT
                    </div>
                 )}
               </div>
               <div className="p-3">
                 <h4 className="font-bold text-gray-800 text-sm leading-tight mb-1 truncate">{product.name}</h4>
                 <span className="text-brand-600 font-bold text-sm">₹{product.price}</span>
               </div>
             </div>
           ))}
        </div>
      </div>
    )
  }
  
  // --- VIEW 3: CHAT (Modern Message Bubbles) ---
  // --- VIEW 3: CHAT (Fixed Bottom Input) ---
  if (view === 'chat' || view === 'help') {
    const isHelp = view === 'help';
    const chatTitle = isHelp ? "Admin Support" : activeShop?.displayName;
    const chatMessages = isHelp ? helpMessages : messages;
    const chatInput = isHelp ? helpMessage : message;
    const setChatInput = isHelp ? setHelpMessage : setMessage;
    const sendFunc = isHelp ? handleSendHelp : handleSend;

    return (
      // UPDATED: h-[100dvh] ensures it fits mobile screens perfectly including browser bars
      // UPDATED: z-[60] ensures it sits on top of the Bottom Navigation Bar
      <div className="fixed inset-0 z-[60] bg-white flex flex-col h-[100dvh]">
        
        {/* Header - Fixed at top (Flex Item) */}
        <div className="flex-none">
          <Header title={chatTitle} onBack={() => setView(isHelp ? 'list' : 'storefront')} />
        </div>
        
        {/* Messages - Takes remaining space and scrolls internally */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {/* Spacer for Header */}
          <div className="h-14"></div> 
          
          {chatMessages.map((msg, idx) => {
            const isMe = msg.sender === auth.currentUser.uid;
            return (
              <div key={idx} ref={scrollRef} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-3 text-sm shadow-sm ${
                    isMe 
                    ? 'bg-brand-600 text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm'
                }`}>
                  {msg.image && <img src={msg.image} alt="img" className="rounded-lg mb-2 max-h-40 w-full object-cover"/>}
                  <p>{msg.text}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input Panel - Fixed at bottom (Flex Item) */}
        <div className="flex-none p-3 bg-white border-t border-gray-100 flex items-center gap-2 pb-safe">
           {!isHelp && (
             <label className="p-3 text-gray-400 bg-gray-50 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
                <FaCamera size={20} />
                <input type="file" className="hidden" onChange={(e) => { if(e.target.files[0]) uploadImage(e.target.files[0]).then(url => url && handleSend(url)) }} />
             </label>
           )}
           <input 
             type="text" 
             value={chatInput} 
             onChange={e => setChatInput(e.target.value)} 
             placeholder={isHelp ? "Describe your issue..." : "Type a message..."}
             className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
           />
           <button 
             onClick={sendFunc} 
             disabled={!chatInput.trim()}
             className="p-3 bg-brand-600 text-white rounded-full disabled:opacity-50 disabled:scale-100 active:scale-90 transition-all shadow-lg shadow-brand-200 flex items-center justify-center"
           >
             <FaPaperPlane size={16}/>
           </button>
        </div>
      </div>
    );
  }

  return null;
};

export default StudentDashboard;