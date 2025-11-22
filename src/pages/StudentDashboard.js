import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { uploadImage } from '../utils/cloudinary';
import { FaPaperPlane, FaCamera, FaArrowLeft, FaArrowRight, FaCheckCircle, FaFire, FaHeadset, FaStore, FaShoppingBag, FaMinus, FaPlus, FaStar, FaTimes } from 'react-icons/fa';
import { useCart } from '../context/CartContext';

const StudentDashboard = () => {
  const { cart, cartShop, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();
  
  const [view, setView] = useState('list');
  const [shops, setShops] = useState([]);
  const [activeShop, setActiveShop] = useState(null);
  const [shopProducts, setShopProducts] = useState([]);
  const [globalFeatured, setGlobalFeatured] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpMessages, setHelpMessages] = useState([]);
  const scrollRef = useRef();

  const [checkoutModal, setCheckoutModal] = useState(false);
  const [userDetails, setUserDetails] = useState({ address: '', phone: '' });

  const [ratingModal, setRatingModal] = useState(null);
  const [starValue, setStarValue] = useState(5);

  const CATEGORIES = ['All', 'General Store', 'Stationery', 'Food & Snacks', 'Printing/Xerox'];

  useEffect(() => {
    const unsubShops = onSnapshot(query(collection(db, "users"), where("role", "==", "shop")), (snap) => {
      setShops(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => !s.blacklisted));
    });
    const unsubFeatured = onSnapshot(query(collection(db, "global_featured"), orderBy("createdAt", "desc")), (snap) => {
      setGlobalFeatured(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubOrders = onSnapshot(query(collection(db, "orders"), where("studentId", "==", auth.currentUser.uid), orderBy("createdAt", "desc")), (snap) => {
      setMyOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubShops(); unsubFeatured(); unsubOrders(); };
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if(snap.exists()) {
        const data = snap.data();
        setUserDetails({ address: data.address || '', phone: data.phone || '' });
      }
    }
    if(checkoutModal) fetchUser();
  }, [checkoutModal]);

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

  const openStorefront = (shop) => { setActiveShop(shop); setView('storefront'); };
  const openChat = (initialMsg = '') => { if(initialMsg) setMessage(initialMsg); setView('chat'); };
  const handleGlobalItemClick = (item) => { openStorefront({ id: item.shopId, displayName: item.shopName, category: item.shopCategory }); };

  const handleSend = async (imgUrl = null) => {
    // Ensure imgUrl is either a string or null, NOT an event object
    const validImg = (typeof imgUrl === 'string') ? imgUrl : null;
    
    if (!message.trim() && !validImg) return;
    
    const chatId = [auth.currentUser.uid, activeShop.id].sort().join("_");
    await setDoc(doc(db, "chats", chatId), {
      participants: [auth.currentUser.uid, activeShop.id], lastMessage: message || "Image", lastUpdated: serverTimestamp(), studentName: auth.currentUser.displayName
    }, { merge: true });
    
    await addDoc(collection(db, "chats", chatId, "messages"), { text: message, image: validImg, sender: auth.currentUser.uid, createdAt: serverTimestamp() });
    setMessage('');
  };

  const handleSendHelp = async () => {
    if (!helpMessage.trim()) return;
    const chatId = `support_${auth.currentUser.uid}`;
    await setDoc(doc(db, "chats", chatId), { participants: [auth.currentUser.uid], isSupport: true, lastMessage: helpMessage, lastUpdated: serverTimestamp(), studentName: auth.currentUser.displayName || "Student" }, { merge: true });
    await addDoc(collection(db, "chats", chatId, "messages"), { text: helpMessage, sender: auth.currentUser.uid, createdAt: serverTimestamp() });
    setHelpMessage('');
  };

  const handlePlaceOrder = async () => {
    if(!userDetails.address || !userDetails.phone) return alert("Address and Mobile Number are required.");
    await updateDoc(doc(db, "users", auth.currentUser.uid), { address: userDetails.address, phone: userDetails.phone });
    await addDoc(collection(db, "orders"), {
        shopId: cartShop.id, shopName: cartShop.displayName, studentId: auth.currentUser.uid, studentName: auth.currentUser.displayName,
        deliveryAddress: userDetails.address, deliveryPhone: userDetails.phone, items: cart, totalAmount: cartTotal, status: 'pending', paymentMethod: 'COD', createdAt: serverTimestamp()
    });
    clearCart(); setCheckoutModal(false); setView('orders'); alert("Order Placed Successfully!");
  };

  const handleCancelOrder = async (orderId) => {
    if(window.confirm("Are you sure you want to cancel this order?")) {
        await updateDoc(doc(db, "orders", orderId), { status: 'cancelled' });
    }
  };

  const handleSubmitRating = async () => {
    const { orderId, productId } = ratingModal;
    await addDoc(collection(db, "reviews"), { productId, studentId: auth.currentUser.uid, studentName: auth.currentUser.displayName, rating: starValue, createdAt: serverTimestamp() });
    const productRef = doc(db, "products", productId);
    const pSnap = await getDoc(productRef);
    if(pSnap.exists()) {
        const pData = pSnap.data();
        const currentCount = pData.ratingCount || 0;
        const currentAvg = pData.rating || 0;
        const newCount = currentCount + 1;
        const newAvg = ((currentAvg * currentCount) + starValue) / newCount;
        await updateDoc(productRef, { rating: newAvg, ratingCount: newCount });
    }
    setRatingModal(null); alert("Thanks for your rating!");
  };

  // --- VIEW: CART ---
  if (view === 'cart') {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col">
         <div className="p-4 border-b flex items-center gap-3 bg-white">
            <button onClick={() => setView('list')}><FaArrowLeft /></button>
            <h1 className="font-bold text-lg">My Cart</h1>
         </div>
         {cart.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                 <FaShoppingBag size={40} className="mb-4 opacity-20"/>
                 <p>Your cart is empty</p>
                 <button onClick={() => setView('list')} className="mt-4 text-brand-600 font-bold text-sm">Start Shopping</button>
             </div>
         ) : (
             <>
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                 <div className="bg-brand-50 p-3 rounded-lg text-brand-700 text-xs font-bold">Ordering from: {cartShop?.displayName}</div>
                 {cart.map(item => (
                     <div key={item.id} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                         <img src={item.image} className="w-16 h-16 rounded-lg object-cover bg-gray-100" alt=""/>
                         <div className="flex-1">
                             <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                             <p className="text-brand-600 text-xs font-bold">₹{item.price * item.quantity}</p>
                         </div>
                         <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                             <button onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)} className="p-1 text-gray-600"><FaMinus size={10}/></button>
                             <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                             <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-gray-600"><FaPlus size={10}/></button>
                         </div>
                     </div>
                 ))}
             </div>
             <div className="p-4 border-t bg-white pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                 <div className="flex justify-between items-center mb-4">
                     <span className="text-gray-500 font-medium">Total</span>
                     <span className="text-2xl font-bold text-gray-900">₹{cartTotal}</span>
                 </div>
                 <button onClick={() => setCheckoutModal(true)} className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-brand-200 active:scale-95 transition-transform">
                     Checkout (COD)
                 </button>
             </div>
             </>
         )}
         
         {checkoutModal && (
             <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
                 <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
                     <h2 className="text-xl font-bold mb-4">Confirm Details</h2>
                     <div className="space-y-4 mb-6">
                         <div>
                             <label className="text-xs font-bold text-gray-500 uppercase">Delivery Address</label>
                             <textarea value={userDetails.address} onChange={e => setUserDetails({...userDetails, address: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 h-20 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Hostel, Room No..."/>
                         </div>
                         <div>
                             <label className="text-xs font-bold text-gray-500 uppercase">Mobile Number</label>
                             <input type="tel" value={userDetails.phone} onChange={e => setUserDetails({...userDetails, phone: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="+91..."/>
                         </div>
                     </div>
                     <div className="flex gap-3">
                         <button onClick={() => setCheckoutModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100">Cancel</button>
                         <button onClick={handlePlaceOrder} className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-600">Place Order</button>
                     </div>
                 </div>
             </div>
         )}
      </div>
    );
  }

  // --- VIEW: LIST ---
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 pb-2">
          <div className="flex justify-between items-center px-4 py-3">
             <h1 className="text-xl font-extrabold text-brand-600 tracking-tight">Brotherhood.</h1>
             <div className="flex gap-3">
                <button onClick={() => setView('orders')} className="relative p-2 text-gray-400 hover:text-brand-600"><FaStore size={20}/></button>
                <button onClick={() => setView('cart')} className="relative p-2 text-gray-400 hover:text-brand-600"><FaShoppingBag size={20}/>{cartCount > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>}</button>
                <button onClick={() => setView('help')} className="p-2 text-gray-400 hover:text-brand-600"><FaHeadset size={20}/></button>
             </div>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-1">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${filter === cat ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{cat}</button>
            ))}
          </div>
        </div>

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

        <div className="px-4 mt-2 grid gap-4">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">Shops Nearby</h3>
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
              <div className="h-8 w-8 bg-brand-50 rounded-full flex items-center justify-center text-brand-500"><FaArrowRight size={12} /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VIEW: ORDERS ---
  if (view === 'orders') {
      return (
        <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col">
            <div className="bg-white p-4 shadow-sm flex items-center gap-3">
                <button onClick={() => setView('list')}><FaArrowLeft /></button>
                <h1 className="font-bold text-lg">My Orders</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {myOrders.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-gray-800">{order.shopName}</h3>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${order.status === 'completed' ? 'bg-green-100 text-green-600' : order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{order.status}</span>
                            </div>
                            <span className="text-brand-600 font-bold">₹{order.totalAmount}</span>
                        </div>
                        <div className="space-y-2 mb-4">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-xs text-gray-500">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span>₹{item.price * item.quantity}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
                            {order.status === 'pending' && (
                                <button onClick={() => handleCancelOrder(order.id)} className="px-4 py-2 bg-red-50 text-red-500 text-xs font-bold rounded-lg">Cancel Order</button>
                            )}
                            {order.status === 'completed' && (
                                <button onClick={() => { setRatingModal({ orderId: order.id, productId: order.items[0].id, productName: order.items[0].name }); setStarValue(5); }} className="px-4 py-2 bg-brand-50 text-brand-600 text-xs font-bold rounded-lg flex items-center gap-1"><FaStar /> Rate</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {ratingModal && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center">
                        <h3 className="font-bold text-lg mb-1">Rate Product</h3>
                        <p className="text-sm text-gray-500 mb-6">{ratingModal.productName}</p>
                        <div className="flex justify-center gap-2 mb-8">
                            {[1,2,3,4,5].map(star => (
                                <button key={star} onClick={() => setStarValue(star)} className={`text-3xl transition-transform active:scale-125 ${star <= starValue ? 'text-yellow-400' : 'text-gray-200'}`}><FaStar /></button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setRatingModal(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100">Skip</button>
                            <button onClick={handleSubmitRating} className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-600">Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // --- VIEW: STOREFRONT ---
  if (view === 'storefront') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="relative h-48 bg-brand-600 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <button onClick={() => setView('list')} className="absolute top-4 left-4 p-3 bg-white/20 backdrop-blur-md text-white rounded-full z-10"><FaArrowLeft /></button>
          <div className="absolute -bottom-10 left-0 w-full h-20 bg-gray-50 rounded-t-[2.5rem]" />
          <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-center z-10 translate-y-8">
             <img src={activeShop.photoURL || "https://via.placeholder.com/80"} className="w-24 h-24 rounded-full border-4 border-gray-50 shadow-lg object-cover" alt="Shop" />
          </div>
        </div>
        <div className="text-center mt-10 px-6">
           <h2 className="text-2xl font-bold text-gray-900 flex justify-center items-center gap-2">{activeShop.displayName} {activeShop.verified && <FaCheckCircle className="text-green-500 text-lg"/>}</h2>
           <p className="text-gray-500 text-sm mb-6">{activeShop.category}</p>
           <div className="flex justify-center gap-3">
               <button onClick={() => openChat()} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform text-sm">Chat</button>
               <button onClick={() => setView('cart')} className="px-6 py-3 bg-brand-50 text-brand-600 rounded-xl font-bold shadow-sm active:scale-95 transition-transform text-sm">View Cart</button>
           </div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 mt-6">
           {shopProducts.map(product => (
             <div key={product.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 flex flex-col">
               <div className="h-36 bg-gray-100 relative cursor-pointer" onClick={() => openChat(`Interested in ${product.name}`)}>
                 <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                 {product.rating > 0 && <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-gray-800 px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-sm"><FaStar className="text-yellow-400"/> {product.rating.toFixed(1)}</div>}
                 {product.isFrequent && <div className="absolute top-2 left-2 bg-white/90 backdrop-blur text-orange-600 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"><FaFire/> HOT</div>}
               </div>
               <div className="p-3 flex-1 flex flex-col">
                 <h4 className="font-bold text-gray-800 text-sm leading-tight mb-1 truncate">{product.name}</h4>
                 <div className="flex justify-between items-center mt-auto">
                     <span className="text-brand-600 font-bold text-sm">₹{product.price}</span>
                     <button onClick={() => addToCart(product, activeShop)} className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 active:scale-90 transition-all"><FaPlus size={12}/></button>
                 </div>
               </div>
             </div>
           ))}
        </div>
      </div>
    )
  }
  
  // --- VIEW: CHAT ---
  if (view === 'chat' || view === 'help') {
    const isHelp = view === 'help';
    const chatTitle = isHelp ? "Admin Support" : activeShop?.displayName;
    const chatMessages = isHelp ? helpMessages : messages;
    const chatInput = isHelp ? helpMessage : message;
    const setChatInput = isHelp ? setHelpMessage : setMessage;
    const sendFunc = isHelp ? handleSendHelp : handleSend;

    return (
      // FIXED: Chat covers bottom nav with z-[60] and h-[100dvh]
      <div className="fixed inset-0 z-[60] bg-white flex flex-col h-[100dvh]">
        <div className="flex-none">
          <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
             <div className="flex items-center gap-3">
                 <button onClick={() => setView(isHelp ? 'list' : 'storefront')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><FaArrowLeft size={14} /></button>
                 <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">{chatTitle}</h1>
             </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          <div className="h-4"></div> 
          {chatMessages.map((msg, idx) => {
            const isMe = msg.sender === auth.currentUser.uid;
            return (
              <div key={idx} ref={scrollRef} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-3 text-sm shadow-sm ${isMe ? 'bg-brand-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm'}`}>
                  {msg.image && <img src={msg.image} alt="img" className="rounded-lg mb-2 max-h-40 w-full object-cover"/>}
                  <p>{msg.text}</p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex-none p-3 bg-white border-t border-gray-100 flex items-center gap-2 pb-safe">
           {!isHelp && (
             <label className="p-3 text-gray-400 bg-gray-50 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
                <FaCamera size={20} />
                <input type="file" className="hidden" onChange={(e) => { if(e.target.files[0]) uploadImage(e.target.files[0]).then(url => url && handleSend(url)) }} />
             </label>
           )}
           <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={isHelp ? "Describe your issue..." : "Type a message..."} className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"/>
           
           {/* FIXED: Explicitly calling sendFunc() */}
           <button onClick={() => sendFunc()} disabled={!chatInput.trim()} className="p-3 bg-brand-600 text-white rounded-full disabled:opacity-50 disabled:scale-100 active:scale-90 transition-all shadow-lg shadow-brand-200 flex items-center justify-center"><FaPaperPlane size={16}/></button>
        </div>
      </div>
    );
  }

  return null;
};

export default StudentDashboard;