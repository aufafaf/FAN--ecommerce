"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, MapPin, Truck, CreditCard, ClipboardList } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { SHIPPING_METHODS, TAX_RATE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Address } from "@/types/user";

const STEPS = [
  { id: 1, label: "Alamat", icon: MapPin },
  { id: 2, label: "Pengiriman", icon: Truck },
  { id: 3, label: "Pembayaran", icon: CreditCard },
  { id: 4, label: "Konfirmasi", icon: ClipboardList },
];

const PAYMENT_METHODS = [
  { id: "BANK_TRANSFER", label: "Transfer Bank", desc: "BCA, BNI, Mandiri, BRI", emoji: "🏦" },
  { id: "GOPAY", label: "GoPay", desc: "Bayar via aplikasi Gojek", emoji: "💚" },
  { id: "OVO", label: "OVO", desc: "Bayar via aplikasi OVO", emoji: "💜" },
  { id: "DANA", label: "DANA", desc: "Bayar via aplikasi DANA", emoji: "💙" },
  { id: "COD", label: "Bayar di Tempat (COD)", desc: "Bayar saat barang tiba", emoji: "💵" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { items, getTotalPrice, clearCart } = useCartStore();

  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_METHODS[0]);
  const [selectedPayment, setSelectedPayment] = useState("BANK_TRANSFER");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const couponCode = searchParams.get("coupon") || "";
  const subtotal = getTotalPrice();
  const shippingCost = selectedShipping.price;
  const taxAmount = subtotal * TAX_RATE;
  const total = subtotal + shippingCost + taxAmount;

  useEffect(() => {
    if (!session?.user) {
      router.push("/login?callbackUrl=/checkout");
      return;
    }
    if (items.length === 0) {
      router.push("/cart");
      return;
    }
    // Fetch addresses
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((data) => {
        setAddresses(data);
        const def = data.find((a: Address) => a.isDefault);
        if (def) setSelectedAddressId(def.id);
      });
  }, [session]);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Pilih alamat pengiriman terlebih dahulu");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          addressId: selectedAddressId,
          shippingMethod: selectedShipping.name,
          shippingCost: selectedShipping.price,
          paymentMethod: selectedPayment,
          couponCode: couponCode || undefined,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      clearCart();
      router.push(`/checkout-success?orderId=${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pesanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-heading text-center text-2xl font-bold text-slate-900 dark:text-white">
          Checkout
        </h1>

        {/* Step indicator */}
        <div className="mt-8 flex items-center justify-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = step > s.id;
            const isActive = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => isDone && setStep(s.id)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isDone
                      ? "cursor-pointer border-emerald-500 bg-emerald-500 text-white"
                      : isActive
                      ? "border-emerald-500 bg-white text-emerald-600 dark:bg-slate-900"
                      : "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />}
                </button>
                <span
                  className={cn(
                    "ml-1.5 hidden text-xs font-medium sm:block",
                    isActive ? "text-emerald-600" : isDone ? "text-slate-600" : "text-slate-400",
                    "dark:text-slate-400"
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 w-8 sm:w-16 transition-colors",
                      step > s.id ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Step Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Address */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                    Pilih Alamat Pengiriman
                  </h2>

                  {addresses.length === 0 ? (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-slate-500">Belum ada alamat tersimpan</p>
                      
                        href="/account/addresses"
                        className="mt-3 inline-block text-sm font-medium text-emerald-600 hover:underline"
                      >
                        + Tambah Alamat Baru
                      </a>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={cn(
                            "flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition-all",
                            selectedAddressId === addr.id
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : "border-slate-200 hover:border-emerald-300 dark:border-slate-700"
                          )}
                        >
                          <input
                            type="radio"
                            name="address"
                            value={addr.id}
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1 accent-emerald-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                {addr.recipientName}
                              </span>
                              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800">
                                {addr.label}
                              </span>
                              {addr.isDefault && (
                                <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30">
                                  Utama
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{addr.phone}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {addr.street}, {addr.city}, {addr.state} {addr.zipCode}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!selectedAddressId) {
                        toast.error("Pilih alamat terlebih dahulu");
                        return;
                      }
                      setStep(2);
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
                  >
                    Lanjut ke Pengiriman
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}

              {/* Step 2: Shipping */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                    Pilih Metode Pengiriman
                  </h2>
                  <div className="mt-4 space-y-3">
                    {SHIPPING_METHODS.map((method) => (
                      <label
                        key={method.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all",
                          selectedShipping.id === method.id
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : "border-slate-200 hover:border-emerald-300 dark:border-slate-700"
                        )}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShipping.id === method.id}
                          onChange={() => setSelectedShipping(method)}
                          className="accent-emerald-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-800 dark:text-white">
                              {method.name}
                            </span>
                            <span className={cn(
                              "text-sm font-bold",
                              method.price === 0 ? "text-emerald-600" : "text-slate-800 dark:text-white"
                            )}>
                              {method.price === 0 ? "Gratis" : formatCurrency(method.price)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Estimasi tiba: {method.days}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Notes */}
                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Catatan untuk Penjual (opsional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Mohon dikemas dengan bubble wrap..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
                    >
                      Lanjut ke Pembayaran
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                    Pilih Metode Pembayaran
                  </h2>
                  <div className="mt-4 space-y-3">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all",
                          selectedPayment === method.id
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : "border-slate-200 hover:border-emerald-300 dark:border-slate-700"
                        )}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={selectedPayment === method.id}
                          onChange={() => setSelectedPayment(method.id)}
                          className="accent-emerald-500"
                        />
                        <span className="text-xl">{method.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {method.label}
                          </p>
                          <p className="text-xs text-slate-500">{method.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
                    >
                      Lihat Ringkasan
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review & Place Order */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Items summary */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="font-semibold text-slate-800 dark:text-white">
                      Produk ({items.length} item)
                    </h3>
                    <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-center gap-3 py-2.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                            {item.name}
                            {item.variant && (
                              <span className="text-slate-400"> ({item.variant.value})</span>
                            )}
                          </span>
                          <span className="text-xs text-slate-500">x{item.quantity}</span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-white">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Shipping & Payment summary */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Pengiriman</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {selectedShipping.name}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-slate-500">Pembayaran</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {PAYMENT_METHODS.find((m) => m.id === selectedPayment)?.label}
                      </span>
                    </div>
                    {notes && (
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-slate-500">Catatan</span>
                        <span className="max-w-xs text-right font-medium text-slate-700 dark:text-slate-300">
                          {notes}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Terms */}
                  <p className="text-center text-xs text-slate-500">
                    Dengan menekan "Buat Pesanan", kamu menyetujui{" "}
                    <a href="/terms" className="text-emerald-600 underline">
                      Syarat & Ketentuan
                    </a>{" "}
                    kami.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(3)}
                      className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Buat Pesanan
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
              Ringkasan Pembayaran
            </h3>
            <div className="mt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ongkos Kirim</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pajak (11%)</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(taxAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Total</span>
                <span className="text-lg font-extrabold text-emerald-600">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}