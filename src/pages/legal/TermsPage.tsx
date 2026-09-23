import Layout from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsPage() {
    const { t } = useLanguage();

    return (
        <Layout>
            <div className="container-academic py-12 md:py-20 max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        {t('الشروط والأحكام', 'Terms and Conditions')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('آخر تحديث: مارس 2026', 'Last Updated: March 2026')}
                    </p>
                </div>

                <div className="prose dark:prose-invert max-w-none space-y-8 text-foreground prose-headings:text-foreground prose-a:text-primary">
                    <section>
                        <h2 className="text-xl font-bold border-b border-border pb-2 mb-4">
                            {t('القسم العربي', 'Arabic Section')}
                        </h2>
                        
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">قبول الشروط:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    مرحباً بكم في ورق أكاديمي. باستخدامك لمنصتنا أو الوصول إليها بأي شكل من الأشكال، فإنك توافق التام على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يُرجى عدم استخدام المنصة.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">قواعد استخدام المنصة:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    يُسمح باستخدام المنصة للأغراض التعليمية الشرعية فقط. يُمنع منعاً باتاً استخدام المنصة لأي غرض غير قانوني، غير مصرح به، أو يسيء للآخرين.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">مسؤوليات الطالب:</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-1">
                                    <li>الحفاظ على سرية معلومات الحساب وكلمة المرور الخاصة بك.</li>
                                    <li>عدم مشاركة الحساب أو بيانات الدخول مع أشخاص آخرين تحت أي ظرف.</li>
                                    <li>الالتزام بالسلوك المهني والمحترم واللائق في التواصل مع المعلمين والطلاب الآخرين عبر النظام.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">مسؤوليات المعلم:</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-1">
                                    <li>تقديم محتوى تعليمي عالي الجودة، دقيق، ومحدث.</li>
                                    <li>الاستجابة لاستفسارات ومناقشات الطلاب في الوقت المناسب وبشكل احترافي.</li>
                                    <li>الالتزام التام بقواعد المنصة في إدارة المواد الدراسية والإعلانات الموجهة للطلاب.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">الملكية الفكرية:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    جميع المواد التعليمية، الفيديوهات، والملفات المرفوعة على الأكاديمية هي حقوق ملكية فكرية حصرية لورق أكاديمي والمعلمين التابعين لها. يُمنع التنزيل غير المصرح به، أو النسخ، أو التوزيع خارج المنصة دون إذن كتابي مسبق.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">قواعد الوصول للدورات:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    يتم منح حق الوصول للدورات بناءً على نوع الاشتراك (شهري/سنوي) أو من خلال الشراء الفردي للمادة. تحتفظ ورق أكاديمي بالحق في تعليق الوصول في حال ثبوت مخالفة شروط الاستخدام.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">قواعد الاشتراكات:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    الاشتراكات تتجدد تلقائياً حسب الخطة المختارة مسبقاً. يمكن للمشترك إلغاء التجديد التلقائي في أي وقت من خلال إعدادات لوحة تحكم الطالب.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">قواعد إصدار الشهادات:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    تُصدر الشهادات الرقمية فقط بعد استكمال الطالب الفعلي لجميع متطلبات الدورة واجتياز الاختبارات المقررة بنسبة النجاح المطلوبة.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">السلوكيات الممنوعة:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    يُمنع الإساءة للآخرين أو إرسال رسائل مزعجة عبر نظام المراسلة والتعليقات، كما يُمنع أي محاولة لاختراق النظام، أو التحايل المالي.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">إيقاف الحساب:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    تحتفظ ورق أكاديمي بالحق المطلق في إيقاف أو حظر أي حساب ينتهك هذه الشروط دون إشعار مسبق أو تعويض مالي.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">تعديلات المنصة:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    يحتفظ الموقع بالحق في تعديل، إضافة، أو إيقاف أي جزء من الخدمة بشكل مؤقت أو دائم استجابة لمتطلبات التطوير.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">تحديد المسؤولية:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    ورق أكاديمي غير مسؤولة بأي حال من الأحوال عن أي أضرار مباشرة أو غير مباشرة ناتجة عن الأعطال التقنية الخارجة عن الإرادة أو عدم القدرة على استخدام المنصة.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">القانون الحاكم:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    تخضع هذه الشروط والأحكام للقوانين واللوائح المعمول بها محلياً ودولياً فيما يخص التجارة الإلكترونية وحماية المستهلك.
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="my-10 border-t border-border" />

                    <section dir="ltr" className="text-left font-sans">
                        <h2 className="text-xl font-bold border-b border-border pb-2 mb-4 font-sans text-left">
                            English Section
                        </h2>
                        
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Acceptance of Terms:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Welcome to Waraq Academy. By accessing or using our platform, you fully agree to be bound by these Terms and Conditions. If you do not agree, please refrain from using the platform.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Platform Usage Rules:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    The platform is strictly for legitimate educational purposes. Unauthorized or illegal use, or any activity that harms others, is strictly prohibited.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Student Responsibilities:</h3>
                                <ul className="list-disc list-outside ml-4 text-sm text-muted-foreground leading-relaxed space-y-1">
                                    <li>Maintain the strict confidentiality of your account credentials and passwords.</li>
                                    <li>Do not share your account or login details with others under any circumstances.</li>
                                    <li>Maintain a highly professional and respectful tone in all communications with teachers and peers.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Teacher Responsibilities:</h3>
                                <ul className="list-disc list-outside ml-4 text-sm text-muted-foreground leading-relaxed space-y-1">
                                    <li>Provide educational content that is of high quality, accurate, and up to date.</li>
                                    <li>Respond to student inquiries and discussions in a timely and professional manner.</li>
                                    <li>Strictly adhere to platform guidelines when managing courses and student announcements.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Intellectual Property:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    All educational materials, videos, and uploaded files are the exclusive intellectual property of Waraq Academy and its affiliated teachers. Unauthorized downloading, copying, or distributing outside the platform without prior written consent is strictly prohibited.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Course Access Rules:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Access to courses is granted solely based on your active subscription (monthly/yearly) or targeted individual purchase. Waraq Academy reserves the right to suspend access if these terms are violated.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Subscription Rules:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Subscriptions renew automatically according to the originally selected plan. Users retain the ability to securely cancel auto-renewal at any time via the student dashboard settings.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Certificate Issuance Rules:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Valid digital certificates are issued only after a student legitimately completes all course requirements and successfully passes the required assessments or quizzes.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Prohibited Behavior:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Harassment or spamming via the internal messaging or comments system, system hacking attempts, and any form of financial fraud are strictly and explicitly prohibited.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Account Suspension:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Waraq Academy reserves the absolute right to suspend or permanently ban any account found violating these terms without prior notice or financial compensation.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Platform Modifications:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    We reserve the right to confidently modify, add to, or temporarily/permanently discontinue any part of the service in response to development needs.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Limitation of Liability:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Waraq Academy shall not be held liable for any direct or indirect damages resulting from unforeseen technical outages or the temporary inability to use the platform.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Governing Law:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    These terms are governed by the applicable local and international laws regarding e-commerce and consumer protection.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </Layout>
    );
}
