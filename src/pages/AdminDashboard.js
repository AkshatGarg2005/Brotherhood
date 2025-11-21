import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { FaCheckCircle, FaArrowRight, FaPaperPlane, FaTrash } from 'react-icons/fa';

const AdminDashboard = () => {
  const [tab, setTab] = useState('shops'); 
  const [shops, setShops] = useState([]);
  const [globalFeatured, setGlobalFeatured] = useState([]);
  const [selectedShopForItems, setSelectedShopForItems] = useState(null);
  const [shopProducts, setShopProducts] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const scrollRef = useRef();

  useEffect(() => {
    const unsubShops = onSnapshot(query(collection(db, "users"), where("role", "==", "shop")), (snap) => {
      setShops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubFeatured = onSnapshot(collection(db, "global_featured"), (snap) => {
      setGlobalFeatured(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // FIX: Removed orderBy("lastUpdated") to prevent Index Errors.
    // We fetch all support chats and sort them in Javascript below.
    const unsubComplaints = onSnapshot(query(collection(db, "chats"), where("isSupport", "==", true)), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in JS instead of Firestore
      data.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
      setComplaints(data);
    });

    return () => { unsubShops(); unsubFeatured(); unsubComplaints(); };
  }, []);

  useEffect(() => {
    if (!selectedShopForItems) return;
    const unsub = onSnapshot(query(collection(db, "products"), where("shopId", "==", selectedShopForItems.id)), (snap) => {
      setShopProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [selectedShopForItems]);

  useEffect(() => {
    if (!activeComplaint) return;
    const unsub = onSnapshot(query(collection(db, "chats", activeComplaint.id, "messages"), orderBy("createdAt", "asc")), (snap) => {
      setMessages(snap.docs.map(d => d.data()));
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return unsub;
  }, [activeComplaint]);

  const toggleBlacklist = async (shop) => {
    if(window.confirm(`${shop.blacklisted ? "Unban" : "Ban"} this shop?`)) {
      await updateDoc(doc(db, "users", shop.id), { blacklisted: !shop.blacklisted });
    }
  };

  const toggleVerification = async (shop) => {
    await updateDoc(doc(db, "users", shop.id), { verified: !shop.verified });
  };

  const promoteItem = async (product) => {
    if(!selectedShopForItems) return;
    await addDoc(collection(db, "global_featured"), {
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      productPrice: product.price,
      shopId: selectedShopForItems.id,
      shopName: selectedShopForItems.displayName,
      shopCategory: selectedShopForItems.category || "General", 
      createdAt: serverTimestamp()
    });
    alert("Item promoted!");
  };

  const removeFeatured = async (id) => { await deleteDoc(doc(db, "global_featured", id)); };

  const sendReply = async () => {
    if (!reply.trim()) return;
    await addDoc(collection(db, "chats", activeComplaint.id, "messages"), {
      text: reply, sender: auth.currentUser.uid, createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "chats", activeComplaint.id), {
      lastMessage: reply, lastUpdated: serverTimestamp() 
    });
    setReply('');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 p-6 fixed h-full z-10">
        <h1 className="text-2xl font-bold text-brand-600 mb-8">Admin</h1>
        <nav className="space-y-2">
          <button onClick={() => setTab('shops')} className={`w-full text-left p-3 rounded-xl font-medium ${tab === 'shops' ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-50'}`}>Manage Shops</button>
          <button onClick={() => setTab('marketplace')} className={`w-full text-left p-3 rounded-xl font-medium ${tab === 'marketplace' ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-50'}`}>Marketplace Items</button>
          <button onClick={() => setTab('complaints')} className={`w-full text-left p-3 rounded-xl font-medium ${tab === 'complaints' ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-50'}`}>Complaints</button>
        </nav>
      </div>

      <div className="ml-64 flex-1 p-8">
        {tab === 'shops' && (
          <div className="grid gap-4">
            {shops.map(shop => (
              <div key={shop.id} className={`p-4 rounded-xl border flex justify-between items-center ${shop.blacklisted ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <img src={shop.photoURL || "https://via.placeholder.com/40"} className="w-12 h-12 rounded-full bg-gray-200" alt="shop"/>
                  <div>
                    <h3 className="font-bold text-gray-800">{shop.displayName} {shop.blacklisted && <span className="text-red-500 text-xs">(BANNED)</span>}</h3>
                    <p className="text-sm text-gray-500">{shop.category}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleVerification(shop)} className={`px-4 py-2 rounded-lg text-sm font-bold ${shop.verified ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{shop.verified ? "Verified" : "Verify"}</button>
                  <button onClick={() => toggleBlacklist(shop)} className={`px-4 py-2 rounded-lg text-sm font-bold ${shop.blacklisted ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{shop.blacklisted ? "Unban" : "Ban"}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'marketplace' && (
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm h-96 overflow-y-auto">
              <h3 className="font-bold text-gray-500 mb-4 uppercase text-sm">Select Shop</h3>
              {shops.filter(s => !s.blacklisted).map(shop => (
                <div key={shop.id} onClick={() => setSelectedShopForItems(shop)} className={`p-3 rounded-lg cursor-pointer flex justify-between mb-2 ${selectedShopForItems?.id === shop.id ? 'bg-brand-50 border-brand-500 border' : 'bg-gray-50'}`}>
                  <span>{shop.displayName}</span><FaArrowRight className="text-gray-400"/>
                </div>
              ))}
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm h-96 overflow-y-auto">
              <h3 className="font-bold text-gray-500 mb-4 uppercase text-sm">Products</h3>
              {shopProducts.map(prod => (
                <div key={prod.id} className="flex items-center gap-3 p-2 border rounded-lg mb-2">
                  <img src={prod.image} className="w-10 h-10 rounded object-cover" alt="prod"/>
                  <div className="flex-1"><p className="font-bold text-sm">{prod.name}</p></div>
                  <button onClick={() => promoteItem(prod)} className="px-3 py-1 bg-brand-500 text-white rounded text-xs font-bold">Promote</button>
                </div>
              ))}
            </div>
            <div className="col-span-2 flex gap-4 overflow-x-auto pb-4">
                 {globalFeatured.map(item => (
                   <div key={item.id} className="min-w-[150px] bg-white p-3 rounded-xl border shadow-sm relative">
                     <button onClick={() => removeFeatured(item.id)} className="absolute top-2 right-2 text-red-500 bg-white rounded-full p-1 shadow"><FaTrash size={12}/></button>
                     <img src={item.productImage} className="w-full h-24 object-cover rounded-lg mb-2" alt="item"/>
                     <p className="font-bold text-sm truncate">{item.productName}</p>
                   </div>
                 ))}
            </div>
          </div>
        )}

        {tab === 'complaints' && (
          <div className="flex h-[600px] bg-white border rounded-2xl overflow-hidden shadow-sm">
            <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
               {complaints.length === 0 && <div className="p-4 text-gray-400">No complaints found.</div>}
               {complaints.map(chat => (
                 <div key={chat.id} onClick={() => setActiveComplaint(chat)} className={`p-4 border-b cursor-pointer ${activeComplaint?.id === chat.id ? 'bg-white border-l-4 border-l-brand-500' : ''}`}>
                   <h4 className="font-bold text-gray-800">{chat.studentName}</h4>
                   <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                 </div>
               ))}
            </div>
            <div className="flex-1 flex flex-col bg-white">
              {activeComplaint ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {messages.map((msg, idx) => (
                      <div key={idx} ref={scrollRef} className={`flex ${msg.sender === auth.currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.sender === auth.currentUser.uid ? 'bg-brand-500 text-white' : 'bg-white border shadow-sm'}`}>{msg.text}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t flex gap-2">
                    <input className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none" value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply..." onKeyPress={e => e.key === 'Enter' && sendReply()} />
                    <button onClick={sendReply} className="bg-brand-500 text-white p-3 rounded-full"><FaPaperPlane/></button>
                  </div>
                </>
              ) : <div className="flex h-full items-center justify-center text-gray-400">Select a complaint to chat</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminDashboard;