"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag, Trash2, Plus, Minus, ArrowRight,
  Tag, X, RefreshCw, ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from "@/lib/constants";
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/motion";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotalPrice } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    description?: string;
  } | null>(null);

  const subtotal = getTotalPrice();
  const discount = appliedCoupon?.discountAmount || 0;
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 15000;
  const total = subtotal - discount + shippingCost;
  const freeShippingLeft = FREE_SHIPPING_THRESHOLD - subtotal;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAppliedCoupon({
        code: data.coupon.code,
        discountAmount: data.discountAmount,
        description: data.coupon.description,
      });
      toast.success(`Kupon ${data.coupon.code} berhasil dipakai!`);
    } catch (err: any) {
      toast.error(err.message || "Kupon tidak valid");
    } finally {
      setCouponLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <ShoppingCart className="h-14 w-14 text-slate-300 dark:text-slate-600" />
        </div>
        <div className="text-center">
          <h2 className="font-heading text-xl font-bold text-slate-800 dark:text-white">
            Keranjang kamu kosong
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Yuk, temukan produk impianmu!
          </p>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          <ShoppingBag className="h-4 w-4" />
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Keranjang Belanja" }]} />

        <div className="mt-5 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
            Keranjang Belanja
          </h1>
          <button
            onClick={() => {
              if (confirm("Kosongkan semua keranjang?")) clearCart();
            }}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Kosongkan
          </button>
        </div>

        {/* Free shipping progress */}
        {freeShippingLeft > 0 && (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-700 dark:text-emerald-400">
                🚚 Tambah{" "}
                <strong>{formatCurrency(freeShippingLeft)}</strong> lagi untuk
                gratis ongkir!
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%`,
                }}
              />
            </div>
          </motion.div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <motion.ul
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={item.id}
                    variants={staggerItem}
                    layout
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Image */}
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {item.name}
                          </p>
                          {item.variant && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.variant.name}: {item.variant.value}
                            </p>
                          )}
                          <p className="mt-1 text-sm font-medium text-emerald-600">
                            {formatCurrency(item.price)} / item
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Quantity */}
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-1 py-1 dark:border-slate-700">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            {item.quantity <= 1 ? (
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            ) : (
                              <Minus className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-slate-800 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <p className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>

            {/* Continue shopping */}
            <Link
              href="/products"
              className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              ← Lanjut Belanja
            </Link>
          </div>

          {/* Order Summary */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
              Ringkasan Order
            </h2>

            {/* Coupon Input */}
            <div className="mt-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Tag className="h-4 w-4" />
                Kode Kupon
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {appliedCoupon.code}
                    </p>
                    <p className="text-xs text-emerald-600">
                      Hemat {formatCurrency(appliedCoupon.discountAmount)}
                    </p>
                  </div>
                  <button
                    onClick={() => setAppliedCoupon(null)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode..."
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {couponLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Pakai"
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Diskon Kupon</span>
                  <span className="font-medium text-emerald-600">
                    -{formatCurrency(discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ongkos Kirim</span>
                <span className={cn("font-medium", shippingCost === 0 ? "text-emerald-600" : "text-slate-800 dark:text-slate-200")}>
                  {shippingCost === 0 ? "Gratis!" : formatCurrency(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Total</span>
                <span className="text-lg font-extrabold text-emerald-600">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Checkout button */}
            <Link
              href={`/checkout?coupon=${appliedCoupon?.code || ""}`}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-200/50 transition-colors hover:bg-emerald-600"
            >
              Lanjut ke Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Payment methods */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400">Pembayaran aman via</p>
              <div className="mt-2 flex justify-center gap-2">
                {["BCA", "BNI", "GoPay", "OVO", "COD"].map((m) => (
                  <span
                    key={m}
                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}