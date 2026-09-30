import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  User,
  CreditCard,
  BookOpen,
  AlertCircle,
} from 'lucide-react';

type OrderStatus = 'pending_payment' | 'paid' | 'rejected';
type FilterStatus = OrderStatus | 'all';

const TeacherOrders = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [activeFilter, setActiveFilter] = useState<FilterStatus>('pending_payment');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders', 'teacher', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          '*, student:profiles!orders_student_id_fkey(id, email, full_name, avatar_url), subject:subjects!orders_subject_id_fkey(id, title_ar, title_en, stage:stages(title_ar, title_en))'
        )
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('orders')
          .select('*')
          .eq('teacher_id', user!.id)
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;

        const studentIds = [...new Set((fallbackData || []).map((o: any) => o.student_id))];
        const subjectIds = [...new Set((fallbackData || []).map((o: any) => o.subject_id))];

        const [studentsRes, subjectsRes] = await Promise.all([
          studentIds.length > 0
            ? supabase.from('profiles').select('id, email, full_name, avatar_url').in('id', studentIds)
            : { data: [] },
          subjectIds.length > 0
            ? supabase
                .from('subjects')
                .select('id, title_ar, title_en, stage:stages(title_ar, title_en)')
                .in('id', subjectIds)
            : { data: [] },
        ]);

        const studentMap = new Map((studentsRes.data || []).map((s: any) => [s.id, s]));
        const subjectMap = new Map((subjectsRes.data || []).map((s: any) => [s.id, s]));

        return (fallbackData || []).map((o: any) => ({
          ...o,
          student: studentMap.get(o.student_id) || null,
          subject: subjectMap.get(o.subject_id) || null,
        }));
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (activeFilter === 'all') return orders;
    return orders.filter((o: any) => o.status === activeFilter);
  }, [orders, activeFilter]);

  const pendingCount = useMemo(
    () => (orders || []).filter((o: any) => o.status === 'pending_payment').length,
    [orders]
  );

  const handleConfirm = async (order: any) => {
    setProcessingId(order.id);
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          reviewed_by: user!.id,
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Upsert, not insert: (student_id, subject_id) is unique, so a student who
      // already has a row for this subject would otherwise hit a 23505 and be left
      // without access while the toast claimed success.
      const { error: accessError } = await supabase
        .from('student_subjects')
        .upsert(
          {
            student_id: order.student_id,
            subject_id: order.subject_id,
            status: 'active',
            assigned_by: 'teacher',
            assigned_reason: `Order #${order.id.slice(0, 8)} - Sham Cash payment confirmed`,
          },
          { onConflict: 'student_id,subject_id' }
        );

      if (accessError) {
        toast.warning(
          t('تم تأكيد الدفع لكن تعذّر تفعيل وصول الطالب', 'Payment confirmed but granting access failed'),
          { description: accessError.message }
        );
      } else {
        toast.success(t('تم تأكيد الدفع وتفعيل وصول الطالب', 'Payment confirmed and student access granted'));
      }
      refetch();
    } catch (err: any) {
      toast.error(t('فشل في تأكيد الدفع', 'Failed to confirm payment'), {
        description: err.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (order: any) => {
    setProcessingId(order.id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'rejected',
          reviewed_by: user!.id,
          teacher_notes: 'Payment not received',
        })
        .eq('id', order.id);

      if (error) throw error;
      toast.success(t('تم رفض الطلب', 'Order rejected'));
      refetch();
    } catch (err: any) {
      toast.error(t('فشل في رفض الطلب', 'Failed to reject order'), {
        description: err.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SY' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString(language === 'ar' ? 'ar-SY' : 'en-US')} ${t('ل.س', 'SYP')}`;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            <Clock className="h-3 w-3" />
            {t('بانتظار الدفع', 'Pending')}
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />
            {t('مدفوع', 'Paid')}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
            <XCircle className="h-3 w-3" />
            {t('مرفوض', 'Rejected')}
          </span>
        );
      default:
        return null;
    }
  };

  const borderClass = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'border-l-4 border-l-amber-400';
      case 'paid':
        return 'border-l-4 border-l-green-500';
      case 'rejected':
        return 'border-l-4 border-l-red-400';
      default:
        return '';
    }
  };

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'pending_payment', label: t('بانتظار الدفع', 'Pending') },
    { key: 'paid', label: t('مدفوع', 'Paid') },
    { key: 'rejected', label: t('مرفوض', 'Rejected') },
    { key: 'all', label: t('الكل', 'All') },
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Receipt className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">{t('الطلبات', 'Orders')}</h1>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800">
            {pendingCount}
          </span>
        )}
      </div>

      {/* Info box */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-mint bg-brand-mint/25 p-4 text-sm text-brand-deep dark:border-brand-green dark:bg-brand-green/15 dark:text-brand-mint">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {t(
            'قارن بيانات شام كاش الطالب أدناه مع التحويلات الواردة إليك',
            "Compare the student's Sham Cash details below with your incoming transfers"
          )}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state — no orders at all */}
      {!isLoading && orders && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Receipt className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {t(
              'لا توجد طلبات بعد. سيظهر الطلاب هنا عند شراء موادك.',
              'No orders yet. Students will appear here when they purchase your subjects.'
            )}
          </p>
        </div>
      )}

      {/* Empty state — no orders in current filter */}
      {!isLoading && orders && orders.length > 0 && filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Receipt className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {t('لا توجد طلبات بهذه الحالة', 'No orders with this status')}
          </p>
        </div>
      )}

      {/* Order cards */}
      <div className="flex flex-col gap-4">
        {filteredOrders.map((order: any) => (
          <div
            key={order.id}
            className={`bg-background border border-border rounded-xl p-5 ${borderClass(order.status)}`}
          >
            {/* Top row: status + date */}
            <div className="mb-4 flex items-center justify-between">
              {statusBadge(order.status)}
              <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
            </div>

            {/* Student info */}
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-tight">
                  {order.student_full_name || order.student?.full_name || t('طالب', 'Student')}
                </p>
                {order.student?.email && (
                  <p className="text-xs text-muted-foreground">{order.student.email}</p>
                )}
              </div>
            </div>

            {/* Sham Cash account — highlighted */}
            {order.student_payment_account && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <CreditCard className="h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <p className="text-xs text-amber-700">{t('حساب شام كاش', 'Sham Cash Account')}</p>
                  <p className="font-mono text-sm font-semibold text-amber-900 break-all">
                    {order.student_payment_account}
                  </p>
                </div>
              </div>
            )}

            {/* Subject + amount */}
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                <span>
                  {language === 'ar'
                    ? order.subject?.title_ar || order.subject?.title_en
                    : order.subject?.title_en || order.subject?.title_ar}
                </span>
                {order.subject?.stage && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {language === 'ar'
                      ? order.subject.stage.title_ar
                      : order.subject.stage.title_en}
                  </span>
                )}
              </div>
              {order.amount != null && (
                <span className="font-semibold text-foreground">
                  {formatCurrency(order.amount)}
                </span>
              )}
            </div>

            {/* Actions for pending orders */}
            {order.status === 'pending_payment' && (
              <div className="flex items-center gap-2 border-t pt-4">
                <Button
                  size="sm"
                  onClick={() => handleConfirm(order)}
                  disabled={processingId === order.id}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {processingId === order.id ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  )}
                  {t('تأكيد الدفع', 'Confirm Payment')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(order)}
                  disabled={processingId === order.id}
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {processingId === order.id ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                  )}
                  {t('رفض', 'Reject')}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherOrders;
