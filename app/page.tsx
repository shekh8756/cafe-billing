"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

export default function CafeBillingApp() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [tab, setTab] = useState("billing");
  const [paymentBy, setPaymentBy] = useState("Cash");
  const [loading, setLoading] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const [authForm, setAuthForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const [settings, setSettings] = useState<any>({
    cafe_name: "Zenkai Kitchen",
    address: "",
    phone: "",
    email: "",
    logo: "",
    gst_number: "",
    gst_enabled: true,
  });

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    type: "Veg",
    image: "",
  });

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUser(null);
      setProfile(null);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData?.role !== "admin" && profileData?.approved !== true) {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      alert("Your account is pending admin approval. Please contact admin.");
      return;
    }

    setUser(user);
    setProfile(profileData || null);
    await loadData(profileData?.role === "admin");
  }

  async function handleAuth() {
    if (!authForm.email || !authForm.password) {
      return alert("Email aur password daalo");
    }

    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: {
          data: {
            full_name: authForm.full_name,
          },
        },
      });

      if (error) return alert(error.message);

      alert("Account created. Admin approval ke baad login chalega.");
      setAuthMode("login");
      setAuthForm({ full_name: "", email: "", password: "" });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password,
    });

    if (error) return alert(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setTab("billing");
  }

  async function loadData(loadAdminData = profile?.role === "admin") {
    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: settingsData } = await supabase
      .from("cafe_settings")
      .select("*")
      .eq("id", 1)
      .single();

    setProducts(productsData || []);
    setOrders(ordersData || []);
    setOrderItems(itemsData || []);

    if (settingsData) {
      setSettings({
        cafe_name: settingsData.cafe_name || "Zenkai Kitchen",
        address: settingsData.address || "",
        phone: settingsData.phone || "",
        email: settingsData.email || "",
        logo: settingsData.logo || "",
        gst_number: settingsData.gst_number || "",
        gst_enabled: settingsData.gst_enabled ?? true,
      });
    }

    if (loadAdminData) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      setProfiles(profilesData || []);
    }
  }

  async function updateStaffStatus(id: string, approved: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({
        approved,
        status: approved ? "approved" : "blocked",
      })
      .eq("id", id);

    if (error) return alert(error.message);
    alert(approved ? "Staff approved" : "Staff blocked");
    loadData(true);
  }

  async function makeAdmin(id: string) {
    if (!confirm("Is user ko admin banana hai?")) return;

    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin", approved: true, status: "approved" })
      .eq("id", id);

    if (error) return alert(error.message);
    alert("User is now admin");
    loadData(true);
  }

  async function saveSettings() {
    const { error } = await supabase
      .from("cafe_settings")
      .update({
        cafe_name: settings.cafe_name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        logo: settings.logo,
        gst_number: settings.gst_number,
        gst_enabled: settings.gst_enabled,
      })
      .eq("id", 1);

    if (error) return alert(error.message);

    alert("Cafe details saved");
    loadData(true);
  }

  async function addProduct() {
    if (!newProduct.name || !newProduct.price) {
      return alert("Product name aur price daalo");
    }

    const productData = {
      name: newProduct.name,
      price: Number(newProduct.price),
      type: newProduct.type,
      image:
        newProduct.image ||
        "https://dummyimage.com/500x300/e5e7eb/111827&text=Product",
    };

    if (editProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editProduct.id);

      if (error) return alert(error.message);

      setEditProduct(null);
    } else {
      const { error } = await supabase.from("products").insert(productData);

      if (error) return alert(error.message);
    }

    setNewProduct({ name: "", price: "", type: "Veg", image: "" });
    loadData(profile?.role === "admin");
  }

  function startEditProduct(product: any) {
    setEditProduct(product);
    setNewProduct({
      name: product.name,
      price: String(product.price),
      type: product.type,
      image: product.image || "",
    });
  }

  async function deleteProduct(id: string) {
    if (!confirm("Kya aap product delete karna chahte hain?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) return alert(error.message);

    setCart(cart.filter((i) => i.id !== id));
    loadData(profile?.role === "admin");
  }

  function cancelEdit() {
    setEditProduct(null);
    setNewProduct({ name: "", price: "", type: "Veg", image: "" });
  }

  function addToCart(product: any) {
    const found = cart.find((i) => i.id === product.id);

    if (found) {
      setCart(
        cart.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  }

  function increaseQty(id: string) {
    setCart(cart.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  }

  function decreaseQty(id: string) {
    setCart(
      cart
        .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  }

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0),
    [cart]
  );

  const tax = settings.gst_enabled ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + tax;

  async function saveOrder() {
    if (cart.length === 0) return alert("Pehle product add karo");

    setLoading(true);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        subtotal,
        tax,
        total,
        payment_by: paymentBy,
        user_id: user?.id,
        user_email: user?.email,
      })
      .select()
      .single();

    if (orderError) {
      setLoading(false);
      return alert(orderError.message);
    }

    const items = cart.map((item) => ({
      order_id: order.id,
      product_name: item.name,
      price: Number(item.price),
      qty: item.qty,
      total: Number(item.price) * item.qty,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(items);

    if (itemsError) {
      setLoading(false);
      return alert(itemsError.message);
    }

    printCurrentBill(order.id);
    setCart([]);
    setLoading(false);
    alert("Order saved successfully");
    loadData(profile?.role === "admin");
  }

  function billHtml({
    billNo,
    date,
    payment,
    items,
    billSubtotal,
    billTax,
    billTotal,
  }: any) {
    return `
<html>
<head>
<title>Bill</title>
<style>
@page { size: 80mm auto; margin: 0; }
body { width:80mm; margin:0; padding:10px; font-family:Arial; color:#000; background:#fff; font-size:12px; }
.center{text-align:center}
.logo{max-width:70px;max-height:70px;object-fit:contain;margin-bottom:5px}
h2{margin:4px 0;font-size:20px}
p{margin:2px 0}
.line{border-top:1px dashed #000;margin:8px 0}
table{width:100%;border-collapse:collapse}
td,th{padding:4px 0;font-size:12px}
.right{text-align:right}
.total{font-size:16px;font-weight:bold}
.thanks{margin-top:10px;font-weight:bold;text-align:center}
</style>
</head>
<body>
<div class="center">
${settings.logo ? `<img class="logo" src="${settings.logo}" />` : ""}
<h2>${settings.cafe_name || "Zenkai Kitchen"}</h2>
${settings.address ? `<p>${settings.address}</p>` : ""}
${settings.phone ? `<p>Phone: ${settings.phone}</p>` : ""}
${settings.email ? `<p>${settings.email}</p>` : ""}
${billTax > 0 && settings.gst_number ? `<p>GST: ${settings.gst_number}</p>` : ""}
</div>

<div class="line"></div>
<p><b>Bill No:</b> ${billNo}</p>
<p><b>Date:</b> ${date}</p>
<p><b>Payment:</b> ${payment}</p>
<div class="line"></div>

<table>
<thead><tr><th align="left">Item</th><th class="right">Amt</th></tr></thead>
<tbody>
${items
  .map(
    (item: any) =>
      `<tr><td>${item.name || item.product_name} x ${
        item.qty
      }</td><td class="right">₹${
        item.total || Number(item.price) * item.qty
      }</td></tr>`
  )
  .join("")}
</tbody>
</table>

<div class="line"></div>
<table>
<tr><td>Subtotal</td><td class="right">₹${billSubtotal}</td></tr>
${billTax > 0 ? `<tr><td>GST</td><td class="right">₹${billTax}</td></tr>` : ""}
<tr class="total"><td>Total</td><td class="right">₹${billTotal}</td></tr>
</table>

<div class="line"></div>
<div class="thanks">Thank You Visit Again</div>
<script>window.print();</script>
</body>
</html>`;
  }

  function openPrintWindow(html: string) {
    const billWindow = window.open("", "_blank", "width=420,height=700");

    if (!billWindow) return alert("Popup allow karo");

    billWindow.document.write(html);
    billWindow.document.close();
  }

  function printCurrentBill(orderId?: string) {
    if (cart.length === 0) {
      return alert("Bill print karne ke liye cart me item hona chahiye");
    }

    openPrintWindow(
      billHtml({
        billNo: orderId ? orderId.slice(0, 8).toUpperCase() : String(Date.now()),
        date: new Date().toLocaleString("en-IN"),
        payment: paymentBy,
        items: cart,
        billSubtotal: subtotal,
        billTax: tax,
        billTotal: total,
      })
    );
  }

  async function reprintOldBill(order: any) {
    const { data: items, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (error) return alert(error.message);
    if (!items || items.length === 0) return alert("Is order ke items nahi mile");

    openPrintWindow(
      billHtml({
        billNo: order.id.slice(0, 8).toUpperCase(),
        date: new Date(order.created_at).toLocaleString("en-IN"),
        payment: order.payment_by,
        items,
        billSubtotal: order.subtotal,
        billTax: order.tax,
        billTotal: order.total,
      })
    );
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!fromDate && !toDate) return true;

      const orderDate = new Date(o.created_at);

      if (fromDate) {
        const from = new Date(fromDate);
        if (orderDate < from) return false;
      }

      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (orderDate > to) return false;
      }

      return true;
    });
  }, [orders, fromDate, toDate]);

  const analytics = useMemo(() => {
    const now = new Date();

    const isToday = (date: string) =>
      new Date(date).toDateString() === now.toDateString();

    const isYesterday = (date: string) => {
      const d = new Date(date);
      const y = new Date();
      y.setDate(now.getDate() - 1);
      return d.toDateString() === y.toDateString();
    };

    const isLast7Days = (date: string) =>
      (now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24) <= 7;

    const isThisMonth = (date: string) => {
      const d = new Date(date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const isThisYear = (date: string) => {
      const d = new Date(date);
      return d.getFullYear() === now.getFullYear();
    };

    const sum = (list: any[]) =>
      list.reduce((s, o) => s + Number(o.total || 0), 0);

    const todayOrders = orders.filter((o) => isToday(o.created_at));
    const yesterdayOrders = orders.filter((o) => isYesterday(o.created_at));
    const weekOrders = orders.filter((o) => isLast7Days(o.created_at));
    const monthOrders = orders.filter((o) => isThisMonth(o.created_at));
    const yearOrders = orders.filter((o) => isThisYear(o.created_at));

    const itemMap: any = {};

    orderItems.forEach((item) => {
      if (!itemMap[item.product_name]) {
        itemMap[item.product_name] = {
          name: item.product_name,
          qty: 0,
          total: 0,
        };
      }

      itemMap[item.product_name].qty += Number(item.qty);
      itemMap[item.product_name].total += Number(item.total);
    });

    const filteredTotal = sum(filteredOrders);
    const filteredTax = filteredOrders.reduce((s, o) => s + Number(o.tax || 0), 0);


    const itemSalesRows = orderItems.map((item) => {
      const order = orders.find((o) => o.id === item.order_id);
      return {
        id: item.id,
        item: item.product_name,
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
        total: Number(item.total || 0),
        date: order?.created_at || item.created_at,
        payment: order?.payment_by || "-",
        staff: order?.user_email || "-",
      };
    });

    const userDetails = profiles
      .filter((p) => p.role !== "admin")
      .map((staff) => {
        const staffOrders = orders.filter((o) => o.user_id === staff.id || o.user_email === staff.email);
        const staffItems = itemSalesRows.filter((row) => row.staff === staff.email);
        return {
          ...staff,
          orderCount: staffOrders.length,
          itemQty: staffItems.reduce((s, i) => s + Number(i.qty || 0), 0),
          totalSale: sum(staffOrders),
        };
      });

    return {
      todaySale: sum(todayOrders),
      yesterdaySale: sum(yesterdayOrders),
      weekSale: sum(weekOrders),
      monthSale: sum(monthOrders),
      yearSale: sum(yearOrders),
      totalSale: sum(orders),
      filteredTotal,
      filteredTax,
      filteredCount: filteredOrders.length,
      itemWise: Object.values(itemMap),
      staffSales: userDetails,
      itemSalesRows,
      userDetails,
    };
  }, [orders, orderItems, filteredOrders, profiles]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-5 text-black">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center">
            {settings.cafe_name || "Zenkai Kitchen"} POS
          </h1>

          {authMode === "signup" && (
            <input
              className="w-full border p-3 rounded mb-3"
              placeholder="Full Name"
              value={authForm.full_name}
              onChange={(e) =>
                setAuthForm({ ...authForm, full_name: e.target.value })
              }
            />
          )}

          <input
            className="w-full border p-3 rounded mb-3"
            placeholder="Email"
            type="email"
            value={authForm.email}
            onChange={(e) =>
              setAuthForm({ ...authForm, email: e.target.value })
            }
          />

          <input
            className="w-full border p-3 rounded mb-4"
            placeholder="Password"
            type="password"
            value={authForm.password}
            onChange={(e) =>
              setAuthForm({ ...authForm, password: e.target.value })
            }
          />

          <button
            onClick={handleAuth}
            className="w-full bg-black text-white p-3 rounded"
          >
            {authMode === "login" ? "Login" : "Create Account"}
          </button>

          <button
            onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            className="w-full mt-3 text-blue-600"
          >
            {authMode === "login"
              ? "Create new staff account"
              : "Already have account? Login"}
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-100 p-5 text-black">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold">
          {settings.cafe_name || "Zenkai Kitchen"} POS
        </h1>

        <div className="flex gap-3 items-center">
          <div className="text-right">
            <div className="font-bold">{profile?.full_name || user.email}</div>
            <div className="text-sm text-gray-600">{profile?.role || "staff"}</div>
          </div>

          <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded">
            Logout
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <button
          onClick={() => setTab("billing")}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Billing
        </button>

        {isAdmin && (
          <button
            onClick={() => setTab("admin")}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Admin Dashboard
          </button>
        )}


        {isAdmin && (
  <button
    onClick={() => setTab("reports")}
    className="bg-purple-600 text-white px-4 py-2 rounded"
  >
    Reports
  </button>
)}
      </div>

      {tab === "billing" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {isAdmin && (
            <div className="bg-white p-5 rounded-xl shadow">
              <h2 className="text-xl font-bold mb-3">
                {editProduct ? "Edit Product" : "Add Product"}
              </h2>

              <input
                className="w-full border p-2 mb-2 rounded"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
              />

              <input
                className="w-full border p-2 mb-2 rounded"
                placeholder="Price"
                type="number"
                value={newProduct.price}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, price: e.target.value })
                }
              />

              <select
                className="w-full border p-2 mb-2 rounded"
                value={newProduct.type}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, type: e.target.value })
                }
              >
                <option>Veg</option>
                <option>Non Veg</option>
              </select>

              <input
                className="w-full border p-2 mb-2 rounded"
                placeholder="Image URL"
                value={newProduct.image}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, image: e.target.value })
                }
              />

              <button onClick={addProduct} className="w-full bg-black text-white p-2 rounded">
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
            </div>
          )}

          <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
            <h2 className="text-xl font-bold mb-3">Menu</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((p) => {
                const productType = String(p.type || "").toLowerCase().trim();
                const isVeg = productType === "veg";

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl shadow border transition ${
                      isVeg
                        ? "bg-green-50 border-green-300"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    <img
                      src={p.image}
                      className="h-32 w-full object-cover rounded"
                      alt={p.name}
                    />

                    <h3 className="font-bold mt-2">{p.name}</h3>

                    <p className={isVeg ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                      ₹{p.price}
                    </p>

                    <span
                      className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-1 ${
                        isVeg
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {isVeg ? "Veg" : "Non Veg"}
                    </span>

                    <br />

                    <button
                      onClick={() => addToCart(p)}
                      className="bg-blue-600 text-white px-4 py-2 mt-2 rounded"
                    >
                      Add
                    </button>

                    {isAdmin && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => startEditProduct(p)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-3">Bill</h2>

            {cart.length === 0 && <p className="text-gray-500 text-sm">No item added</p>}

            {cart.map((item) => (
              <div key={item.id} className="border-b py-2">
                <div className="flex justify-between">
                  <span>{item.name} x {item.qty}</span>
                  <span>₹{Number(item.price) * item.qty}</span>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => increaseQty(item.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    +
                  </button>

                  <button
                    onClick={() => decreaseQty(item.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    -
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-4 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>

              {settings.gst_enabled && (
                <div className="flex justify-between">
                  <span>GST</span>
                  <span>₹{tax}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>

            <select
              className="w-full border p-2 mt-4 rounded"
              value={paymentBy}
              onChange={(e) => setPaymentBy(e.target.value)}
            >
              <option>Cash</option>
              <option>UPI Online</option>
            </select>

            <button
              disabled={loading}
              onClick={saveOrder}
              className="w-full bg-black text-white p-3 rounded mt-4"
            >
              {loading ? "Saving..." : "Save Order & Print"}
            </button>
          </div>
        </div>
      )}

      {tab === "admin" && isAdmin && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>

          <div className="bg-white p-5 rounded-xl shadow mb-5">
            <h3 className="text-xl font-bold mb-4">Cafe Account Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border p-2 rounded"
                placeholder="Cafe Name"
                value={settings.cafe_name}
                onChange={(e) =>
                  setSettings({ ...settings, cafe_name: e.target.value })
                }
              />

              <input
                className="border p-2 rounded"
                placeholder="Phone Number"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />

              <input
                className="border p-2 rounded"
                placeholder="Email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />

              <input
                className="border p-2 rounded"
                placeholder="GST Number"
                value={settings.gst_number}
                onChange={(e) =>
                  setSettings({ ...settings, gst_number: e.target.value })
                }
              />

              <input
                className="border p-2 rounded md:col-span-2"
                placeholder="Address"
                value={settings.address}
                onChange={(e) =>
                  setSettings({ ...settings, address: e.target.value })
                }
              />

              <input
                className="border p-2 rounded md:col-span-2"
                placeholder="Logo URL"
                value={settings.logo}
                onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
              />

              <label className="flex items-center gap-2 font-bold md:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.gst_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, gst_enabled: e.target.checked })
                  }
                />
                Enable GST for all bills
              </label>
            </div>

            <button
              onClick={saveSettings}
              className="bg-black text-white px-5 py-2 rounded mt-4"
            >
              Save Cafe Details
            </button>
          </div>

          <h3 className="text-xl font-bold mb-3">Staff Approval & User-wise Sales</h3>
          <div className="bg-white rounded-xl shadow overflow-auto mb-6">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Staff</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Today</th>
                  <th className="p-2 border">Yesterday</th>
                  <th className="p-2 border">Week</th>
                  <th className="p-2 border">Month</th>
                  <th className="p-2 border">Year</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {analytics.staffSales.map((staff: any) => (
                  <tr key={staff.id}>
                    <td className="p-2 border">
                      <div className="font-bold">{staff.name}</div>
                      <div className="text-xs text-gray-600">{staff.email}</div>
                    </td>
                    <td className="p-2 border">{staff.approved ? "Approved" : staff.status || "Pending"}</td>
                    <td className="p-2 border">₹{staff.today}</td>
                    <td className="p-2 border">₹{staff.yesterday}</td>
                    <td className="p-2 border">₹{staff.week}</td>
                    <td className="p-2 border">₹{staff.month}</td>
                    <td className="p-2 border">₹{staff.year}</td>
                    <td className="p-2 border font-bold">₹{staff.total}</td>
                    <td className="p-2 border">
                      {!staff.approved && (
                        <button
                          onClick={() => updateStaffStatus(staff.id, true)}
                          className="bg-green-600 text-white px-3 py-1 rounded mr-2 mb-1"
                        >
                          Approve
                        </button>
                      )}
                      {staff.approved && (
                        <button
                          onClick={() => updateStaffStatus(staff.id, false)}
                          className="bg-red-600 text-white px-3 py-1 rounded mr-2 mb-1"
                        >
                          Block
                        </button>
                      )}
                      <button
                        onClick={() => makeAdmin(staff.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded mb-1"
                      >
                        Make Admin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl shadow">
              Today Sale
              <br />
              <b>₹{analytics.todaySale}</b>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              Yesterday Sale
              <br />
              <b>₹{analytics.yesterdaySale}</b>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              Last 7 Days
              <br />
              <b>₹{analytics.weekSale}</b>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              This Month
              <br />
              <b>₹{analytics.monthSale}</b>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              This Year
              <br />
              <b>₹{analytics.yearSale}</b>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-3">Item-wise Sales Report</h3>

          <div className="bg-white rounded-xl shadow overflow-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Item</th>
                  <th className="p-2 border">Qty Sold</th>
                  <th className="p-2 border">Total Sale</th>
                </tr>
              </thead>

              <tbody>
                {analytics.itemWise.map((item: any) => (
                  <tr key={item.name}>
                    <td className="p-2 border">{item.name}</td>
                    <td className="p-2 border">{item.qty}</td>
                    <td className="p-2 border">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "reports" && isAdmin && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Reports</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl shadow">
              Total Staff
              <br />
              <b>{analytics.userDetails.length}</b>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              Total Orders
              <br />
              <b>{orders.length}</b>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              Total Items Sold
              <br />
              <b>{analytics.itemSalesRows.reduce((s: number, i: any) => s + Number(i.qty || 0), 0)}</b>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              Total Sale
              <br />
              <b>₹{analytics.totalSale}</b>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-3">User Details & User-wise Sales</h3>
          <div className="bg-white rounded-xl shadow overflow-auto mb-6">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">User</th>
                  <th className="p-2 border">Email</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Orders</th>
                  <th className="p-2 border">Items Sold</th>
                  <th className="p-2 border">Total Sale</th>
                </tr>
              </thead>
              <tbody>
                {analytics.userDetails.map((u: any) => (
                  <tr key={u.id}>
                    <td className="p-2 border font-bold">{u.full_name || u.email}</td>
                    <td className="p-2 border">{u.email}</td>
                    <td className="p-2 border">{u.approved ? "Approved" : u.status || "Pending"}</td>
                    <td className="p-2 border">{u.orderCount}</td>
                    <td className="p-2 border">{u.itemQty}</td>
                    <td className="p-2 border font-bold">₹{u.totalSale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-bold mb-3">Item-wise Sales Report</h3>
          <div className="bg-white rounded-xl shadow overflow-auto mb-6">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Item</th>
                  <th className="p-2 border">Total Qty Sold</th>
                  <th className="p-2 border">Total Sale</th>
                </tr>
              </thead>
              <tbody>
                {analytics.itemWise.map((item: any) => (
                  <tr key={item.name}>
                    <td className="p-2 border">{item.name}</td>
                    <td className="p-2 border">{item.qty}</td>
                    <td className="p-2 border font-bold">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-bold mb-3">Item Sale History: Kab, Kisne, Kitna Becha</h3>
          <div className="bg-white rounded-xl shadow overflow-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Date / Time</th>
                  <th className="p-2 border">Item</th>
                  <th className="p-2 border">Qty</th>
                  <th className="p-2 border">Price</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Staff</th>
                  <th className="p-2 border">Payment</th>
                </tr>
              </thead>
              <tbody>
                {analytics.itemSalesRows.map((row: any) => (
                  <tr key={row.id}>
                    <td className="p-2 border">{new Date(row.date).toLocaleString("en-IN")}</td>
                    <td className="p-2 border font-bold">{row.item}</td>
                    <td className="p-2 border">{row.qty}</td>
                    <td className="p-2 border">₹{row.price}</td>
                    <td className="p-2 border font-bold">₹{row.total}</td>
                    <td className="p-2 border">{row.staff}</td>
                    <td className="p-2 border">{row.payment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        {tab === "records" && isAdmin && (
  <div>
    <h2 className="text-2xl font-bold mb-4">Previous Orders</h2>

          <div className="bg-white p-4 rounded-xl shadow mb-4 flex flex-wrap gap-3">
            <div>
              <label className="text-sm font-bold">From Date</label>
              <input
                type="date"
                className="border p-2 rounded block"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-bold">To Date</label>
              <input
                type="date"
                className="border p-2 rounded block"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Clear Filter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-xl shadow">
              Filtered Orders
              <br />
              <b>{analytics.filteredCount}</b>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
              Filtered GST
              <br />
              <b>₹{analytics.filteredTax}</b>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
              Filtered Total
              <br />
              <b>₹{analytics.filteredTotal}</b>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Staff</th>
                  <th className="p-2 border">Payment</th>
                  <th className="p-2 border">Subtotal</th>
                  <th className="p-2 border">GST</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="p-2 border">
                      {new Date(o.created_at).toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 border">{o.user_email || "-"}</td>
                    <td className="p-2 border">{o.payment_by}</td>
                    <td className="p-2 border">₹{o.subtotal}</td>
                    <td className="p-2 border">₹{o.tax}</td>
                    <td className="p-2 border font-bold">₹{o.total}</td>
                    <td className="p-2 border">
                      <button
                        onClick={() => reprintOldBill(o)}
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Reprint
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
