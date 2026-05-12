"use client";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

export default function CafeBillingApp() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [restaurantTables, setRestaurantTables] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const lastCustomerOrderCountRef = useRef(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [customerOrderItems, setCustomerOrderItems] = useState<any[]>([]);
const [expenses, setExpenses] = useState<any[]>([]);
const [closingReports, setClosingReports] = useState<any[]>([]);

const [expenseForm, setExpenseForm] = useState({
  title: "",
  amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  note: "",
});

const [closingNote, setClosingNote] = useState("");
  const [tab, setTab] = useState("billing");
  const [paymentBy, setPaymentBy] = useState("Cash");
  const [loading, setLoading] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [itemHistoryPage, setItemHistoryPage] = useState(1);
  const itemHistoryPerPage = 10;

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
    upi_id: "",
    upi_qr_image: "",
  });

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    type: "Veg",
    image: "",
  });

  const [newTableName, setNewTableName] = useState("");
  const [customerCart, setCustomerCart] = useState<any[]>([]);
  const [qrForm, setQrForm] = useState({
    customer_name: "",
    customer_phone: "",
    transaction_id: "",
  });

  const [customerTableSlug, setCustomerTableSlug] = useState("");
  const [customerTable, setCustomerTable] = useState<any>(null);
const [selectedCustomerOrderId, setSelectedCustomerOrderId] = useState("");
const [selectedProductIdForOrder, setSelectedProductIdForOrder] = useState("");
const [extraPaymentNote, setExtraPaymentNote] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableSlug = params.get("table");

    if (tableSlug) {
      setCustomerTableSlug(tableSlug);
      loadCustomerPage(tableSlug);
      return;
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });
    return () => {
    subscription.unsubscribe();
    };
    }, []); 
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tableSlug = params.get("table");

  if (tableSlug) {
    setCustomerTableSlug(tableSlug);
    loadCustomerPage(tableSlug);
    return;
  }

  checkUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    checkUser();
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  if (!user) return;
  if (customerTableSlug) return;

  const interval = setInterval(() => {
    loadData(profile?.role === "admin");
  }, 5000);

  return () => {
    clearInterval(interval);
  };
}, [user, profile, soundEnabled, customerTableSlug]);

  async function loadCustomerPage(tableSlug: string) {
    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: settingsData } = await supabase
      .from("cafe_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const { data: tableData } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("qr_slug", tableSlug)
      .single();

    setProducts(productsData || []);
    setCustomerTable(tableData || null);

    if (settingsData) {
      setSettings({
        cafe_name: settingsData.cafe_name || "Zenkai Kitchen",
        address: settingsData.address || "",
        phone: settingsData.phone || "",
        email: settingsData.email || "",
        logo: settingsData.logo || "",
        gst_number: settingsData.gst_number || "",
        gst_enabled: settingsData.gst_enabled ?? true,
        upi_id: settingsData.upi_id || "",
        upi_qr_image: settingsData.upi_qr_image || "",
      });
    }
  }

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

    const { data: tablesData } = await supabase
      .from("restaurant_tables")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: customerOrdersData } = await supabase
      .from("customer_orders")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: customerOrderItemsData } = await supabase
      .from("customer_order_items")
      .select("*")
      .order("created_at", { ascending: false });
const { data: expensesData } = await supabase
  .from("expenses")
  .select("*")
  .order("expense_date", { ascending: false });

const { data: closingReportsData } = await supabase
  .from("daily_closing_reports")
  .select("*")
  .order("closing_date", { ascending: false });

    const { data: settingsData } = await supabase
      .from("cafe_settings")
      .select("*")
      .eq("id", 1)
      .single();

    setProducts(productsData || []);
    setOrders(ordersData || []);
    setOrderItems(itemsData || []);
    setRestaurantTables(tablesData || []);
    const newOrders = customerOrdersData || [];

if (
  soundEnabled &&
  lastCustomerOrderCountRef.current > 0 &&
  newOrders.length > lastCustomerOrderCountRef.current
) {
  const audio = new Audio(
    "https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3"
  );

  audio.play();
}

lastCustomerOrderCountRef.current = newOrders.length;

setCustomerOrders(newOrders);
    setCustomerOrderItems(customerOrderItemsData || []);
setExpenses(expensesData || []);
setClosingReports(closingReportsData || []);
    if (settingsData) {
      setSettings({
        cafe_name: settingsData.cafe_name || "Zenkai Kitchen",
        address: settingsData.address || "",
        phone: settingsData.phone || "",
        email: settingsData.email || "",
        logo: settingsData.logo || "",
        gst_number: settingsData.gst_number || "",
        gst_enabled: settingsData.gst_enabled ?? true,
        upi_id: settingsData.upi_id || "",
        upi_qr_image: settingsData.upi_qr_image || "",
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
        upi_id: settings.upi_id,
        upi_qr_image: settings.upi_qr_image,
      })
      .eq("id", 1);

    if (error) return alert(error.message);

    alert("Cafe details saved");
    loadData(true);
  }
async function addExpense() {
  if (!expenseForm.title.trim()) return alert("Expense title daalo");
  if (!expenseForm.amount) return alert("Expense amount daalo");

  const { error } = await supabase.from("expenses").insert({
    title: expenseForm.title,
    amount: Number(expenseForm.amount),
    expense_date: expenseForm.expense_date,
    note: expenseForm.note,
  });

  if (error) return alert(error.message);

  setExpenseForm({
    title: "",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  alert("Expense saved");
  loadData(true);
}

async function saveDailyClosingReport() {
  const today = new Date().toISOString().slice(0, 10);

  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toISOString().slice(0, 10) === today
  );

  const cashSale = todayOrders
    .filter((o) => String(o.payment_by || "").toLowerCase().includes("cash"))
    .reduce((s, o) => s + Number(o.total || 0), 0);

  const upiSale = todayOrders
    .filter((o) => String(o.payment_by || "").toLowerCase().includes("upi"))
    .reduce((s, o) => s + Number(o.total || 0), 0);

  const totalSale = cashSale + upiSale;

  const todayExpenses = expenses.filter(
    (e) => String(e.expense_date) === today
  );

  const totalExpense = todayExpenses.reduce(
    (s, e) => s + Number(e.amount || 0),
    0
  );

  const netProfit = totalSale - totalExpense;

  const { error } = await supabase.from("daily_closing_reports").upsert({
    closing_date: today,
    cash_sale: cashSale,
    upi_sale: upiSale,
    total_sale: totalSale,
    total_expense: totalExpense,
    net_profit: netProfit,
    note: closingNote,
    created_by: user?.email,
  });

  if (error) return alert(error.message);

  setClosingNote("");
  alert("Daily closing report saved");
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

  function addToCustomerCart(product: any) {
    const found = customerCart.find((i) => i.id === product.id);

    if (found) {
      setCustomerCart(
        customerCart.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      );
    } else {
      setCustomerCart([...customerCart, { ...product, qty: 1 }]);
    }
  }

  function increaseCustomerQty(id: string) {
    setCustomerCart(customerCart.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  }

  function decreaseCustomerQty(id: string) {
    setCustomerCart(
      customerCart
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

  const customerSubtotal = useMemo(
    () => customerCart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0),
    [customerCart]
  );

  const customerTax = settings.gst_enabled ? Math.round(customerSubtotal * 0.05) : 0;
  const customerTotal = customerSubtotal + customerTax;

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

  async function createRestaurantTable() {
    if (!newTableName.trim()) return alert("Table Please Enter Your Name");

    const slug = newTableName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") + "-" + Date.now().toString().slice(-5);

    const { error } = await supabase.from("restaurant_tables").insert({
      table_name: newTableName.trim(),
      qr_slug: slug,
    });

    if (error) return alert(error.message);

    setNewTableName("");
    alert("Table QR created");
    loadData(true);
  }

  function getCustomerOrderUrl(table: any) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}?table=${table.qr_slug}`;
  }

  function getQrImageUrl(table: any) {
    const url = getCustomerOrderUrl(table);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
  }
async function payWithRazorpay() {
  try {
    if (!(window as any).Razorpay) {
      return alert("Razorpay load nahi hua");
    }

    if (!customerTotal || customerTotal <= 0) {
      return alert("Invalid total");
    }

    const res = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: customerTotal,
      }),
    });

    const order = await res.json();

    if (!order.id) {
      return alert(order.error || "Order create failed");
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,

      amount: order.amount,

      currency: "INR",

      name: "Zenkai Kitchen",

      description: "Customer Food Order",

      order_id: order.id,

      handler: async function (response: any) {
        const verifyRes = await fetch(
          "/api/razorpay/verify-payment",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(response),
          }
        );

        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
          return alert("Payment verification failed");
        }

       await submitCustomerOrder(response.razorpay_payment_id); 
      },

      prefill: {
        name: qrForm.customer_name || "",
        contact: qrForm.customer_phone || "",
      },

      theme: {
        color: "#000000",
      },
    };

    const razorpay = new (window as any).Razorpay(
      options
    );

    razorpay.open();
  } catch (error: any) {
    alert(error.message || "Razorpay failed");
  }
}
  async function submitCustomerOrder(razorpayPaymentId?: string) {
    if (!customerTable) return alert("Table not found");
    if (customerCart.length === 0) return alert("Pehle item add karo");
    if (!razorpayPaymentId && !qrForm.transaction_id.trim()) {
  return alert("Payment transaction ID daalo");
}

    setLoading(true);
let razorpayCustomerPhone = "";
let razorpayCustomerEmail = "";

if (razorpayPaymentId) {
  try {
    const paymentRes = await fetch("/api/razorpay/payment-details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_id: razorpayPaymentId,
      }),
    });

    const paymentData = await paymentRes.json();

    razorpayCustomerPhone = paymentData.contact || "";
    razorpayCustomerEmail = paymentData.email || "";
  } catch (e) {
    console.log("Payment detail fetch failed");
  }
}
    const { data: order, error: orderError } = await supabase
      .from("customer_orders")
      .insert({
        table_id: customerTable.id,
        table_name: customerTable.table_name,
        customer_name: razorpayCustomerEmail || "Razorpay Customer",
        customer_phone: razorpayCustomerPhone,
        payment_status: razorpayPaymentId ? "verified" : "pending_verification",
        order_status: razorpayPaymentId ? "paid" : "pending",
        payment_method: razorpayPaymentId ? "Razorpay" : "UPI",
        transaction_id: razorpayPaymentId || "",
        subtotal: customerSubtotal,
        tax: customerTax,
        total: customerTotal,
        original_paid_amount: customerTotal,
        extra_due: 0,
        extra_payment_note: "",
      })
      .select()
      .single();

    if (orderError) {
      setLoading(false);
      return alert(orderError.message);
    }

    const items = customerCart.map((item) => ({
      customer_order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      price: Number(item.price),
      qty: item.qty,
      total: Number(item.price) * item.qty,
    }));

    const { error: itemsError } = await supabase
      .from("customer_order_items")
      .insert(items);

    setLoading(false);

    if (itemsError) return alert(itemsError.message);

    setCustomerCart([]);
    setQrForm({ customer_name: "", customer_phone: "", transaction_id: "" });
    alert("Payment successful. Order submitted.");
  }

  async function updateCustomerOrderStatus(
  order: any,
  paymentStatus: string,
  orderStatus: string
) {
  if (order.locked || order.order_status === "completed" || order.order_status === "cancelled") {
    return alert("Ye order already locked hai. Ab isme change nahi ho sakta.");
  }

  if (orderStatus === "cancelled") {
    const ok = confirm("Are you sure? Is customer order ko reject/cancel karna hai?");
    if (!ok) return;
  }

  const updateData: any = {
    payment_status: paymentStatus,
    order_status: orderStatus,
  };

  if (orderStatus === "accepted") {
  updateData.locked = false;
  updateData.accepted_by = user?.email;
  updateData.accepted_at = new Date().toISOString();
  updateData.edit_until = new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

  if (orderStatus === "cancelled") {
    updateData.locked = true;
    updateData.rejected_by = user?.email;
    updateData.rejected_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("customer_orders")
    .update(updateData)
    .eq("id", order.id);

  if (error) return alert(error.message);

  alert("Order updated");
  loadData(profile?.role === "admin");
}
function canEditCustomerOrder(order: any) {
  if (!isAdmin) return false;
  if (order.order_status === "completed" || order.order_status === "cancelled") return false;
  if (order.locked) return false;

  const editUntil = order.edit_until
    ? new Date(order.edit_until).getTime()
    : new Date(order.created_at).getTime() + 10 * 60 * 1000;

  return Date.now() <= editUntil;
}

function editTimeText(order: any) {
  if (order.locked) return "Locked";

  const editUntil = order.edit_until
    ? new Date(order.edit_until).getTime()
    : new Date(order.created_at).getTime() + 10 * 60 * 1000;

  const left = Math.max(0, editUntil - Date.now());
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);

  if (left <= 0) return "Edit time over";

  return `${minutes}m ${seconds}s left`;
}
async function updateCustomerOrderItemQty(order: any, item: any, newQty: number) {
  if (isStaff && newQty < Number(item.qty)) {
  return alert("Staff item remove ya decrease nahi kar sakta");
}
  if (!canEditCustomerOrder(order)) {
    return alert("Edit time over ho gaya ya order locked hai");
  }

  if (newQty <= 0) {
    const { error } = await supabase
      .from("customer_order_items")
      .delete()
      .eq("id", item.id);

    if (error) return alert(error.message);
  } else {
    const { error } = await supabase
      .from("customer_order_items")
      .update({
        qty: newQty,
        total: Number(item.price) * newQty,
      })
      .eq("id", item.id);

    if (error) return alert(error.message);
  }

  await recalculateCustomerOrderTotal(order.id);
  loadData(profile?.role === "admin");
}
async function addProductToCustomerOrder(order: any) {
  if (!selectedProductIdForOrder) {
    return alert("Product select karo");
  }

  if (order.order_status === "completed" || order.order_status === "cancelled") {
    return alert("Completed ya cancelled order me product add nahi ho sakta");
  }

  if (order.locked) {
    return alert("Locked order me product add nahi ho sakta");
  }

  const product = products.find((p) => p.id === selectedProductIdForOrder);

  if (!product) return alert("Product nahi mila");

  const existingItem = customerOrderItems.find(
    (item) =>
      item.customer_order_id === order.id &&
      item.product_id === product.id
  );

  if (existingItem) {
    await updateCustomerOrderItemQty(
      order,
      existingItem,
      Number(existingItem.qty) + 1
    );
  } else {
    const { error } = await supabase
      .from("customer_order_items")
      .insert({
        customer_order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        price: Number(product.price),
        qty: 1,
        total: Number(product.price),
      });

    if (error) return alert(error.message);

    await recalculateCustomerOrderTotal(order.id);
    loadData(profile?.role === "admin");
  }

  setSelectedProductIdForOrder("");
  alert("Product added to customer order");
}
async function recalculateCustomerOrderTotal(customerOrderId: string) {
  const { data: items, error } = await supabase
    .from("customer_order_items")
    .select("*")
    .eq("customer_order_id", customerOrderId);

  if (error) return alert(error.message);

  const subtotal = (items || []).reduce(
    (s, item) => s + Number(item.total || 0),
    0
  );

  const tax = settings.gst_enabled ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + tax;
const { data: currentOrder } = await supabase
  .from("customer_orders")
  .select("*")
  .eq("id", customerOrderId)
  .single();

const originalPaid = Number(currentOrder?.original_paid_amount || 0);

const extraDue = Math.max(0, total - originalPaid);
  const { error: updateError } = await supabase
    .from("customer_orders")
  .update({
  subtotal,
  tax,
  total,
  extra_due: extraDue,
  last_edited_by: user?.email,
  last_edited_at: new Date().toISOString(),
})
    .eq("id", customerOrderId);

  if (updateError) return alert(updateError.message);
}
  async function convertCustomerOrderToBill(customerOrder: any) {
  const items = customerOrderItems.filter(
    (item) => item.customer_order_id === customerOrder.id
  );
const { data: freshOrder } = await supabase
  .from("customer_orders")
  .select("*")
  .eq("id", customerOrder.id)
  .single();

if (freshOrder?.pos_order_id) {
  const billItems = customerOrderItems.filter(
    (item) => item.customer_order_id === customerOrder.id
  );

  openPrintWindow(
    billHtml({
      billNo: String(freshOrder.pos_order_id).slice(0, 8).toUpperCase(),
      date: new Date(freshOrder.created_at).toLocaleString("en-IN"),
      payment: "UPI Online",
      items: billItems,
      billSubtotal: freshOrder.subtotal,
      billTax: freshOrder.tax,
      billTotal: freshOrder.total,
    })
  );

  return;
}

if (freshOrder?.order_status === "completed" && !freshOrder?.pos_order_id) {
  return alert("Ye order already completed hai. Duplicate save prevent kiya gaya.");
}
  if (items.length === 0) return alert("Customer order items nahi mile");

  // Already POS bill created: only reprint, no duplicate save
  if (customerOrder.pos_order_id) {
    const oldOrder = orders.find((o) => o.id === customerOrder.pos_order_id);

    openPrintWindow(
      billHtml({
        billNo: String(customerOrder.pos_order_id).slice(0, 8).toUpperCase(),
        date: oldOrder?.created_at
          ? new Date(oldOrder.created_at).toLocaleString("en-IN")
          : new Date(customerOrder.created_at).toLocaleString("en-IN"),
        payment: "UPI Online",
        items,
        billSubtotal: customerOrder.subtotal,
        billTax: customerOrder.tax,
        billTotal: customerOrder.total,
      })
    );

    return;
  }

  if (customerOrder.order_status === "cancelled") {
    return alert("Rejected order ko bill me convert nahi kar sakte");
  }

  setLoading(true);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      subtotal: Number(customerOrder.subtotal || 0),
      tax: Number(customerOrder.tax || 0),
      total: Number(customerOrder.total || 0),
      payment_by: "UPI Online",
      user_id: user?.id,
      user_email: user?.email,
    })
    .select()
    .single();

  if (orderError) {
    setLoading(false);
    return alert(orderError.message);
  }

  const posItems = items.map((item) => ({
    order_id: order.id,
    product_name: item.product_name,
    price: Number(item.price),
    qty: Number(item.qty),
    total: Number(item.total),
  }));

  const { error: itemError } = await supabase
    .from("order_items")
    .insert(posItems);

  if (itemError) {
    setLoading(false);
    return alert(itemError.message);
  }

const { error: updateOrderError } = await supabase
  .from("customer_orders")
  .update({
    payment_status: "verified",
    order_status: "completed",
    locked: true,
    pos_order_id: order.id,
    accepted_by: user?.email,
    accepted_at: new Date().toISOString(),
  })
  .eq("id", customerOrder.id);

if (updateOrderError) {
  setLoading(false);
  return alert(updateOrderError.message);
}

  setLoading(false);

  openPrintWindow(
    billHtml({
      billNo: order.id.slice(0, 8).toUpperCase(),
      date: new Date().toLocaleString("en-IN"),
      payment: "UPI Online",
      items: posItems,
      billSubtotal: customerOrder.subtotal,
      billTax: customerOrder.tax,
      billTotal: customerOrder.total,
    })
  );

  alert("Customer order POS bill me convert ho gaya");
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
        item.total || Number(item.price) * Number(item.qty)
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

  const analytics: any = useMemo(() => {
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
        itemMap[item.product_name] = { name: item.product_name, qty: 0, total: 0 };
      }
      itemMap[item.product_name].qty += Number(item.qty || 0);
      itemMap[item.product_name].total += Number(item.total || 0);
    });

    const filteredTotal = sum(filteredOrders);
    const filteredTax = filteredOrders.reduce((s, o) => s + Number(o.tax || 0), 0);

    const filteredOrderIds = new Set(filteredOrders.map((o) => o.id));

    const itemSalesRows = orderItems
      .map((item) => {
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
          order_id: item.order_id,
        };
      })
      .filter((row) => filteredOrderIds.has(row.order_id));

    const reportItemMap: any = {};
    itemSalesRows.forEach((item) => {
      if (!reportItemMap[item.item]) {
        reportItemMap[item.item] = { name: item.item, qty: 0, total: 0 };
      }
      reportItemMap[item.item].qty += Number(item.qty || 0);
      reportItemMap[item.item].total += Number(item.total || 0);
    });

    const cashTotal = filteredOrders
      .filter((o) => String(o.payment_by || "").toLowerCase().includes("cash"))
      .reduce((s, o) => s + Number(o.total || 0), 0);

    const upiTotal = filteredOrders
      .filter((o) => String(o.payment_by || "").toLowerCase().includes("upi"))
      .reduce((s, o) => s + Number(o.total || 0), 0);

    const userDetails = profiles
      .filter((p) => p.role !== "admin")
      .map((staff) => {
        const staffOrders = filteredOrders.filter((o) => o.user_id === staff.id || o.user_email === staff.email);
        const staffItems = itemSalesRows.filter((row) => row.staff === staff.email);
        return {
          ...staff,
          name: staff.full_name || staff.email,
          orderCount: staffOrders.length,
          itemQty: staffItems.reduce((s, i) => s + Number(i.qty || 0), 0),
          today: sum(staffOrders.filter((o) => isToday(o.created_at))),
          yesterday: sum(staffOrders.filter((o) => isYesterday(o.created_at))),
          week: sum(staffOrders.filter((o) => isLast7Days(o.created_at))),
          month: sum(staffOrders.filter((o) => isThisMonth(o.created_at))),
          year: sum(staffOrders.filter((o) => isThisYear(o.created_at))),
          total: sum(staffOrders),
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
      reportItemWise: Object.values(reportItemMap),
      cashTotal,
      upiTotal,

      totalExpense: expenses.reduce(
  (s, e) => s + Number(e.amount || 0),
  0
),

filteredExpense: expenses
  .filter((e) => {
    if (!fromDate && !toDate) return true;

    const d = new Date(e.expense_date);

    if (fromDate && d < new Date(fromDate)) return false;
    if (toDate && d > new Date(toDate)) return false;

    return true;
  })
  .reduce((s, e) => s + Number(e.amount || 0), 0),

userDetails,
    };
  }, [orders, orderItems, filteredOrders, profiles, expenses, fromDate, toDate]);

if (customerTableSlug) {
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="min-h-screen bg-gray-100 p-5 text-black">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white p-5 rounded-xl shadow mb-5 text-center">
            {settings.logo && <img src={settings.logo} className="h-20 mx-auto object-contain mb-2" alt="logo" />}
            <h1 className="text-3xl font-bold">{settings.cafe_name || "Zenkai Kitchen"}</h1>
            <p>{settings.address}</p>
            <p className="font-bold mt-2">{customerTable?.table_name || "Table"} QR Order</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-3">Menu</h2>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                {products.map((p) => {
                  const productType = String(p.type || "").toLowerCase().trim();
                  const isVeg = productType === "veg";

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl shadow border ${isVeg ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}
                    >
                      <img src={p.image} className="h-32 w-full object-cover rounded" alt={p.name} />
                      <h3 className="font-bold mt-2">{p.name}</h3>
                      <p className="font-bold">₹{p.price}</p>
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-1 ${isVeg ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                        {isVeg ? "Veg" : "Non Veg"}
                      </span>
                      <div className="mt-3">
  {customerCart.find((i) => i.id === p.id) ? (
    <div className="flex items-center gap-2">
      <button
        onClick={() => decreaseCustomerQty(p.id)}
        className="bg-red-600 text-white w-9 h-9 rounded-full text-lg font-bold"
      >
        -
      </button>

      <div className="bg-black text-white px-4 py-2 rounded font-bold">
        {customerCart.find((i) => i.id === p.id)?.qty}
      </div>

      <button
        onClick={() => increaseCustomerQty(p.id)}
        className="bg-green-600 text-white w-9 h-9 rounded-full text-lg font-bold"
      >
        +
      </button>

      <span className="text-green-700 font-bold text-sm">
        Added ✓
      </span>
    </div>
  ) : (
    <button
      onClick={() => addToCustomerCart(p)}
      className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold w-full"
    >
      Add to Cart
    </button>
  )}
</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow h-fit xl:sticky xl:top-5">
              <h2 className="text-xl font-bold mb-3">Your Order</h2>

              {customerCart.length === 0 && <p className="text-gray-500">No item added</p>}

              {customerCart.map((item) => (
                <div key={item.id} className="border-b py-2">
                  <div className="flex justify-between">
                    <span>{item.name} x {item.qty}</span>
                    <span>₹{Number(item.price) * item.qty}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => increaseCustomerQty(item.id)} className="bg-blue-600 text-white px-3 py-1 rounded">+</button>
                    <button onClick={() => decreaseCustomerQty(item.id)} className="bg-red-600 text-white px-3 py-1 rounded">-</button>
                  </div>
                </div>
              ))}

              <div className="mt-4 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{customerSubtotal}</span></div>
                {settings.gst_enabled && <div className="flex justify-between"><span>GST</span><span>₹{customerTax}</span></div>}
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>₹{customerTotal}</span></div>
              </div>

                <button
                  disabled={loading}
                  onClick={payWithRazorpay}
                  className="w-full bg-black text-white p-3 rounded mt-4"
                >
                  {loading ? "Please wait..." : `Pay Now ₹${customerTotal}`}
                </button>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
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
const isStaff = profile?.role === "staff";
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
            onClick={() => setTab("records")}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Previous Records
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

        {(isAdmin || profile?.role === "staff") && (
          <button
            onClick={() => setTab("qr-orders")}
            className="bg-orange-600 text-white px-4 py-2 rounded"
          >
            QR Orders
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

              <input
                className="border p-2 rounded"
                placeholder="UPI ID"
                value={settings.upi_id}
                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
              />

              <input
                className="border p-2 rounded"
                placeholder="UPI QR Image URL"
                value={settings.upi_qr_image}
                onChange={(e) => setSettings({ ...settings, upi_qr_image: e.target.value })}
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

      {tab === "qr-orders" && (isAdmin || profile?.role === "staff") && (
        <div>
          <div className="flex justify-between items-center mb-4">
  <h2 className="text-2xl font-bold">QR Orders</h2>

  <button
    onClick={() => setSoundEnabled(!soundEnabled)}
    className={`px-4 py-2 rounded text-white ${
      soundEnabled ? "bg-green-600" : "bg-gray-600"
    }`}
  >
    {soundEnabled ? "Sound ON" : "Enable Sound"}
  </button>
</div>

          {isAdmin && (
            <div className="bg-white p-5 rounded-xl shadow mb-5">
              <h3 className="text-xl font-bold mb-3">Create Table QR</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  className="border p-2 rounded"
                  placeholder="Table 1 / Cabin 1"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                />
                <button onClick={createRestaurantTable} className="bg-black text-white px-4 py-2 rounded">
                  Create QR
                </button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {restaurantTables.map((table) => (
                <div key={table.id} className="bg-white p-4 rounded-xl shadow text-center">
                  <h3 className="font-bold text-lg">{table.table_name}</h3>
                  <img src={getQrImageUrl(table)} className="mx-auto my-3 border rounded" alt="QR" />
                  <p className="text-xs break-all">{getCustomerOrderUrl(table)}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(getCustomerOrderUrl(table))}
                    className="bg-blue-600 text-white px-3 py-1 rounded mt-2"
                  >
                    Copy Link
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mb-3">
  <h3 className="text-xl font-bold">Incoming Customer Orders</h3>

  <button
    onClick={() => loadData(profile?.role === "admin")}
    className="bg-black text-white px-4 py-2 rounded"
  >
    Refresh Orders
  </button>
</div>
          <div className="bg-white rounded-xl shadow overflow-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Table</th>
                  <th className="p-2 border">Customer</th>
                  <th className="p-2 border">Txn ID</th>
                  <th className="p-2 border">Payment</th>
                  <th className="p-2 border">Order</th>
                  <th className="p-2 border">Paid</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Due</th>
                  <th className="p-2 border">Items</th>
                  <th className="p-2 border">Add Product</th>
                  <th className="p-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {customerOrders.map((order) => {
                  const items = customerOrderItems.filter((i) => i.customer_order_id === order.id);

                  return (
                    <tr key={order.id}>
                      <td className="p-2 border">{new Date(order.created_at).toLocaleString("en-IN")}</td>
                      <td className="p-2 border">{order.table_name}</td>
                      <td className="p-2 border">
                        <div className="font-bold">{order.customer_name}</div>
                        <div className="text-xs">{order.customer_phone}</div>
                      </td>
                      <td className="p-2 border">{order.transaction_id}</td>
                      <td className="p-2 border">{order.payment_status}</td>
                      <td className="p-2 border">{order.order_status}</td>
                      <td className="p-2 border">₹{order.original_paid_amount || 0}</td>
                      <td className="p-2 border font-bold">₹{order.total}</td>
                      <td className="p-2 border font-bold text-red-600">₹{order.extra_due || 0}</td>
                      <td className="p-2 border">
  <div className="text-xs font-bold mb-2 text-blue-700">
    {editTimeText(order)}
  </div>

  {items.map((item) => (
    <div key={item.id} className="text-sm mb-2 border-b pb-1">
      <div>
        {item.product_name} x {item.qty} = ₹{item.total}
      </div>

      {(canEditCustomerOrder(order) || isStaff) &&
  order.order_status !== "completed" &&
  order.order_status !== "cancelled" &&
  !order.locked && (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() =>
              updateCustomerOrderItemQty(
                order,
                item,
                Number(item.qty) - 1
              )
            }
            className="bg-red-600 text-white px-2 rounded"
          >
            -
          </button>

          <button
            onClick={() =>
              updateCustomerOrderItemQty(
                order,
                item,
                Number(item.qty) + 1
              )
            }
            className="bg-green-600 text-white px-2 rounded"
          >
            +
          </button>

          <button
            onClick={() =>
              updateCustomerOrderItemQty(order, item, 0)
            }
            className="bg-gray-700 text-white px-2 rounded"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  ))}
</td>
<td className="p-2 border">
  {!order.locked &&
    order.order_status !== "completed" &&
    order.order_status !== "cancelled" && (
      <>
        <select
          className="border p-2 rounded w-full mb-2"
          value={
            selectedCustomerOrderId === order.id
              ? selectedProductIdForOrder
              : ""
          }
          onChange={(e) => {
            setSelectedCustomerOrderId(order.id);
            setSelectedProductIdForOrder(e.target.value);
          }}
        >
          <option value="">Select Product</option>

          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} - ₹{p.price}
            </option>
          ))}
        </select>

        <button
          onClick={() => addProductToCustomerOrder(order)}
          className="bg-orange-600 text-white px-3 py-1 rounded w-full"
        >
          Add Product
        </button>
      </>
    )}

  {order.locked && (
    <div className="text-xs font-bold text-gray-500">
      Locked
    </div>
  )}
</td>
<td className="p-2 border">
  {!order.locked &&
    order.order_status !== "completed" &&
    order.order_status !== "cancelled" && (
      <>
        <button
          onClick={() =>
            updateCustomerOrderStatus(
              order,
              "verified",
              "accepted"
            )
          }
          className="bg-green-600 text-white px-3 py-1 rounded mr-2 mb-1"
        >
          Accept
        </button>

{isAdmin && (
  <button
    onClick={() =>
      updateCustomerOrderStatus(
        order,
        "rejected",
        "cancelled"
      )
    }
    className="bg-red-600 text-white px-3 py-1 rounded mb-1"
  >
    Reject
  </button>
)}
      </>
    )}

  {(order.order_status === "accepted" ||
    order.order_status === "completed") && (
    <button
      onClick={() => convertCustomerOrderToBill(order)}
      className="bg-blue-600 text-white px-3 py-1 rounded mr-2 mb-1"
    >
      {order.pos_order_id ? "Reprint Bill" : "Save & Print"}
    </button>
  )}

{order.locked && (
  <div className="text-xs font-bold text-gray-600 mt-1">
    Locked
  </div>
)}

{!order.locked &&
  order.order_status === "accepted" && (
    <div className="text-xs font-bold text-green-700 mt-1">
      Editable for 10 minutes
    </div>
)}
</td>
                    </tr>
                  );
                })}
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
    Total Expense
    <br />
    <b>₹{analytics.totalExpense}</b>
  </div>

  <div className="bg-white p-5 rounded-xl shadow">
    Filtered Expense
    <br />
    <b>₹{analytics.filteredExpense}</b>
  </div>

  <div className="bg-white p-5 rounded-xl shadow">
    Net Profit
    <br />
    <b>
      ₹
      {analytics.filteredTotal -
        analytics.filteredExpense}
    </b>
  </div>

  <div className="bg-white p-5 rounded-xl shadow">
    Total Sales
    <br />
    <b>₹{analytics.filteredTotal}</b>
  </div>
</div>

<div className="bg-white p-5 rounded-xl shadow mb-6">
  <h3 className="text-xl font-bold mb-3">
    Add Expense
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
    <input
      className="border p-2 rounded"
      placeholder="Expense Title"
      value={expenseForm.title}
      onChange={(e) =>
        setExpenseForm({
          ...expenseForm,
          title: e.target.value,
        })
      }
    />

    <input
      type="number"
      className="border p-2 rounded"
      placeholder="Amount"
      value={expenseForm.amount}
      onChange={(e) =>
        setExpenseForm({
          ...expenseForm,
          amount: e.target.value,
        })
      }
    />

    <input
      type="date"
      className="border p-2 rounded"
      value={expenseForm.expense_date}
      onChange={(e) =>
        setExpenseForm({
          ...expenseForm,
          expense_date: e.target.value,
        })
      }
    />

    <input
      className="border p-2 rounded"
      placeholder="Note"
      value={expenseForm.note}
      onChange={(e) =>
        setExpenseForm({
          ...expenseForm,
          note: e.target.value,
        })
      }
    />
  </div>

  <button
    onClick={addExpense}
    className="bg-red-600 text-white px-5 py-2 rounded mt-4"
  >
    Save Expense
  </button>
</div>

<div className="bg-white p-5 rounded-xl shadow mb-6">
  <h3 className="text-xl font-bold mb-3">
    Daily Closing Report
  </h3>

  <textarea
    className="w-full border p-3 rounded"
    placeholder="Closing note..."
    value={closingNote}
    onChange={(e) =>
      setClosingNote(e.target.value)
    }
  />

  <button
    onClick={saveDailyClosingReport}
    className="bg-black text-white px-5 py-2 rounded mt-4"
  >
    Save Daily Closing
  </button>
</div>
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

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl shadow">
              Total Staff
              <br />
              <b>{analytics.userDetails.length}</b>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              Filtered Orders
              <br />
              <b>{analytics.filteredCount}</b>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              Total Items Sold
              <br />
              <b>{analytics.itemSalesRows.reduce((s: number, i: any) => s + Number(i.qty || 0), 0)}</b>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              Cash Sale
              <br />
              <b>₹{analytics.cashTotal}</b>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              UPI Sale
              <br />
              <b>₹{analytics.upiTotal}</b>
            </div>
            <div className="bg-white p-5 rounded-xl shadow">
              Filtered Total
              <br />
              <b>₹{analytics.filteredTotal}</b>
            </div>
          </div>
<h3 className="text-xl font-bold mb-3">Customer Database</h3>

<div className="bg-white rounded-xl shadow overflow-auto mb-6">
  <table className="w-full border">
    <thead>
      <tr className="bg-gray-200">
        <th className="p-2 border">Customer</th>
        <th className="p-2 border">Phone</th>
        <th className="p-2 border">Total Orders</th>
        <th className="p-2 border">Total Spending</th>
        <th className="p-2 border">Items Ordered</th>
        <th className="p-2 border">Last Order</th>
      </tr>
    </thead>

    <tbody>
      {Object.values(
        customerOrders.reduce((acc: any, order: any) => {
          const key =
            order.customer_phone ||
            order.customer_name ||
            order.id;

          if (!acc[key]) {
            acc[key] = {
              name: order.customer_name || "-",
              phone: order.customer_phone || "-",
              orders: 0,
              spending: 0,
              lastOrder: order.created_at,
            };
          }

          acc[key].orders += 1;
          acc[key].spending += Number(order.total || 0);

          if (
            new Date(order.created_at) >
            new Date(acc[key].lastOrder)
          ) {
            acc[key].lastOrder = order.created_at;
          }

          return acc;
        }, {})
      ).map((c: any) => (
        <tr key={c.phone + c.name}>
          <td className="p-2 border font-bold">{c.name}</td>
          <td className="p-2 border">{c.phone}</td>
          <td className="p-2 border">{c.orders}</td>
          <td className="p-2 border font-bold">₹{c.spending}</td>
          <td className="p-2 border">
  {customerOrders
    .filter(
      (order: any) =>
        (order.customer_phone || order.customer_name || order.id) ===
        (c.phone !== "-" ? c.phone : c.name)
    )
    .map((order: any) => {
      const items = customerOrderItems.filter(
        (item: any) => item.customer_order_id === order.id
      );

      return (
        <div key={order.id} className="mb-2 border-b pb-1">
          <div className="font-bold text-xs">
            {new Date(order.created_at).toLocaleString("en-IN")}
          </div>

          {items.map((item: any) => (
            <div key={item.id} className="text-xs">
              {item.product_name} x {item.qty} = ₹{item.total}
            </div>
          ))}
        </div>
      );
    })}
</td>
          <td className="p-2 border">
            {new Date(c.lastOrder).toLocaleString("en-IN")}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
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
                  <th className="p-2 border">Today</th>
                  <th className="p-2 border">Week</th>
                  <th className="p-2 border">Month</th>
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
                    <td className="p-2 border">₹{u.today}</td>
                    <td className="p-2 border">₹{u.week}</td>
                    <td className="p-2 border">₹{u.month}</td>
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
                {analytics.reportItemWise.map((item: any) => (
                  <tr key={item.name}>
                    <td className="p-2 border">{item.name}</td>
                    <td className="p-2 border">{item.qty}</td>
                    <td className="p-2 border font-bold">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center p-4">
  <button
    disabled={itemHistoryPage === 1}
    onClick={() => setItemHistoryPage(itemHistoryPage - 1)}
    className="bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50"
  >
    Previous
  </button>

  <span className="font-bold">
    Page {itemHistoryPage} of{" "}
    {Math.ceil(
      analytics.itemSalesRows.length / itemHistoryPerPage
    ) || 1}
  </span>

  <button
    disabled={
      itemHistoryPage >=
      Math.ceil(
        analytics.itemSalesRows.length / itemHistoryPerPage
      )
    }
    onClick={() => setItemHistoryPage(itemHistoryPage + 1)}
    className="bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50"
  >
    Next
  </button>
</div>
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
  {analytics.itemSalesRows
    .slice(
      (itemHistoryPage - 1) * itemHistoryPerPage,
      itemHistoryPage * itemHistoryPerPage
    )
    .map((row: any) => (
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

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
              Cash Sale
              <br />
              <b>₹{analytics.cashTotal}</b>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
              UPI Sale
              <br />
              <b>₹{analytics.upiTotal}</b>
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
