"use client";

import { useMemo, useState } from "react";

export default function CafeBillingApp() {
  const [products, setProducts] = useState<any[]>([
    {
      id: 1,
      name: "Chicken Burger",
      price: 120,
      type: "Non Veg",
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500",
    },
    {
      id: 2,
      name: "Cold Coffee",
      price: 80,
      type: "Veg",
      image:
        "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=500",
    },
  ]);

  const [cart, setCart] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [paymentBy, setPaymentBy] = useState("Cash");

  const [account, setAccount] = useState({
    cafe: "Zenkai Kitchen",
    address: "Barasat, West Bengal",
    phone: "9876543210",
    email: "support@zenkai.com",
    logo: "https://dummyimage.com/200x80/000/fff&text=ZENKAI",
  });

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    type: "Veg",
    image: "",
  });

  const addToCart = (product: any) => {
    const existing = cart.find((i) => i.id === product.id);

    if (existing) {
      setCart(cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const increaseQty = (id: number) => {
    setCart(cart.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  };

  const decreaseQty = (id: number) => {
    setCart(
      cart
        .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const addProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      alert("Enter product details");
      return;
    }

    setProducts([
      ...products,
      {
        id: Date.now(),
        name: newProduct.name,
        price: Number(newProduct.price),
        type: newProduct.type,
        image:
          newProduct.image ||
          "https://dummyimage.com/500x300/e5e7eb/111827&text=Product",
      },
    ]);

    setNewProduct({ name: "", price: "", type: "Veg", image: "" });
  };

  const startEdit = (product: any) => {
    setEditProduct(product);
    setNewProduct({
      name: product.name,
      price: String(product.price),
      type: product.type,
      image: product.image,
    });
  };

  const updateProduct = () => {
    if (!editProduct) return;

    setProducts(
      products.map((p) =>
        p.id === editProduct.id
          ? {
              ...p,
              name: newProduct.name,
              price: Number(newProduct.price),
              type: newProduct.type,
              image:
                newProduct.image ||
                "https://dummyimage.com/500x300/e5e7eb/111827&text=Product",
            }
          : p
      )
    );

    setCart(
      cart.map((i) =>
        i.id === editProduct.id
          ? {
              ...i,
              name: newProduct.name,
              price: Number(newProduct.price),
              type: newProduct.type,
              image: newProduct.image,
            }
          : i
      )
    );

    setEditProduct(null);
    setNewProduct({ name: "", price: "", type: "Veg", image: "" });
  };

  const deleteProduct = (id: number) => {
    if (confirm("Are you sure delete this product?")) {
      setProducts(products.filter((p) => p.id !== id));
      setCart(cart.filter((i) => i.id !== id));
    }
  };

  const cancelEdit = () => {
    setEditProduct(null);
    setNewProduct({ name: "", price: "", type: "Veg", image: "" });
  };

  const total = useMemo(() => {
    return cart.reduce((s, i) => s + i.price * i.qty, 0);
  }, [cart]);

  const tax = Math.round(total * 0.05);
  const finalTotal = total + tax;

  const saveOrder = () => {
    if (cart.length === 0) {
      alert("Please add product first");
      return;
    }

    const now = new Date();

    const newOrder = {
      id: Date.now(),
      date: now.toLocaleDateString("en-IN"),
      time: now.toLocaleTimeString("en-IN"),
      amount: finalTotal,
      paymentBy,
      items: cart,
    };

    setOrders([newOrder, ...orders]);
    setCart([]);
    alert("Order saved successfully");
  };

  const analytics = useMemo(() => {
    const today = new Date().toLocaleDateString("en-IN");
    const now = new Date();

    const todayOrders = orders.filter((o) => o.date === today);

    const weeklyOrders = orders.filter((o) => {
      const [day, month, year] = o.date.split("/");
      const orderDate = new Date(Number(year), Number(month) - 1, Number(day));
      const diff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    });

    const monthlyOrders = orders.filter((o) => {
      const [day, month, year] = o.date.split("/");
      const orderDate = new Date(Number(year), Number(month) - 1, Number(day));
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    });

    const sum = (list: any[]) => list.reduce((s, o) => s + o.amount, 0);

    const cashTotal = orders
      .filter((o) => o.paymentBy === "Cash")
      .reduce((s, o) => s + o.amount, 0);

    const upiTotal = orders
      .filter((o) => o.paymentBy === "UPI Online")
      .reduce((s, o) => s + o.amount, 0);

    const dateWise: any = {};

    orders.forEach((o) => {
      if (!dateWise[o.date]) {
        dateWise[o.date] = {
          date: o.date,
          orders: 0,
          amount: 0,
          cash: 0,
          upi: 0,
        };
      }

      dateWise[o.date].orders += 1;
      dateWise[o.date].amount += o.amount;

      if (o.paymentBy === "Cash") {
        dateWise[o.date].cash += o.amount;
      } else {
        dateWise[o.date].upi += o.amount;
      }
    });

    return {
      todaySale: sum(todayOrders),
      weeklySale: sum(weeklyOrders),
      monthlySale: sum(monthlyOrders),
      todayOrders: todayOrders.length,
      weeklyOrders: weeklyOrders.length,
      monthlyOrders: monthlyOrders.length,
      cashTotal,
      upiTotal,
      dateWise: Object.values(dateWise),
    };
  }, [orders]);

  const printBill = (size: "3inch" | "4inch") => {
    if (cart.length === 0) {
      alert("Please add product first");
      return;
    }

    const width = size === "3inch" ? "76mm" : "100mm";

    const html = `
    <html>
    <head>
      <style>
        @page { size: ${width}; margin:0 }
        body {
          width:${width};
          margin:0;
          padding:4px;
          font-family:Arial;
          background:white;
          color:black;
          font-size:12px;
        }
        .row { display:flex; justify-content:space-between; gap:6px; margin:5px 0 }
        .line { border-top:1px dashed black; margin:8px 0 }
        img { max-width:110px; max-height:55px; object-fit:contain }
        h2 { margin:4px 0; font-size:18px; }
        p { margin:2px 0; }
        * { color:black !important }
      </style>
    </head>

    <body>
      <center>
        <img src="${account.logo}" />
        <h2>${account.cafe}</h2>
        <p>${account.address}</p>
        <p>${account.phone}</p>
        <p>${account.email}</p>
      </center>

      <div class="line"></div>

      ${cart
        .map(
          (i) => `
        <div class="row">
          <span>${i.name} x${i.qty}</span>
          <span>₹${i.qty * i.price}</span>
        </div>
      `
        )
        .join("")}

      <div class="line"></div>

      <div class="row"><span>Subtotal</span><span>₹${total}</span></div>
      <div class="row"><span>GST</span><span>₹${tax}</span></div>
      <div class="row"><b>Total</b><b>₹${finalTotal}</b></div>
      <div class="row"><b>Payment</b><b>${paymentBy}</b></div>

      <div class="line"></div>
      <center>Thank You</center>

      <script>window.print()</script>
    </body>
    </html>
    `;

    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return alert("Popup allow karo");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-5 text-black">
      <h1 className="text-3xl font-bold mb-5 text-black">Zenkai Kitchen</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-xl text-black border border-gray-200">
          <h2 className="text-lg font-bold mb-3 text-black">Account</h2>

          <input className="w-full mb-2 p-2 border rounded text-black" placeholder="Cafe Name" value={account.cafe} onChange={(e) => setAccount({ ...account, cafe: e.target.value })} />
          <input className="w-full mb-2 p-2 border rounded text-black" placeholder="Address" value={account.address} onChange={(e) => setAccount({ ...account, address: e.target.value })} />
          <input className="w-full mb-2 p-2 border rounded text-black" placeholder="Phone" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
          <input className="w-full mb-2 p-2 border rounded text-black" placeholder="Email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
          <input className="w-full mb-2 p-2 border rounded text-black" placeholder="Logo URL" value={account.logo} onChange={(e) => setAccount({ ...account, logo: e.target.value })} />

          <h2 className="text-lg font-bold mt-5 mb-3 text-black">
            {editProduct ? "Edit Product" : "Add Product"}
          </h2>

          <input className="w-full mb-2 p-2 border rounded text-black" placeholder="Product Name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
          <input className="w-full mb-2 p-2 border rounded text-black" placeholder="Price" type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />

          <select className="w-full mb-2 p-2 border rounded text-black" value={newProduct.type} onChange={(e) => setNewProduct({ ...newProduct, type: e.target.value })}>
            <option>Veg</option>
            <option>Non Veg</option>
          </select>

          <input className="w-full mb-2 p-2 border rounded text-black" placeholder="Image URL" value={newProduct.image} onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })} />

          <button
            onClick={editProduct ? updateProduct : addProduct}
            className="w-full bg-black text-white p-2 rounded mt-2"
          >
            {editProduct ? "Update Product" : "Add Product"}
          </button>

          {editProduct && (
            <button
              onClick={cancelEdit}
              className="w-full bg-gray-500 text-white p-2 rounded mt-2"
            >
              Cancel Edit
            </button>
          )}

          <h2 className="text-lg font-bold mt-6 mb-3 text-black">Product Manage</h2>

          <div className="max-h-64 overflow-auto">
            {products.map((p) => (
              <div key={p.id} className="border rounded p-2 mb-2 text-black">
                <div className="font-bold text-sm text-black">{p.name}</div>
                <div className="text-sm text-black">₹{p.price} - {p.type}</div>

                <div className="flex gap-2 mt-2">
                  <button onClick={() => startEdit(p)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                    Edit
                  </button>

                  <button onClick={() => deleteProduct(p.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-bold mt-6 mb-3 text-black">Analytics</h2>

          <div className="text-sm space-y-2 text-black">
            <div className="border rounded p-2">Today Sale: ₹{analytics.todaySale}</div>
            <div className="border rounded p-2">Weekly Sale: ₹{analytics.weeklySale}</div>
            <div className="border rounded p-2">Monthly Sale: ₹{analytics.monthlySale}</div>
            <div className="border rounded p-2">Today Orders: {analytics.todayOrders}</div>
            <div className="border rounded p-2">Weekly Orders: {analytics.weeklyOrders}</div>
            <div className="border rounded p-2">Monthly Orders: {analytics.monthlyOrders}</div>
            <div className="border rounded p-2">Cash Total: ₹{analytics.cashTotal}</div>
            <div className="border rounded p-2">UPI Online Total: ₹{analytics.upiTotal}</div>
          </div>

          <h2 className="text-lg font-bold mt-6 mb-3 text-black">Date By Date</h2>

          <div className="max-h-52 overflow-auto text-sm text-black">
            {analytics.dateWise.length === 0 && (
              <p className="text-gray-500">No sales yet</p>
            )}

            {analytics.dateWise.map((d: any) => (
              <div key={d.date} className="border rounded p-2 mb-2">
                <div className="font-bold">{d.date}</div>
                <div>Orders: {d.orders}</div>
                <div>Total: ₹{d.amount}</div>
                <div>Cash: ₹{d.cash}</div>
                <div>UPI: ₹{d.upi}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-3 text-black">Menu</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-xl shadow">
                <img src={p.image} className="h-32 w-full object-cover rounded-lg" />

                <h3 className="font-bold mt-2 text-black">{p.name}</h3>
                <p className="text-black">₹{p.price}</p>

                <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${p.type === "Veg" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {p.type}
                </span>

                <br />

                <button onClick={() => addToCart(p)} className="bg-blue-600 text-white px-4 py-2 mt-2 rounded">
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow text-black">
          <h2 className="text-xl font-bold mb-3 text-black">Bill</h2>

          {cart.length === 0 && (
            <p className="text-gray-500 text-sm">No item added</p>
          )}

          {cart.map((i) => (
            <div key={i.id} className="mb-3 text-black">
              <div className="flex justify-between mb-1">
                <span>{i.name} x{i.qty}</span>
                <span>₹{i.qty * i.price}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => increaseQty(i.id)} className="bg-blue-600 text-white px-3 py-1 rounded">
                  +
                </button>

                <button onClick={() => decreaseQty(i.id)} className="bg-red-600 text-white px-3 py-1 rounded">
                  -
                </button>
              </div>
            </div>
          ))}

          <hr className="my-2" />

          <div className="flex justify-between text-black">
            <span>Subtotal</span>
            <span>₹{total}</span>
          </div>

          <div className="flex justify-between text-black">
            <span>GST</span>
            <span>₹{tax}</span>
          </div>

          <div className="flex justify-between text-black font-bold text-lg">
            <span>Total</span>
            <span>₹{finalTotal}</span>
          </div>

          <div className="mt-4">
            <label className="block text-black font-bold mb-2">Payment By</label>
            <select
              className="w-full p-2 border rounded text-black"
              value={paymentBy}
              onChange={(e) => setPaymentBy(e.target.value)}
            >
              <option>Cash</option>
              <option>UPI Online</option>
            </select>
          </div>

          <button onClick={saveOrder} className="w-full bg-black text-white p-3 rounded mt-4">
            Save Order
          </button>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button onClick={() => printBill("3inch")} className="bg-green-600 text-white p-3 rounded">
              3 Inch Print
            </button>

            <button onClick={() => printBill("4inch")} className="bg-blue-600 text-white p-3 rounded">
              4 Inch Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}