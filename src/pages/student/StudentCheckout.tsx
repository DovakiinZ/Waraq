import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/lib/supabase';
import { formatAmount, isFreeSubject } from '@/lib/price';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, ArrowRight, ArrowLeft, ShoppingCart, Loader2, CreditCard, Store, Copy, AlertTriangle } from 'lucide-react';

interface CartTeacher {
  id: string;
  full_name: string | null;
  shamcash_account_name: string | null;
  shamcash_account_number: string | null;
}

interface CartSubject {
  id: string;
  title_ar: string;
  title_en: string | null;
  teacher_id: string | null;
  is_paid: boolean | null;
  price_amount: number | null;
  price_currency: string | null;
  stage: { id: string; title_ar: string; title_en: string | null } | null;
  teacher: CartTeacher | null;
}

/**
 * Payment goes to each course's TEACHER, not to the platform (see CLAUDE.md,
 * "Payment model is per-teacher"). This page used to show a single «ورق
 * أكاديمي» account name and a dashed QR placeholder — no number at all — so a
 * student had nowhere real to send money. It now shows every teacher's own
 * Sham Cash account, the same way the Android checkout always has.
 */
export default function StudentCheckout() {
  const { profile } = useAuth();
  const { t, language, direction } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // The shared cart. Reading localStorage directly here meant a course added
  // or removed elsewhere in this session could be out of step with checkout.
  const cart = useCart();
  const cartIds = cart.items;
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const paymentSchema = useMemo(() => z.object({
    student_full_name: z.string().trim().min(3, t('الاسم مطلوب (3 أحرف على الأقل)', 'Name is required (at least 3 characters)')),
    student_payment_account: z.string().trim().min(4, t('رقم الحساب مطلوب', 'Account number is required')),
  }), [t]);
  type PaymentFormData = z.infer<typeof paymentSchema>;

  // Leave when the cart empties — on arrival, or after removing the last item.
  // Step 3 is exempt: a successful order empties the cart on purpose.
  useEffect(() => {
    if (cartIds.length === 0 && step !== 3) {
      toast(t('السلة فارغة', 'Cart is empty'));
      navigate('/student/marketplace');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartIds.length, step]);

  const { data: cartSubjects, isLoading } = useQuery({
    queryKey: ['cart-subjects', cartIds],
    queryFn: async (): Promise<CartSubject[]> => {
      if (cartIds.length === 0) return [];
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, title_ar, title_en, teacher_id, is_paid, price_amount, price_currency, stage_id')
        .in('id', cartIds);
      if (!subjects) return [];

      const stageIds = [...new Set(subjects.map((s) => s.stage_id).filter(Boolean))];
      const teacherIds = [...new Set(subjects.map((s) => s.teacher_id).filter(Boolean))];

      // Signed-in users may read a teacher's shamcash_* columns; only the anon
      // role is restricted (migration 104). The Android checkout relies on
      // the same read.
      const [{ data: stages }, { data: teachers }] = await Promise.all([
        stageIds.length > 0
          ? supabase.from('stages').select('id, title_ar, title_en').in('id', stageIds)
          : Promise.resolve({ data: [] as { id: string; title_ar: string; title_en: string | null }[] }),
        teacherIds.length > 0
          ? supabase.from('profiles').select('id, full_name, shamcash_account_name, shamcash_account_number').in('id', teacherIds)
          : Promise.resolve({ data: [] as CartTeacher[] }),
      ]);

      const stageMap = Object.fromEntries((stages || []).map((s) => [s.id, s]));
      const teacherMap = Object.fromEntries(((teachers || []) as CartTeacher[]).map((p) => [p.id, p]));

      return subjects.map((s) => ({
        ...s,
        stage: stageMap[s.stage_id] || null,
        teacher: teacherMap[s.teacher_id] || null,
      })) as CartSubject[];
    },
    enabled: cartIds.length > 0,
  });

  // A free course opens without buying it, so it never belongs in an order.
  // Older carts can still hold one from before the marketplace stopped
  // offering "Enrol" on free courses — drop it with a note.
  const freeInCart = useMemo(() => (cartSubjects || []).filter(isFreeSubject), [cartSubjects]);
  useEffect(() => {
    if (freeInCart.length === 0) return;
    freeInCart.forEach((s) => cart.remove(s.id));
    toast(t('أُزيلت مواد مجانية من السلة — يمكنك فتحها مباشرة دون شراء.', 'Free courses were removed from your cart — you can open them without buying.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeInCart]);

  const paidSubjects = useMemo(() => (cartSubjects || []).filter((s) => !isFreeSubject(s)), [cartSubjects]);

  // One payment per teacher: each is sent to that teacher's own account.
  const byTeacher = useMemo(() => {
    const groups = new Map<string, { teacher: CartTeacher | null; subjects: CartSubject[] }>();
    for (const s of paidSubjects) {
      const key = s.teacher_id || 'unknown';
      if (!groups.has(key)) groups.set(key, { teacher: s.teacher, subjects: [] });
      groups.get(key)!.subjects.push(s);
    }
    return [...groups.values()];
  }, [paidSubjects]);

  // Totals per currency — summing SYP and USD into one number would be wrong.
  const totalsLabel = (subjects: CartSubject[]) => {
    const sums = new Map<string, number>();
    for (const s of subjects) {
      const c = (s.price_currency || 'SYP').toUpperCase();
      sums.set(c, (sums.get(c) || 0) + (s.price_amount || 0));
    }
    return [...sums.entries()].map(([c, n]) => formatAmount(n, c, language)).join(' + ');
  };

  const missingPaymentInfo = byTeacher.filter((g) => !g.teacher?.shamcash_account_number);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('تم النسخ', 'Copied'));
    } catch {
      toast.error(t('تعذّر النسخ — انسخ الرقم يدوياً', 'Could not copy — copy the number by hand'));
    }
  };

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { student_full_name: profile?.full_name || '', student_payment_account: '' },
  });

  const onSubmit = async (formData: PaymentFormData) => {
    if (!profile || paidSubjects.length === 0) return;
    if (missingPaymentInfo.length > 0) return;
    setSubmitting(true);
    try {
      // One insert for every order, so a failure cannot leave half the cart
      // ordered and the other half not.
      const { error } = await supabase.from('orders').insert(
        paidSubjects.map((subject) => ({
          student_id: profile.id,
          subject_id: subject.id,
          teacher_id: subject.teacher_id,
          status: 'pending_payment' as const,
          amount: subject.price_amount || 0,
          currency: subject.price_currency || 'SYP',
          student_full_name: formData.student_full_name,
          student_payment_account: formData.student_payment_account,
        })),
      );
      if (error) throw error;

      cart.clear();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-status'] });
      setStep(3);
    } catch (err) {
      toast.error(t('حدث خطأ أثناء تقديم الطلب', 'An error occurred while placing the order'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;
  const ForwardArrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {s}
          </div>
          {s < 3 && <div className={`w-10 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
        </div>
      ))}
    </div>
  );

  if (cartIds.length === 0 && step !== 3) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const title = (s: CartSubject) => (language === 'ar' ? s.title_ar : s.title_en || s.title_ar);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" dir={direction}>
      <StepIndicator />

      {/* Step 1: Order Summary */}
      {step === 1 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t('ملخص الطلب', 'Order Summary')}</h1>
          </div>

          <div className="space-y-4 mb-6">
            {paidSubjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between gap-3 border border-border rounded-xl p-4">
                <div className="space-y-1 min-w-0">
                  <p className="font-semibold">{title(subject)}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {subject.stage && (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                        {language === 'ar' ? subject.stage.title_ar : subject.stage.title_en || subject.stage.title_ar}
                      </span>
                    )}
                    {subject.teacher?.full_name && <span>{subject.teacher.full_name}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="font-bold text-lg whitespace-nowrap">
                    {formatAmount(subject.price_amount, subject.price_currency, language)}
                  </p>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => cart.remove(subject.id)}
                  >
                    {t('إزالة', 'Remove')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 mb-6 flex items-center justify-between gap-3">
            <span className="font-bold text-lg">{t('المجموع', 'Total')}</span>
            <span className="font-bold text-2xl text-primary text-end">{totalsLabel(paidSubjects)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link to="/student/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <BackArrow className="w-4 h-4" />
              {t('العودة للمتجر', 'Back to Marketplace')}
            </Link>
            <Button onClick={() => setStep(2)} className="gap-2" disabled={paidSubjects.length === 0}>
              {t('متابعة للدفع', 'Continue to Payment')}
              <ForwardArrow className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 2 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t('الدفع عبر شام كاش', 'Payment via Sham Cash')}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {byTeacher.length > 1
              ? t('حوّل لكل معلّم ثمن مواده إلى حسابه في شام كاش، ثم أدخل بياناتك أدناه. يؤكّد كل معلّم طلبه بنفسه.',
                  'Send each teacher the price of their courses to their own Sham Cash account, then enter your details below. Each teacher confirms their own order.')
              : t('حوّل المبلغ إلى حساب المعلّم في شام كاش، ثم أدخل بياناتك أدناه. تُفتح المادة فور تأكيد المعلّم.',
                  "Send the amount to the teacher's Sham Cash account, then enter your details below. The course opens as soon as the teacher confirms.")}
          </p>

          <div className="space-y-3 mb-6">
            {byTeacher.map((g, i) => {
              const number = g.teacher?.shamcash_account_number;
              return (
                <div key={g.teacher?.id || i} className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('المعلّم', 'Teacher')}</p>
                      <p className="font-semibold">{g.teacher?.full_name || t('غير معروف', 'Unknown')}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {g.subjects.map(title).join('، ')}
                      </p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-xs text-muted-foreground">{t('المبلغ', 'Amount')}</p>
                      <p className="font-bold text-lg text-primary whitespace-nowrap">{totalsLabel(g.subjects)}</p>
                    </div>
                  </div>

                  {number ? (
                    <div className="flex items-center justify-between gap-3 bg-background rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {g.teacher?.shamcash_account_name || t('رقم الحساب', 'Account number')}
                        </p>
                        <p className="font-mono font-bold text-base break-all" dir="ltr">{number}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => copy(number)}>
                        <Copy className="w-3.5 h-3.5" />
                        {t('نسخ', 'Copy')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>
                        {t('لم يضف هذا المعلّم حساب شام كاش بعد، فلا يمكن الدفع له الآن. أزل مواده من السلة أو راسله.',
                           "This teacher hasn't added a Sham Cash account yet, so you can't pay them right now. Remove their courses from the cart or message them.")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student_full_name">{t('اسمك الكامل', 'Your Full Name')}</Label>
              <Input id="student_full_name" autoComplete="name" {...register('student_full_name')} />
              {errors.student_full_name && (
                <p className="text-sm text-destructive">{errors.student_full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="student_payment_account">{t('رقم حسابك في شام كاش', 'Your Sham Cash Account Number')}</Label>
              <Input id="student_payment_account" inputMode="numeric" dir="ltr" {...register('student_payment_account')} />
              <p className="text-xs text-muted-foreground">
                {t('الحساب الذي حوّلت منه، ليتعرّف المعلّم على دفعتك.', 'The account you paid from, so the teacher can match your payment.')}
              </p>
              {errors.student_payment_account && (
                <p className="text-sm text-destructive">{errors.student_payment_account.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} className="gap-1">
                <BackArrow className="w-4 h-4" />
                {t('رجوع', 'Back')}
              </Button>
              <Button type="submit" disabled={submitting || missingPaymentInfo.length > 0} className="gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('تأكيد الطلب', 'Place Order')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="bg-background border border-border rounded-2xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t('تم تقديم طلبك بنجاح!', 'Order Placed Successfully!')}</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto">
            {t(
              'طلبك قيد المراجعة. ستحصل على الوصول بمجرد تأكيد المعلم للدفع.',
              "Your order is being reviewed. You'll get access once the teacher confirms your payment."
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild variant="outline" className="gap-2 w-full sm:w-auto">
              <Link to="/student/marketplace?tab=orders">
                <Store className="w-4 h-4" />
                {t('عرض طلباتي', 'View My Orders')}
              </Link>
            </Button>
            <Button asChild className="gap-2 w-full sm:w-auto">
              <Link to="/student">
                {t('العودة للوحة التحكم', 'Back to Dashboard')}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
