import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, ArrowRight, ArrowLeft, ShoppingCart, Loader2, QrCode, CreditCard, Store } from 'lucide-react';

const paymentSchema = z.object({
  student_full_name: z.string().min(3, 'الاسم مطلوب (3 أحرف على الأقل)'),
  student_payment_account: z.string().min(4, 'رقم الحساب مطلوب'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const CART_KEY = 'ayman-academy-cart';

export default function StudentCheckout() {
  const { profile } = useAuth();
  const { t, language, direction } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const cartIds: string[] = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

  useEffect(() => {
    if (cartIds.length === 0 && step !== 3) {
      toast(t('السلة فارغة', 'Cart is empty'));
      navigate('/student/marketplace');
    }
  }, []);

  const { data: cartSubjects, isLoading } = useQuery({
    queryKey: ['cart-subjects', cartIds],
    queryFn: async () => {
      if (cartIds.length === 0) return [];
      const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .in('id', cartIds);
      if (!subjects) return [];

      const stageIds = [...new Set(subjects.map(s => s.stage_id).filter(Boolean))];
      const teacherIds = [...new Set(subjects.map(s => s.teacher_id).filter(Boolean))];

      const [{ data: stages }, { data: teachers }] = await Promise.all([
        stageIds.length > 0
          ? supabase.from('stages').select('id, title_ar, title_en').in('id', stageIds)
          : { data: [] },
        teacherIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', teacherIds)
          : { data: [] },
      ]);

      const stageMap = Object.fromEntries((stages || []).map(s => [s.id, s]));
      const teacherMap = Object.fromEntries((teachers || []).map(t => [t.id, t]));

      return subjects.map(s => ({
        ...s,
        stage: stageMap[s.stage_id] || null,
        teacher: teacherMap[s.teacher_id] || null,
      }));
    },
    enabled: cartIds.length > 0,
  });

  const total = (cartSubjects || []).reduce((sum, s) => sum + (s.price_amount || 0), 0);
  const currency = cartSubjects?.[0]?.price_currency || 'SYP';

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { student_full_name: profile?.full_name || '', student_payment_account: '' },
  });

  const onSubmit = async (formData: PaymentFormData) => {
    if (!profile || !cartSubjects) return;
    setSubmitting(true);
    try {
      const orderPromises = cartSubjects.map(subject =>
        supabase.from('orders').insert({
          student_id: profile.id,
          subject_id: subject.id,
          teacher_id: subject.teacher_id,
          status: 'pending_payment',
          amount: subject.price_amount || 0,
          currency: subject.price_currency || 'SYP',
          student_full_name: formData.student_full_name,
          student_payment_account: formData.student_payment_account,
        }).select().single()
      );

      const results = await Promise.all(orderPromises);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;

      localStorage.removeItem(CART_KEY);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart-subjects'] });
      setStep(3);
    } catch (err: any) {
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
            {(cartSubjects || []).map((subject) => (
              <div key={subject.id} className="flex items-center justify-between border border-border rounded-xl p-4">
                <div className="space-y-1">
                  <p className="font-semibold">{language === 'ar' ? subject.title_ar : subject.title_en}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {subject.stage && (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                        {language === 'ar' ? subject.stage.title_ar : subject.stage.title_en}
                      </span>
                    )}
                    {subject.teacher && <span>{subject.teacher.full_name}</span>}
                  </div>
                </div>
                <p className="font-bold text-lg whitespace-nowrap">
                  {subject.price_amount || 0} {t('ل.س', currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 mb-6 flex items-center justify-between">
            <span className="font-bold text-lg">{t('المجموع', 'Total')}</span>
            <span className="font-bold text-2xl text-primary">{total} {t('ل.س', currency)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link to="/student/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <BackArrow className="w-4 h-4" />
              {t('العودة للمتجر', 'Back to Marketplace')}
            </Link>
            <Button onClick={() => setStep(2)} className="gap-2">
              {t('متابعة للدفع', 'Continue to Payment')}
              <ForwardArrow className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 2 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t('الدفع عبر شام كاش', 'Payment via Sham Cash')}</h1>
          </div>

          <div className="w-48 h-48 border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center mx-auto mb-6">
            <QrCode className="w-12 h-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">{t('رمز QR', 'QR Code')}</span>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 mb-6 space-y-2 text-center">
            <p className="text-sm text-muted-foreground">{t('اسم الحساب', 'Account Name')}</p>
            <p className="font-bold text-lg">ورق أكاديمي</p>
            <p className="text-sm text-muted-foreground mt-3">{t('المبلغ المطلوب تحويله', 'Amount to Transfer')}</p>
            <p className="font-bold text-2xl text-primary">{total} {t('ل.س', currency)}</p>
          </div>

          <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
            {t(
              'قم بتحويل المبلغ عبر شام كاش ثم أدخل بياناتك أدناه. سيتم مراجعة طلبك من قبل المعلم.',
              "Transfer the amount via Sham Cash, then enter your details below. Your order will be reviewed by the teacher."
            )}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student_full_name">{t('اسمك الكامل', 'Your Full Name')}</Label>
              <Input id="student_full_name" {...register('student_full_name')} />
              {errors.student_full_name && (
                <p className="text-sm text-destructive">{errors.student_full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="student_payment_account">{t('رقم حسابك في شام كاش', 'Your Sham Cash Account Number')}</Label>
              <Input id="student_payment_account" {...register('student_payment_account')} />
              {errors.student_payment_account && (
                <p className="text-sm text-destructive">{errors.student_payment_account.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} className="gap-1">
                <BackArrow className="w-4 h-4" />
                {t('رجوع', 'Back')}
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
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
              <Link to="/student/marketplace">
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
