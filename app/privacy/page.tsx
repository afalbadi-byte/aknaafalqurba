'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Shield, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import Logo from '@/components/logo'

/* ─────────────────────────────────────────────────────
   Collapsible section
───────────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-brand-100 dark:border-brand-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-brand-900 hover:bg-brand-50 dark:hover:bg-brand-800 transition text-right"
      >
        <span className="font-bold text-brand-950 dark:text-brand-50">{title}</span>
        {open ? <ChevronUp size={18} className="text-brand-400 shrink-0" /> : <ChevronDown size={18} className="text-brand-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 bg-white dark:bg-brand-900 text-sm text-brand-700 dark:text-brand-300 leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-gold-500 mt-0.5 shrink-0">◆</span>
      <span>{children}</span>
    </li>
  )
}

/* ─────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────── */
export default function PrivacyPage() {
  const [tab, setTab] = useState<'privacy'|'terms'>('privacy')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-brand-950">
      {/* Header */}
      <header className="bg-white dark:bg-brand-900 border-b border-brand-100 dark:border-brand-800 sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/"><Logo size={40} /></Link>
          <div className="text-xs text-brand-500 dark:text-brand-400">آخر تحديث: مايو ٢٠٢٥</div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-300 mb-4">
            {tab === 'privacy' ? <Shield size={28} /> : <FileText size={28} />}
          </div>
          <h1 className="font-display text-3xl font-extrabold text-brand-950 dark:text-brand-50 mb-2">
            {tab === 'privacy' ? 'سياسة الخصوصية' : 'الشروط والأحكام'}
          </h1>
          <p className="text-brand-600 dark:text-brand-400 text-sm">
            صندوق أكناف القربى — عائلة البادي
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-brand-200 dark:border-brand-700 mb-8 bg-white dark:bg-brand-900">
          <button
            onClick={() => setTab('privacy')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition ${tab==='privacy'?'bg-brand-950 text-white dark:bg-gold-500 dark:text-brand-950':'text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-800'}`}
          >
            <Shield size={15} /> سياسة الخصوصية
          </button>
          <button
            id="terms"
            onClick={() => setTab('terms')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition ${tab==='terms'?'bg-brand-950 text-white dark:bg-gold-500 dark:text-brand-950':'text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-800'}`}
          >
            <FileText size={15} /> الشروط والأحكام
          </button>
        </div>

        {/* ══════════════════════════════════
            PRIVACY POLICY
        ══════════════════════════════════ */}
        {tab === 'privacy' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-5 py-4 text-sm text-emerald-800 dark:text-emerald-300">
              <strong>التزامنا بخصوصيتك:</strong> صندوق أكناف القربى يُقدّر ثقتك ويلتزم بحماية بياناتك الشخصية وفق أفضل المعايير. نجمع فقط ما نحتاجه لإدارة عضويتك وخدمتك.
            </div>

            <Section title="١. ما البيانات التي نجمعها؟">
              <ul className="space-y-1.5 list-none">
                <Li><strong>بيانات التسجيل:</strong> الاسم الكامل، رقم الهوية الوطنية، رقم الجوال، البريد الإلكتروني، تاريخ الميلاد، الجنس، المدينة، الفرع.</Li>
                <Li><strong>وثائق الهوية:</strong> صورة الهوية من توكلنا — تُستخدم للتحقق فقط ثم تُحذف تلقائياً بعد استخراج البيانات منها.</Li>
                <Li><strong>سجل العائلة:</strong> بيانات أفراد الأسرة المرتبطين بك (أبناء، زوج/زوجة) إذا اخترت إضافتهم.</Li>
                <Li><strong>المعاملات المالية:</strong> إيصالات الدفع، مبالغ الاشتراكات، وبيانات تحويلات السداد.</Li>
                <Li><strong>بيانات الاستخدام:</strong> سجلات الدخول وتاريخ النشاط بهدف الأمان وحماية الحساب.</Li>
              </ul>
            </Section>

            <Section title="٢. كيف نستخدم بياناتك؟">
              <ul className="space-y-1.5 list-none">
                <Li>إدارة عضويتك في الصندوق والتحقق من أهليتك للانتساب.</Li>
                <Li>معالجة اشتراكاتك وإيصالات الدفع.</Li>
                <Li>إخطارك بالقرارات المتعلقة بطلباتك وأخبار العائلة.</Li>
                <Li>مراجعة طلبات الإعانة من قِبَل لجنة الصندوق المختصة.</Li>
                <Li>إعداد التقارير المالية الدورية للأعضاء.</Li>
              </ul>
            </Section>

            <Section title="٣. التحقق بالذكاء الاصطناعي">
              <p className="mb-2">
                نستخدم خدمة <strong>Anthropic Claude</strong> لقراءة بيانات هويتك من وثيقة توكلنا تلقائياً. إليك ما يحدث بالتفصيل:
              </p>
              <ul className="space-y-1.5 list-none">
                <Li>تُرسَل صورة هويتك مشفرةً عبر اتصال آمن (HTTPS) إلى خوادم Anthropic.</Li>
                <Li>تستخرج الخوارزمية البيانات (الاسم، الرقم، التاريخ) وتُعيدها إلينا.</Li>
                <Li><strong>صورة هويتك لا تُخزَّن على خوادم الصندوق</strong> بعد اكتمال عملية القراءة.</Li>
                <Li>نحتفظ فقط بالبيانات المُستخرجة (النص) وهي مُشفَّرة في قاعدة البيانات.</Li>
                <Li>تلتزم Anthropic بسياسة خصوصية صارمة ولا تستخدم بياناتك لتدريب نماذجها.</Li>
              </ul>
            </Section>

            <Section title="٤. مشاركة البيانات مع الغير">
              <ul className="space-y-1.5 list-none">
                <Li><strong>لا نبيع ولا نؤجر بياناتك لأي جهة.</strong></Li>
                <Li>نشارك فقط ما يلزم مع أعضاء لجنة الصندوق المخوّلين لمراجعة الطلبات.</Li>
                <Li>قد نُفصح عن بياناتك استجابةً لأمر قضائي أو إلزام نظامي.</Li>
                <Li>نستخدم خدمات بنية تحتية موثوقة (قواعد بيانات سحابية) تلتزم بمعايير الأمان الدولية.</Li>
              </ul>
            </Section>

            <Section title="٥. حفظ البيانات وأمانها">
              <ul className="space-y-1.5 list-none">
                <Li>تُحفظ بياناتك في قاعدة بيانات مشفّرة ومحمية بكلمة مرور.</Li>
                <Li>جميع الاتصالات بين جهازك وخوادمنا مشفّرة بـ TLS/HTTPS.</Li>
                <Li>نحتفظ ببياناتك طوال مدة عضويتك. عند إلغاء العضوية يمكنك طلب حذف بياناتك.</Li>
                <Li>كلمات المرور لا تُخزَّن بشكلها الصريح — نستخدم خوارزمية تشفير bcrypt.</Li>
              </ul>
            </Section>

            <Section title="٦. حقوقك">
              <ul className="space-y-1.5 list-none">
                <Li><strong>الوصول:</strong> يحق لك الاطلاع على جميع بياناتك المحفوظة في أي وقت من ملفك الشخصي.</Li>
                <Li><strong>التصحيح:</strong> يمكنك تعديل بياناتك الشخصية مباشرة من الملف الشخصي.</Li>
                <Li><strong>الحذف:</strong> يمكنك طلب حذف حسابك وكل بياناتك بالتواصل مع إدارة الصندوق.</Li>
                <Li><strong>الاعتراض:</strong> يحق لك الاعتراض على أي معالجة لبياناتك لا ترتبط بإدارة عضويتك.</Li>
              </ul>
            </Section>

            <Section title="٧. التواصل وشكاوى الخصوصية">
              <p>لأي استفسار أو شكوى تتعلق بخصوصية بياناتك، تواصل مع إدارة الصندوق عبر القنوات الرسمية المُدرجة في صفحة التواصل، أو عبر البريد الإلكتروني للصندوق المذكور في الإعدادات.</p>
            </Section>
          </div>
        )}

        {/* ══════════════════════════════════
            TERMS & CONDITIONS
        ══════════════════════════════════ */}
        {tab === 'terms' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-5 py-4 text-sm text-blue-800 dark:text-blue-300">
              بالتسجيل في صندوق أكناف القربى فإنك توافق على هذه الشروط والأحكام. يُرجى قراءتها بعناية قبل الانضمام.
            </div>

            <Section title="١. تعريف الصندوق">
              <p>
                صندوق أكناف القربى هو صندوق عائلي خيري تعاوني يخدم أبناء عائلة البادي، يهدف إلى تعزيز الترابط الأسري وتقديم الدعم المالي والاجتماعي لأبناء العائلة في المناسبات والأوقات الصعبة.
              </p>
            </Section>

            <Section title="٢. شروط العضوية">
              <ul className="space-y-1.5 list-none">
                <Li>يُشترط في العضو أن يكون من أبناء عائلة البادي أو مرتبطاً بها بصلة قرابة مباشرة.</Li>
                <Li>يجب تقديم بيانات صحيحة وكاملة عند التسجيل — البيانات المزوّرة تستوجب إلغاء العضوية فوراً.</Li>
                <Li>يُقبَل طلب العضوية بعد مراجعة لجنة الصندوق أو التحقق التلقائي من الهوية.</Li>
                <Li>العضوية شخصية وغير قابلة للتحويل.</Li>
                <Li>لا يحق للعضو الواحد تسجيل أكثر من حساب.</Li>
              </ul>
            </Section>

            <Section title="٣. التزامات العضو">
              <ul className="space-y-1.5 list-none">
                <Li>سداد الاشتراكات السنوية في مواعيدها المحددة من قِبَل لجنة الصندوق.</Li>
                <Li>الإبلاغ الفوري عن أي تغيير في البيانات الشخصية (الجوال، البريد، عنوان السكن).</Li>
                <Li>الحفاظ على سرية بيانات الحساب وعدم مشاركتها مع أي طرف آخر.</Li>
                <Li>الالتزام بآداب التعامل واحترام قرارات لجنة الصندوق.</Li>
                <Li>عدم استخدام المنصة لأغراض تجارية أو غير مشروعة.</Li>
              </ul>
            </Section>

            <Section title="٤. طلبات الإعانة والدعم">
              <ul className="space-y-1.5 list-none">
                <Li>يحق للعضو النشط (المسدِّد لاشتراكاته) تقديم طلب إعانة وفق معايير الصندوق.</Li>
                <Li>تخضع جميع طلبات الإعانة للمراجعة والموافقة من لجنة الصندوق المختصة.</Li>
                <Li>قرار اللجنة نهائي وتلتزم بمعايير العدالة والشفافية في اتخاذه.</Li>
                <Li>يُمنع تقديم معلومات مضللة في طلبات الإعانة ويعرّض صاحبها للمساءلة وإلغاء العضوية.</Li>
                <Li>تُعالَج طلبات الإعانة بسرية تامة ولا تُشارَك تفاصيلها مع غير المعنيين.</Li>
              </ul>
            </Section>

            <Section title="٥. الاشتراكات والمدفوعات">
              <ul className="space-y-1.5 list-none">
                <Li>تُحدَّد قيمة الاشتراك ومواعيده من قِبَل لجنة الصندوق ويُعلَن عنها للأعضاء.</Li>
                <Li>الاشتراكات المسدَّدة غير قابلة للاسترداد إلا في الحالات الاستثنائية التي تقدّرها اللجنة.</Li>
                <Li>يُوقَف حق العضو في خدمات الصندوق في حال التأخر عن السداد لمدة تتجاوز ستة أشهر.</Li>
                <Li>جميع المعاملات المالية توثَّق وتُتاح للأعضاء في تقارير الشفافية الدورية.</Li>
              </ul>
            </Section>

            <Section title="٦. إنهاء العضوية وتعليقها">
              <ul className="space-y-1.5 list-none">
                <Li>يحق للعضو إلغاء عضويته بإخطار إدارة الصندوق كتابياً.</Li>
                <Li>يحق للصندوق تعليق عضوية أو إلغاؤها في حالات: تقديم بيانات مزوّرة، التأخر المتكرر في السداد، الإخلال بالتزامات العضوية.</Li>
                <Li>في حالة وفاة العضو، تُبلَّغ الأسرة بإجراءات الاستفادة من مزايا الصندوق المستحقة.</Li>
              </ul>
            </Section>

            <Section title="٧. المسؤولية والتعويض">
              <ul className="space-y-1.5 list-none">
                <Li>الصندوق جمعية عائلية تطوعية وليس مؤسسة مالية مرخّصة — لا تسري عليه أنظمة المصارف أو شركات التأمين.</Li>
                <Li>لا يتحمل الصندوق المسؤولية عن أي أضرار ناتجة عن استخدام المنصة خارج نطاق الخدمات المذكورة.</Li>
                <Li>يلتزم كل عضو بعدم إساءة استخدام المنصة أو إلحاق الضرر بالأعضاء الآخرين.</Li>
              </ul>
            </Section>

            <Section title="٨. تعديل الشروط">
              <p>
                يحق للجنة الصندوق تعديل هذه الشروط والأحكام في أي وقت. تُبلَّغ التعديلات لجميع الأعضاء عبر نظام الإشعارات قبل سريانها بما لا يقل عن أسبوع. استمرارك في استخدام الخدمة بعد إشعار التعديل يُعدّ قبولاً ضمنياً للشروط الجديدة.
              </p>
            </Section>

            <Section title="٩. القانون المنطبق">
              <p>
                تخضع هذه الشروط لأحكام نظام الجمعيات والمؤسسات الأهلية في المملكة العربية السعودية، وتختص المحاكم السعودية بالنظر في أي نزاع ينشأ عنها.
              </p>
            </Section>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-brand-100 dark:border-brand-800 text-center text-xs text-brand-400 dark:text-brand-500 space-y-2">
          <p>© {new Date().getFullYear()} صندوق أكناف القربى — عائلة البادي</p>
          <p>
            <Link href="/" className="hover:underline ml-4">الصفحة الرئيسية</Link>
            <Link href="/register" className="hover:underline ml-4">التسجيل</Link>
            <Link href="/login" className="hover:underline">تسجيل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
