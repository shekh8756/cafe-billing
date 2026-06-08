"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);

  async function loadCoupons() {
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    setCoupons(data || []);
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-5">
        Coupon Manager
      </h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">Code</th>
            <th className="border p-2">Discount</th>
            <th className="border p-2">Phone</th>
            <th className="border p-2">Expiry</th>
            <th className="border p-2">Status</th>
          </tr>
        </thead>

        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.id}>
              <td className="border p-2">
                {coupon.coupon_code}
              </td>

              <td className="border p-2">
                {coupon.discount_value}
                {coupon.discount_type === "percent"
                  ? "%"
                  : "₹"}
              </td>

              <td className="border p-2">
                {coupon.allowed_phone || "All"}
              </td>

              <td className="border p-2">
                {coupon.expiry_date}
              </td>

              <td className="border p-2">
                {coupon.active
                  ? "Active"
                  : "Disabled"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}