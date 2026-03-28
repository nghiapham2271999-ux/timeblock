'use client'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') router.push('/dashboard')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f7]">
        <div className="text-[#7c82a0] text-sm">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f7]">
      <div className="bg-white rounded-2xl shadow-sm border border-[#e4e7ef] p-10 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="w-14 h-14 bg-[#3b5bdb] rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">
          ⏱
        </div>
        <h1 className="text-xl font-semibold text-[#1a1d2e] mb-1">Time Block</h1>
        <p className="text-sm text-[#7c82a0] mb-8">Quản lý công việc theo khối thời gian</p>

        <button
          onClick={() => signIn('google')}
          className="w-full flex items-center justify-center gap-3 bg-white border border-[#e4e7ef] rounded-xl px-4 py-3 text-sm font-medium text-[#1a1d2e] hover:bg-[#f7f8fc] transition-colors"
        >
          {/* Google icon */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
          </svg>
          Đăng nhập với Google
        </button>

        <p className="text-xs text-[#7c82a0] mt-6">
          Dữ liệu được lưu riêng cho từng tài khoản
        </p>
      </div>
    </div>
  )
}
