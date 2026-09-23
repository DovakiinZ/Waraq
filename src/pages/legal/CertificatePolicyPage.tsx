import Layout from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CertificatePolicyPage() {
    const { t } = useLanguage();

    return (
        <Layout>
            <div className="container-academic py-12 md:py-20 max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        {t('سياسة الشهادات', 'Certificate Policy')}
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
                                <h3 className="text-base font-bold text-primary mb-2">إصدار الشهادات بعد إتمام الدورة:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    تُمنح شهادات إتمام الدورات بشكل حصري للطلاب الملتزمين الذين أتموا بشكل حقيقي جميع متطلبات الدورة المرئية والمقروءة واجتازوا الاختبارات والتقييمات المطلوبة بنجاح وإتقان.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">الشهادات رقمية:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    جميع الشهادات الصادرة والمعتمدة عبر المنصة هي شهادات رقمية حصراً (تصدر بصيغة PDF عالية الجودة) وهي قابلة للتحميل والطباعة الذاتية في أي وقت. ولا تقوم الأكاديمية بإرسال نسخ اعتيادية أو ورقية عبر البريد.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">الإصدار من قبل المنصة:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    الشهادات تصدر بشكل آلي ورسمي من وتُنسب إلى "ورق أكاديمي" وتعتبر إثباتاً رقمياً قاطعاً لاستكمال متطلبات ومخرجات المادة التعليمية المحددة على منصتنا الموثوقة.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">نظام التحقق من الشهادات:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    تحمل كل شهادة مصدرة من المنصة رقماً مرجعياً تسلسلياً ورمز استجابة سريعة (QR Code) فريدين وغير مكررين. يُمكن لأي جهة وظيفية أو أكاديمية خارجية استخدامهما للتحقق بكل شفافية وموثوقية من صحة الشهادة واسم متلقيها المعتمد عبر الموقع الرسمي للأكاديمية.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">قواعد الأهلية للحصول على الشهادة:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    يُشترط أن يكون الحساب مسجلاً ومُفعلاً بالاسم الحقيقي، الصحيح والكامل للطالب كما يُراد ظهوره في الإثبات. ولا يُسمح بتاتاً بتعديل أو تغيير اسم المالك للشهادة بعد إصدارها النهائي، إلا في الحالات القصوى وعبر التواصل الرسمي مع الدعم الفني لأسباب وجيهة وموثقة.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">إساءة استخدام الشهادات:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    في حال اكتشاف أدلة تثبت محاولة تزوير لبيانات الشهادة، التلاعب بالكود المرجعي، أو سوء استخدام ومشاركة الحساب لاستخراج شهادات بغير حق لغير المالك الأصلي للحساب، سيتم إلغاء الشهادات المعنية فوراً، وحظر هوية الحساب بشكل دائم ونهائي مع الاحتفاظ بحق المساءلة.
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
                                <h3 className="text-base font-bold text-primary mb-2">Certificates Issued After Course Completion:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Course completion certificates are awarded exclusively to committed students who reliably and genuinely fulfill all expected visual and reading requirements of the course, and who successfully pass all mandated assessments and evaluations with proficiency.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Certificates Are Digital:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    All valid certificates issued via the platform are fundamentally digital (generated in high-quality PDF format), readily available for immediate self-download and printing securely at any time. The Academy definitively does not mail traditional or physical paper copies globally.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Issued by the Platform:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Certificates are officially and automatically generated by "Waraq Academy." They stand globally as definitive digital proof of having completed the specific learning objectives and requirements of the educational material exclusively on our trusted platform.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Verification System for Certificates:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Every certificate uniquely features a serialized reference ID and a distinct QR Code. These are deliberately designed so that any external academic or professional institution can utilize them to transparently and reliably verify the absolute authenticity of the certificate and the credentialed name directly through the Academy's official verification portal.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Rules for Certificate Eligibility:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    The user account heavily relies on being registered and activated under the student's true, exact, and full real name as it should appear strictly on the credential. Name amendments on a finalized certificate following its issuance are strictly prohibited, except in extreme circumstances exclusively managed via direct, documented contact with Technical Support.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Misuse of Certificates:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Upon the discovery of conclusive evidence proving the intentional forgery of certificate data, manipulation of the verification ID, or the unethical sharing of a single account to illicitly generate credentials for external third parties, all related documents will instantly be revoked and invalidated. Consequently, the user account's identity will be permanently and irreversibly banned, maintaining rights to further accountability.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </Layout>
    );
}
