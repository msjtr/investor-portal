"use client";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
        
        {/* الترحيب والشعار */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            بوابة المستثمرين
          </h1>
          <p className="text-sm text-slate-500">
            سجل دخولك لمتابعة محفظتك الاستثمارية
          </p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          
          {/* حقل البريد الإلكتروني */}
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              البريد الإلكتروني
            </label>
            <input
              type="email"
              id="email"
              placeholder="name@example.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
              dir="ltr"
            />
          </div>

          {/* حقل كلمة المرور */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-slate-700"
              >
                كلمة المرور
              </label>
              <a href="#" className="text-xs font-medium text-blue-600 hover:underline">
                نسيت كلمة المرور؟
              </a>
            </div>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
              dir="ltr"
            />
          </div>

          {/* تذكرني */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="remember-me" className="mr-2 block text-sm text-slate-600">
              تذكرني في المرات القادمة
            </label>
          </div>

          {/* زر الدخول */}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors duration-200"
          >
            تسجيل الدخول
          </button>

        </form>

        {/* المساعدة */}
        <div className="mt-6 border-t border-slate-100 pt-6 text-center text-xs text-slate-500">
          هل تواجه مشكلة في تسجيل الدخول؟{' '}
          <a href="#" className="font-medium text-blue-600 hover:underline">
            تواصل مع الدعم الفني
          </a>
        </div>

      </div>
    </main>
  );
}
