import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { uploadImage } from '../utils/cloudinary';
import { FaPaperPlane, FaCamera, FaArrowLeft, FaPlus, FaTrash, FaFire, FaBan, FaHeadset, FaShoppingBag, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const ShopDashboard = () => {
  const { userData } = useAuth();
  const [tab, setTab] = useState('orders');
  
  const [activeChat, setActiveChat] = useState(null);
  const [showSupport, setShowSupport] = useState(false);
  
  const [chats, setChats] = useState([]);
  const [directOrders, setDirectOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [message, setMessage] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', price: '', image: null });
  const [uploading, setUploading] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  
  const [supportMessage, setSupportMessage] = useState('');
  const [supportMessages, setSupportMessages] = useState([]);

  const scrollRef = useRef();

  const STATUS_RANK = {
    'pending': 1,
    'confirmed': 2,
    'completed': 3,
    'cancelled': 0
  };

  const handleStatusChange = async (order, newStatus) => {
    if (order.status === 'cancelled') {
      return alert("This order is cancelled. You cannot change its status.");
    }
    if (newStatus === 'cancelled') {
      if (window.confirm("Are you sure you want to CANCEL this order?")) {
        await updateDoc(doc(db, "orders", order.id), { status: newStatus });
      }
      return;
    }
    const currentRank = STATUS_RANK[order.status] || 0;
    const newRank = STATUS_RANK[newStatus] || 0;

    if (newRank <= currentRank) {
      return alert("You can only move the order status forward (e.g. Pending -> Confirmed).");
    }

    try {
      await updateDoc(doc(db, "orders", order.id), { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  useEffect(() => {
    const chatId = `support_${auth.currentUser.uid}`;
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => setSupportMessages(snapshot.docs.map(doc => doc.data())));
  }, []);

  useEffect(() => {
    if (userData?.blacklisted || tab !== 'chats') return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", auth.currentUser.uid), orderBy("lastUpdated", "desc"));
    return onSnapshot(q, (snapshot) => setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(c => !c.isSupport)));
  }, [tab, userData]);

  useEffect(() => {
    if (userData?.blacklisted || tab !== 'orders') return;
    const q = query(collection(db, "orders"), where("shopId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => setDirectOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }, [tab, userData]);

  useEffect(() => {
    if (userData?.blacklisted || tab !== 'products') return;
    const q = query(collection(db, "products"), where("shopId", "==", auth.currentUser.uid), orderBy("isFrequent", "desc"), orderBy("name", "asc"));
    return onSnapshot(q, (snapshot) => setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }, [tab, userData]);

  useEffect(() => {
    if (!activeChat) return;
    const q = query(collection(db, "chats", activeChat.id, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => { setMessages(snapshot.docs.map(doc => doc.data())); scrollRef.current?.scrollIntoView({ behavior: "smooth" }); });
  }, [activeChat]);

  const handleSendSupport = async () => {
    if (!supportMessage.trim()) return;
    const chatId = `support_${auth.currentUser.uid}`;
    await setDoc(doc(db, "chats", chatId), { participants: [auth.currentUser.uid], isSupport: true, lastMessage: supportMessage, lastUpdated: serverTimestamp(), studentName: userData.displayName || "Shop Owner" }, { merge: true });
    await addDoc(collection(db, "chats", chatId, "messages"), { text: supportMessage, sender: auth.currentUser.uid, createdAt: serverTimestamp() });
    setSupportMessage('');
  };

  const handleSend = async (imgUrl = null) => {
    const validImg = (typeof imgUrl === 'string') ? imgUrl : null;
    if (!message.trim() && !validImg) return;
    await addDoc(collection(db, "chats", activeChat.id, "messages"), { text: message, image: validImg, sender: auth.currentUser.uid, createdAt: serverTimestamp() });
    setMessage('');
  };

  const handleChatImageUpload = async (e) => {
     const file = e.target.files[0]; if(file) { const url = await uploadImage(file); if(url) handleSend(url); }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image) return alert("Fill all fields");
    setUploading(true);
    const imageUrl = await uploadImage(newProduct.image);
    await addDoc(collection(db, "products"), { shopId: auth.currentUser.uid, name: newProduct.name, price: newProduct.price, image: imageUrl, isFrequent: false, rating: 0, ratingCount: 0, createdAt: serverTimestamp() });
    setNewProduct({ name: '', price: '', image: null }); setIsAddingProduct(false); setUploading(false);
  };

  const toggleFrequent = async (product) => { await updateDoc(doc(db, "products", product.id), { isFrequent: !product.isFrequent }); };
  const handleDeleteProduct = async (id) => { if(window.confirm("Delete?")) await deleteDoc(doc(db, "products", id)); };


  // --- VIEW: BANNED ---
  if (userData?.blacklisted) {
    return (
      <div className="min-h-screen flex flex-col bg-red-50">
        <div className="p-6 text-center">
          <FaBan className="text-red-500 text-5xl mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-red-600">Account Suspended</h1>
          <p className="text-gray-600 text-sm">Chat with admin below.</p>
        </div>
        <div className="flex-1 bg-white mx-4 mb-4 rounded-xl shadow-md border border-red-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {supportMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === auth.currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender === auth.currentUser.uid ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'}`}>{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input type="text" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Message..." className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none"/>
            <button onClick={handleSendSupport} className="bg-red-500 text-white p-3 rounded-full"><FaPaperPlane/></button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: SUPPORT ---
  if (showSupport) {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col h-[100dvh]">
        <div className="flex-none">
          <div className="p-4 border-b flex items-center gap-3 bg-gray-800 text-white shadow-sm">
            <button onClick={() => setShowSupport(false)} className="text-white p-2 hover:bg-gray-700 rounded-full"><FaArrowLeft /></button>
            <h2 className="font-bold text-lg">Admin Support</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {supportMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === auth.currentUser.uid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.sender === auth.currentUser.uid ? 'bg-gray-800 text-white' : 'bg-white border shadow-sm'}`}>{msg.text}</div>
            </div>
          ))}
        </div>
        <div className="flex-none p-3 border-t bg-white flex gap-2 pb-safe">
          <input type="text" value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Type your issue..." className="flex-1 bg-gray-100 rounded-full px-4 py-3 outline-none" />
          <button onClick={handleSendSupport} className="p-3 bg-gray-800 text-white rounded-full"><FaPaperPlane /></button>
        </div>
      </div>
    );
  }

  // --- VIEW: CHAT ---
  if (activeChat) {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col h-[100dvh]">
        <div className="flex-none">
          <div className="p-4 border-b flex items-center gap-3 bg-white shadow-sm">
            <button onClick={() => setActiveChat(null)} className="text-gray-600 p-2"><FaArrowLeft /></button>
            <h2 className="font-bold text-lg">{activeChat.studentName}</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div key={idx} ref={scrollRef} className={`flex ${msg.sender === auth.currentUser.uid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl ${msg.sender === auth.currentUser.uid ? 'bg-brand-500 text-white' : 'bg-white text-gray-800 shadow-sm border'}`}>
                {msg.image && <img src={msg.image} alt="attachment" className="rounded-lg mb-2" />}
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex-none p-3 border-t bg-white flex items-center gap-3 pb-safe">
          <label className="p-2 text-gray-400"><FaCamera size={22} /><input type="file" className="hidden" onChange={handleChatImageUpload} /></label>
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reply..." className="flex-1 bg-gray-100 rounded-full px-4 py-3 focus:outline-none" />
          <button onClick={() => handleSend()} className="p-3 bg-brand-500 text-white rounded-full shadow-lg"><FaPaperPlane /></button>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm flex flex-col gap-3 sticky top-0 z-10">
        <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-brand-600">Shop Dashboard</h1>
            <button onClick={() => setShowSupport(true)} className="p-2 text-gray-500 hover:text-brand-600"><FaHeadset size={20} /></button>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
           <button onClick={() => setTab('orders')} className={`flex-1 py-2 rounded-md text-xs font-bold uppercase ${tab === 'orders' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>Orders</button>
           <button onClick={() => setTab('chats')} className={`flex-1 py-2 rounded-md text-xs font-bold uppercase ${tab === 'chats' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>Chats</button>
           <button onClick={() => setTab('products')} className={`flex-1 py-2 rounded-md text-xs font-bold uppercase ${tab === 'products' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>Items</button>
        </div>
      </div>

      {tab === 'orders' && (
        <div className="p-4 space-y-4 pb-24">
          {directOrders.length === 0 && <div className="text-center text-gray-400 mt-10 flex flex-col items-center"><FaShoppingBag size={40} className="mb-2 opacity-20"/><p>No new orders</p></div>}
          {directOrders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="font-bold text-gray-900 text-lg">{order.studentName}</h3>
                          <div className="flex flex-col gap-1 mt-1">
                             <p className="text-xs text-gray-500 flex items-center gap-1"><FaPhone size={10}/> {order.deliveryPhone}</p>
                             <p className="text-xs text-gray-500 flex items-start gap-1"><FaMapMarkerAlt size={10} className="mt-0.5"/> {order.deliveryAddress}</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <span className="block font-bold text-brand-600 text-lg">₹{order.totalAmount}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold">{order.paymentMethod}</span>
                      </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
                      {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-600 font-medium">{item.quantity} x {item.name}</span>
                              <span className="text-gray-900 font-bold">₹{item.price * item.quantity}</span>
                          </div>
                      ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{order.status}</span>
                      
                      <select 
                        value={order.status} 
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500 disabled:opacity-50"
                        disabled={order.status === 'cancelled'}
                      >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                      </select>
                  </div>
              </div>
          ))}
        </div>
      )}

      {tab === 'chats' && (
        <div className="p-4 space-y-3">
          {chats.map(chat => (
            <div key={chat.id} onClick={() => setActiveChat(chat)} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center cursor-pointer border border-gray-50">
              <div><h3 className="font-bold text-gray-800">{chat.studentName}</h3><p className="text-xs text-gray-500 truncate max-w-[150px]">{chat.lastMessage}</p></div>
              <span className="text-xs text-gray-400">Open</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'products' && (
        <div className="p-4 pb-24">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setIsAddingProduct(true)} className="border-2 border-dashed border-brand-300 rounded-xl flex flex-col items-center justify-center h-48 bg-brand-50 text-brand-500 hover:bg-brand-100 transition-colors"><FaPlus size={24} className="mb-2" /><span className="font-bold">Add Product</span></button>
            {products.map(p => (
              <div key={p.id} className={`bg-white rounded-xl shadow-sm overflow-hidden relative group ${p.isFrequent ? 'ring-2 ring-orange-400' : ''}`}>
                <img src={p.image} alt={p.name} className="w-full h-32 object-cover" />
                <button onClick={() => toggleFrequent(p)} className={`absolute top-2 left-2 p-1.5 rounded-full shadow-sm z-10 ${p.isFrequent ? 'bg-orange-500 text-white' : 'bg-white/80 text-gray-400 hover:text-orange-500'}`}><FaFire size={14}/></button>
                <button onClick={() => handleDeleteProduct(p.id)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><FaTrash size={12}/></button>
                <div className="p-3">
                  <h3 className="font-bold text-gray-800 truncate">{p.name}</h3>
                  <p className="text-brand-600 font-bold text-sm">₹{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {isAddingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add New Item</h3>
            <div className="space-y-3">
              <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
                {newProduct.image ? <img src={URL.createObjectURL(newProduct.image)} className="w-full h-full object-cover" alt="prev"/> : <FaCamera size={24}/>}
                <input type="file" className="absolute inset-0 opacity-0" onChange={(e) => setNewProduct({...newProduct, image: e.target.files[0]})} />
              </div>
              <input type="text" placeholder="Product Name" className="w-full p-3 bg-gray-50 rounded-xl border" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <input type="number" placeholder="Price (₹)" className="w-full p-3 bg-gray-50 rounded-xl border" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setIsAddingProduct(false)} className="flex-1 py-3 text-gray-500 font-bold">Cancel</button>
                <button onClick={handleAddProduct} disabled={uploading} className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-bold shadow-lg">{uploading ? 'Uploading...' : 'Add Item'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ShopDashboard;